import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

function syntheticEmail(karamanId: number): string {
  return `karaman-${karamanId}@users.karaman.app`;
}

interface KaramanMe {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

async function verifyKaramanToken(token: string): Promise<KaramanMe | null> {
  const base = Deno.env.get('KARAMAN_API_URL');
  const apiKey = Deno.env.get('KARAMAN_API_KEY');
  if (!base || !apiKey) {
    throw new Error('KARAMAN_API_URL ve KARAMAN_API_KEY tanımlı olmalı.');
  }
  const res = await fetch(`${base}/auth/me`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const user = body?.data ?? body?.user ?? null;
  if (!user || typeof user.id !== 'number') return null;
  return user as KaramanMe;
}

async function ensureAuthUser(
  service: ReturnType<typeof getServiceClient>,
  me: KaramanMe,
): Promise<{ userId: string; email: string }> {
  const email = syntheticEmail(me.id);

  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .eq('karaman_user_id', me.id)
    .maybeSingle();

  if (existing?.id) {
    // Mevcut profil: karaman'dan gelen kimlik bilgilerini HER GİRİŞTE tazele
    // (kullanıcı tercihleri notification_enabled/language korunur).
    await service
      .from('profiles')
      .update({
        full_name: me.name,
        email: me.email ?? email,
        phone: me.phone ?? null,
      })
      .eq('id', existing.id);
    return { userId: existing.id as string, email };
  }

  let userId: string | null = null;
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: me.name, karaman_user_id: me.id },
  });
  if (!createErr && created?.user) {
    userId = created.user.id;
  } else {
    const { data: link, error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr || !link?.user) {
      throw new Error(createErr?.message ?? 'Köprü kullanıcısı oluşturulamadı.');
    }
    userId = link.user.id;
  }

  const { error: profErr } = await service.from('profiles').upsert(
    {
      id: userId,
      karaman_user_id: me.id,
      full_name: me.name,
      email: me.email ?? email,
      phone: me.phone ?? null,
      notification_enabled: true,
      language: 'tr',
    },
    { onConflict: 'id' },
  );
  if (profErr) {
    throw new Error(`Profil eşlemesi yazılamadı: ${profErr.message}`);
  }

  return { userId, email };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST kabul edilir.');
  }

  let karamanToken: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    karamanToken = body?.karaman_token ?? req.headers.get('X-Karaman-Token') ?? null;
  } catch {
    karamanToken = req.headers.get('X-Karaman-Token');
  }
  if (!karamanToken) {
    return errorResponse(401, 'UNAUTHORIZED', 'karaman_token gerekli.');
  }

  let me: KaramanMe | null;
  try {
    me = await verifyKaramanToken(karamanToken);
  } catch (e) {
    return errorResponse(500, 'BRIDGE_CONFIG', (e as Error).message);
  }
  if (!me) {
    return errorResponse(401, 'INVALID_TOKEN', 'karaman oturumu doğrulanamadı.');
  }

  const service = getServiceClient();

  let userId: string;
  let email: string;
  try {
    const ensured = await ensureAuthUser(service, me);
    userId = ensured.userId;
    email = ensured.email;
  } catch (e) {
    return errorResponse(500, 'BRIDGE_USER', (e as Error).message);
  }

  const oneTimePassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { error: pwErr } = await service.auth.admin.updateUserById(userId, {
    password: oneTimePassword,
    email_confirm: true,
  });
  if (pwErr) {
    return errorResponse(500, 'BRIDGE_PASSWORD', pwErr.message);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password: oneTimePassword,
  });
  if (signErr || !signIn?.session) {
    return errorResponse(500, 'BRIDGE_SIGNIN', signErr?.message ?? 'Session üretilemedi.');
  }

  return jsonResponse({
    status: 'success',
    data: {
      user_id: userId,
      karaman_user_id: me.id,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      expires_at: signIn.session.expires_at,
    },
  });
});
