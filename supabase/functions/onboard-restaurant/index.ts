import { serve } from 'std/http/server.ts';
import { z } from 'zod';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

const PENDING_KARAMAN_USER_ID = -1;

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  description: z.string().max(2000).nullish(),
  phone: z.string().min(7).max(20),
  email: z.string().email().nullish(),
  tax_office: z.string().max(120).nullish(),
  tax_number: z.string().max(40).nullish(),
  logo_url: z.string().url().nullish(),
  cover_image_url: z.string().url().nullish(),
  address: z.string().min(3).max(300),
  district: z.string().min(1).max(80),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  cuisine_types: z.array(z.string()).default([]),
  min_order_amount: z.coerce.number().gte(0),
  delivery_fee: z.coerce.number().gte(0),
  estimated_delivery_minutes: z.coerce.number().int().gte(0),
  commission_rate: z.coerce.number().gte(0).lte(100),
  subscription_tier: z.enum(['bronze', 'silver', 'gold']).nullish(),
  accepts_cash: z.boolean().default(true),
  accepts_card_on_delivery: z.boolean().default(true),
  accepts_online_payment: z.boolean().default(true),
  working_hours: z
    .record(z.object({ open: z.string(), close: z.string() }).nullable())
    .default({}),
  owner_name: z.string().min(2).max(120),
  owner_email: z.string().email(),
  owner_password: z.string().min(8).max(72),
});

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST kabul edilir.');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse(401, 'UNAUTHORIZED', 'Oturum bilgisi yok.');

  const userClient = getUserClient(authHeader);
  const { data: caller, error: callerErr } = await userClient.auth.getUser();
  if (callerErr || !caller?.user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Kullanıcı doğrulanamadı.');
  }
  const role = (caller.user.app_metadata as { role?: string } | null)?.role;
  if (role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', 'Bu işlem yalnızca admin tarafından yapılabilir.');
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await req.json());
  } catch (e) {
    return errorResponse(422, 'VALIDATION', (e as Error).message);
  }

  const service = getServiceClient();

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: payload.owner_email,
    password: payload.owner_password,
    email_confirm: true, // admin oluşturduğu için doğrulanmış sayılır
    user_metadata: { full_name: payload.owner_name },
  });
  if (createErr || !created?.user) {
    const msg = /already|exists|registered/i.test(createErr?.message ?? '')
      ? 'Bu e-posta ile zaten bir hesap var.'
      : (createErr?.message ?? 'Sahip hesabı oluşturulamadı.');
    return errorResponse(422, 'OWNER_CREATE', msg);
  }
  const ownerUserId = created.user.id;

  const { data: restaurant, error: rErr } = await service
    .from('restaurants')
    .insert({
      name: payload.name,
      slug: payload.slug,
      description: payload.description ?? null,
      phone: payload.phone,
      email: payload.email ?? null,
      tax_office: payload.tax_office ?? null,
      tax_number: payload.tax_number ?? null,
      logo_url: payload.logo_url ?? null,
      cover_image_url: payload.cover_image_url ?? null,
      address: payload.address,
      district: payload.district,
      location: `SRID=4326;POINT(${payload.lng} ${payload.lat})`,
      delivery_zone: null,
      cuisine_types: payload.cuisine_types,
      min_order_amount: payload.min_order_amount,
      delivery_fee: payload.delivery_fee,
      estimated_delivery_minutes: payload.estimated_delivery_minutes,
      commission_rate: payload.commission_rate,
      subscription_tier: payload.subscription_tier ?? null,
      subscription_active: !!payload.subscription_tier,
      accepts_cash: payload.accepts_cash,
      accepts_card_on_delivery: payload.accepts_card_on_delivery,
      accepts_online_payment: payload.accepts_online_payment,
      working_hours: payload.working_hours,
      is_active: true,
      is_open: true,
    })
    .select()
    .single();

  if (rErr || !restaurant) {
    try {
      await service.auth.admin.deleteUser(ownerUserId);
    } catch {
      /* ignore */
    }
    const msg = /duplicate|unique/i.test(rErr?.message ?? '')
      ? 'Bu slug ile zaten bir restoran var.'
      : (rErr?.message ?? 'Restoran kaydı oluşturulamadı.');
    return errorResponse(422, 'RESTAURANT_CREATE', msg);
  }

  const { error: linkErr } = await service.from('restaurant_users').insert({
    restaurant_id: restaurant.id,
    user_id: ownerUserId,
    role: 'owner',
    is_active: true,
  });
  if (linkErr) {
    try {
      await service.from('restaurants').delete().eq('id', restaurant.id);
      await service.auth.admin.deleteUser(ownerUserId);
    } catch {
      /* ignore */
    }
    return errorResponse(500, 'LINK_CREATE', linkErr.message);
  }

  const { error: profErr } = await service.from('profiles').upsert({
    id: ownerUserId,
    karaman_user_id: PENDING_KARAMAN_USER_ID,
    full_name: payload.owner_name,
    email: payload.owner_email,
    notification_enabled: true,
    language: 'tr',
  });
  if (profErr) {
    console.warn('[onboard-restaurant] profile upsert error:', profErr.message);
  }

  return jsonResponse({
    status: 'success',
    data: {
      restaurant_id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      owner_user_id: ownerUserId,
      owner_email: payload.owner_email,
    },
  });
});
