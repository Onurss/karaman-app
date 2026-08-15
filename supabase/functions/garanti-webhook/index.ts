import { serve } from 'std/http/server.ts';
import { handleCors, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';
import { verifyGarantiCallback } from '../_shared/payments.ts';

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST.');
  }

  const formData = await req.formData();
  const form: Record<string, string> = {};
  formData.forEach((value, key) => {
    form[key] = value.toString();
  });

  // Garanti'ye tiresiz (32 hex) gönderdik; orijinal UUID'yi geri kur.
  const oid = form.oid;
  if (!oid) return errorResponse(400, 'BAD_REQUEST', 'Eksik order ID.');
  const orderId = /^[0-9a-fA-F]{32}$/.test(oid)
    ? `${oid.slice(0, 8)}-${oid.slice(8, 12)}-${oid.slice(12, 16)}-${oid.slice(16, 20)}-${oid.slice(20)}`
    : oid;

  const valid = await verifyGarantiCallback(form);
  if (!valid) {
    return errorResponse(403, 'HASH_MISMATCH', 'Hash doğrulaması başarısız.');
  }

  const service = getServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (!order) return errorResponse(404, 'NOT_FOUND', 'Sipariş bulunamadı.');

  const success = form.Response === 'Approved' && form.ProcReturnCode === '00';

  await service.from('payments').insert({
    order_id: order.id,
    provider: 'garanti_pos',
    provider_payment_id: form.AuthCode ?? form.HostRefNum,
    amount: order.total_amount,
    status: success ? 'paid' : 'failed',
    raw_response: form,
  });

  await service
    .from('orders')
    .update({
      status: success ? 'confirmed' : 'cancelled',
      payment_status: success ? 'paid' : 'failed',
      cancellation_reason: success ? null : form.ErrMsg ?? 'Ödeme başarısız',
    })
    .eq('id', order.id);

  if (success) {
    await notifyOrderConfirmed(service, order);
  }

  // 3D akışı bir WebView içinde döner. Sonucu uygulamaya deep-link ile iletiriz;
  // WebView `karaman://payment-result` isteğini yakalayıp kapanır.
  const resultUrl = `karaman://payment-result?order_id=${encodeURIComponent(order.id)}&status=${
    success ? 'success' : 'failed'
  }`;
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ödeme Sonucu</title></head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:40px;color:#111">
<p style="font-size:18px">${success ? 'Ödeme alındı, yönlendiriliyorsunuz…' : 'Ödeme başarısız, dönülüyor…'}</p>
<script>window.location.replace(${JSON.stringify(resultUrl)});</script>
<noscript><a href="${resultUrl}">Devam et</a></noscript>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

async function notifyOrderConfirmed(
  service: ReturnType<typeof getServiceClient>,
  order: { id: string; user_id: string; restaurant_id: string; order_number: string },
) {
  const { data: owners } = await service
    .from('restaurant_users')
    .select('user_id')
    .eq('restaurant_id', order.restaurant_id)
    .eq('is_active', true);

  const ownerIds = (owners ?? []).map(o => o.user_id);
  if (ownerIds.length > 0) {
    const { data: ownerProfiles } = await service
      .from('profiles')
      .select('push_token')
      .in('id', ownerIds);
    const tokens = (ownerProfiles ?? []).map(p => p.push_token).filter(Boolean) as string[];
    await sendPushBatch(tokens, {
      title: 'Yeni sipariş',
      body: `Sipariş ${order.order_number} onaylandı, hazırlığa başlayabilirsiniz.`,
      data: { type: 'order_new', order_id: order.id },
    });
  }

  const { data: userProfile } = await service
    .from('profiles')
    .select('push_token')
    .eq('id', order.user_id)
    .single();
  if (userProfile?.push_token) {
    await sendPushBatch([userProfile.push_token], {
      title: 'Siparişin onaylandı',
      body: `Sipariş ${order.order_number} hazırlanmaya başladı.`,
      data: { type: 'order_status', order_id: order.id },
    });
  }
}

async function sendPushBatch(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> },
) {
  if (tokens.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(
      tokens.map(to => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
        priority: 'high',
      })),
    ),
  });
}
