import { serve } from 'std/http/server.ts';
import { z } from 'zod';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';
import { initIyzicoThreeDs, initGarantiThreeDs } from '../_shared/payments.ts';
import { VAT_RATES, SYSTEM_DEFAULTS } from '../_shared/config.ts';

const createOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.number().int().positive().max(99),
        variants: z.array(z.any()).optional(),
        note: z.string().max(280).optional(),
      }),
    )
    .min(1),
  delivery_address_id: z.string().uuid(),
  payment_method: z.enum(['iyzico', 'garanti_pos', 'cash_on_delivery', 'card_on_delivery']),
  customer_note: z.string().max(280).optional(),
  iyzico_payment: z
    .object({
      card_holder_name: z.string(),
      card_number: z.string(),
      expire_month: z.string(),
      expire_year: z.string(),
      cvc: z.string(),
    })
    .optional(),
  garanti_payment: z
    .object({
      card_number: z.string(),
      expire_month: z.string(),
      expire_year: z.string(),
      cvv: z.string(),
    })
    .optional(),
});

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST kabul edilir.');
  }

  let payload: z.infer<typeof createOrderSchema>;
  try {
    payload = createOrderSchema.parse(await req.json());
  } catch (e) {
    return errorResponse(422, 'VALIDATION', (e as Error).message);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse(401, 'UNAUTHORIZED', 'Oturum bilgisi yok.');
  }

  const userClient = getUserClient(authHeader);
  const service = getServiceClient();

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Kullanıcı doğrulanamadı.');
  }
  const userId = userData.user.id;

  const { data: restaurant, error: rErr } = await service
    .from('restaurants')
    .select('*')
    .eq('id', payload.restaurant_id)
    .eq('is_active', true)
    .single();
  if (rErr || !restaurant) {
    return errorResponse(404, 'RESTAURANT_NOT_FOUND', 'Restoran bulunamadı.');
  }
  const { data: isOpenNow } = await service.rpc('restaurant_is_open_now', {
    restaurant_id: payload.restaurant_id,
  });
  if (isOpenNow === false) {
    return errorResponse(422, 'RESTAURANT_CLOSED', 'Bu restoran şu anda kapalı.');
  }

  const { data: address, error: aErr } = await service
    .from('user_addresses_view')
    .select('id, title, full_address, district, building_no, apartment_no, floor, note, location')
    .eq('id', payload.delivery_address_id)
    .eq('user_id', userId)
    .single();
  if (aErr || !address) {
    return errorResponse(404, 'ADDRESS_NOT_FOUND', 'Teslimat adresi bulunamadı.');
  }
  const addressLoc = (address as { location: { lat: number; lng: number } }).location;
  const addressLat = addressLoc.lat;
  const addressLng = addressLoc.lng;

  const { data: inZone, error: zErr } = await service.rpc('address_in_delivery_zone', {
    p_restaurant_id: payload.restaurant_id,
    p_lat: addressLat,
    p_lng: addressLng,
  });
  if (zErr) {
    console.warn('[create-order] delivery zone RPC error', zErr.message);
  }
  if (inZone === false) {
    return errorResponse(422, 'OUT_OF_DELIVERY_ZONE', 'Bu adres teslimat bölgemiz dışında.');
  }

  const itemIds = payload.items.map(i => i.menu_item_id);
  const { data: menuItems, error: mErr } = await service
    .from('menu_items')
    .select('id, name, price, image_url, is_available, variants')
    .in('id', itemIds)
    .eq('restaurant_id', payload.restaurant_id);
  if (mErr || !menuItems) {
    return errorResponse(500, 'MENU_FETCH', 'Menü alınamadı.');
  }
  if (menuItems.some(m => !m.is_available)) {
    return errorResponse(422, 'ITEM_UNAVAILABLE', 'Sepetteki bir ürün stokta yok.');
  }

  // Seçilen ekstraların (varyant) fiyat farkını MENÜDEKİ otoritatif değerden
  // hesapla — istemcinin gönderdiği price_delta'ya GÜVENME (manipülasyona kapalı).
  type VariantOption = { id: string; price_delta?: number };
  type VariantGroup = { id: string; options?: VariantOption[] };
  type SelectedVariant = { group_id?: string; option_id?: string };
  const extrasPerUnit = (
    item: { variants?: unknown },
    selected: SelectedVariant[],
  ): number => {
    const groups = (item.variants ?? []) as VariantGroup[];
    let sum = 0;
    for (const sel of selected) {
      const group = groups.find(g => g.id === sel.group_id);
      const opt = group?.options?.find(o => o.id === sel.option_id);
      if (opt) sum += Number(opt.price_delta) || 0;
    }
    return sum;
  };

  let subtotal = 0;
  const orderItemsToInsert = payload.items.map(line => {
    const item = menuItems.find(m => m.id === line.menu_item_id);
    if (!item) throw new Error('Ürün eşleşmedi');
    const selectedVariants = (line.variants ?? []) as SelectedVariant[];
    const unitPrice = Number(item.price) + extrasPerUnit(item, selectedVariants);
    const totalPrice = unitPrice * line.quantity;
    subtotal += totalPrice;
    return {
      menu_item_id: line.menu_item_id,
      item_name_snapshot: item.name,
      item_image_snapshot: item.image_url,
      item_price_snapshot: item.price,
      quantity: line.quantity,
      variants: line.variants ?? [],
      note: line.note ?? null,
      total_price: totalPrice,
    };
  });

  if (subtotal < Number(restaurant.min_order_amount)) {
    return errorResponse(422, 'MIN_ORDER', `Minimum sipariş tutarı ${restaurant.min_order_amount}₺`);
  }

  const deliveryFee = Number(restaurant.delivery_fee);
  const vatAmount = +(subtotal * VAT_RATES.food).toFixed(2);
  const totalAmount = +(subtotal + deliveryFee).toFixed(2);
  const commissionAmount = +(subtotal * (Number(restaurant.commission_rate) / 100)).toFixed(2);

  const initialStatus =
    payload.payment_method === 'cash_on_delivery' || payload.payment_method === 'card_on_delivery'
      ? 'confirmed'
      : 'pending';

  const { data: orderRows, error: oErr } = await service.rpc('create_order_atomic', {
    p_user_id: userId,
    p_restaurant_id: payload.restaurant_id,
    p_delivery_address_id: payload.delivery_address_id,
    p_delivery_address_snapshot: {
      title: address.title,
      full_address: address.full_address,
      district: address.district,
      building_no: address.building_no,
      apartment_no: address.apartment_no,
      floor: address.floor,
      note: address.note,
    },
    p_delivery_location_wkt: `SRID=4326;POINT(${addressLng} ${addressLat})`,
    p_status: initialStatus,
    p_payment_method: payload.payment_method,
    p_subtotal: subtotal,
    p_delivery_fee: deliveryFee,
    p_commission_amount: commissionAmount,
    p_vat_amount: vatAmount,
    p_total_amount: totalAmount,
    p_customer_note: payload.customer_note ?? null,
    p_items: orderItemsToInsert,
    p_commission_rate: restaurant.commission_rate,
  });

  if (oErr || !orderRows || orderRows.length === 0) {
    return errorResponse(500, 'ORDER_CREATE', oErr?.message ?? 'Sipariş oluşturulamadı.');
  }

  const order = orderRows[0] as { order_id: string; order_number: string };

  let paymentHtml: string | null = null;
  let paymentForm: { action: string; fields: Record<string, string> } | null = null;

  try {
    if (payload.payment_method === 'iyzico' && payload.iyzico_payment) {
      const { data: profile } = await service
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', userId)
        .single();

      const [firstName, ...rest] = (profile?.full_name ?? 'Müşteri Adı').split(' ');
      const lastName = rest.join(' ') || 'Soyadı';

      const init = await initIyzicoThreeDs({
        conversationId: order.order_id,
        price: totalAmount,
        paidPrice: totalAmount,
        buyer: {
          id: userId,
          name: firstName,
          surname: lastName,
          email: profile?.email ?? userData.user.email ?? 'noreply@karaman.com',
          gsmNumber: profile?.phone ?? '+905000000000',
          identityNumber: SYSTEM_DEFAULTS.iyzicoFallbackIdentity,
          address: address.full_address ?? 'Karaman',
          city: address.district ?? 'Karaman',
        },
        basketItems: orderItemsToInsert.map(i => ({
          id: i.menu_item_id,
          name: i.item_name_snapshot,
          price: Number(i.total_price),
        })),
        card: {
          holderName: payload.iyzico_payment.card_holder_name,
          number: payload.iyzico_payment.card_number,
          expireMonth: payload.iyzico_payment.expire_month,
          expireYear: payload.iyzico_payment.expire_year,
          cvc: payload.iyzico_payment.cvc,
        },
      });
      paymentHtml = init.htmlContent;
    } else if (payload.payment_method === 'garanti_pos' && payload.garanti_payment) {
      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      const init = await initGarantiThreeDs({
        orderId: order.order_id,
        amount: totalAmount,
        email: profile?.email ?? userData.user.email ?? 'noreply@karaman.com',
        cardNumber: payload.garanti_payment.card_number,
        expireMonth: payload.garanti_payment.expire_month,
        expireYear: payload.garanti_payment.expire_year,
        cvv: payload.garanti_payment.cvv,
      });
      paymentForm = { action: init.formAction, fields: init.fields };
    }
  } catch (paymentErr) {
    await service
      .from('orders')
      .update({ status: 'cancelled', cancellation_reason: 'Ödeme başlatılamadı.' })
      .eq('id', order.order_id);
    await service
      .from('commissions')
      .update({ status: 'cancelled' })
      .eq('order_id', order.order_id);
    return errorResponse(502, 'PAYMENT_INIT', (paymentErr as Error).message);
  }

  return jsonResponse({
    status: 'success',
    data: {
      order_id: order.order_id,
      order_number: order.order_number,
      total_amount: totalAmount,
      payment_method: payload.payment_method,
      payment_html: paymentHtml,
      payment_form: paymentForm,
    },
  });
});
