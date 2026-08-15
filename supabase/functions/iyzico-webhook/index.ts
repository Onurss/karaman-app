import { serve } from 'std/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const IYZICO_BASE = Deno.env.get('IYZICO_BASE_URL') ?? 'https://api.iyzipay.com';
const IYZICO_KEY = Deno.env.get('IYZICO_API_KEY') ?? '';
const IYZICO_SECRET = Deno.env.get('IYZICO_SECRET_KEY') ?? '';

async function hmacSha256Base64(key: string, payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(payload),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyIyzicoPayment(conversationId: string, paymentId: string) {
  const body = JSON.stringify({
    locale: 'tr',
    conversationId,
    paymentId,
    conversationData: conversationId,
  });
  const randomString = crypto.randomUUID();
  const signature = await hmacSha256Base64(IYZICO_SECRET, randomString + body);
  const authorization = `IYZWSv2 apiKey:${IYZICO_KEY}&randomKey:${randomString}&signature:${signature}`;

  const res = await fetch(`${IYZICO_BASE}/payment/iyzipos/threeds/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-iyzi-rnd': randomString,
      Authorization: authorization,
    },
    body,
  });
  return (await res.json()) as {
    status: string;
    paymentStatus?: string;
    paymentId?: string;
    errorMessage?: string;
  };
}

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST.');
  }

  const formData = await req.formData();
  const conversationId = formData.get('conversationId')?.toString();
  const paymentId = formData.get('paymentId')?.toString();
  const mdStatus = formData.get('mdStatus')?.toString();

  if (!conversationId || !paymentId) {
    return errorResponse(400, 'BAD_REQUEST', 'Eksik parametre.');
  }

  const service = getServiceClient();

  let success = false;
  let verifyResult: Awaited<ReturnType<typeof verifyIyzicoPayment>> | null = null;
  if (mdStatus === '1') {
    try {
      verifyResult = await verifyIyzicoPayment(conversationId, paymentId);
      success =
        verifyResult.status === 'success' && verifyResult.paymentStatus === 'SUCCESS';
    } catch (e) {
      console.error('[iyzico-webhook] verify error', (e as Error).message);
    }
  }

  const { data: order } = await service
    .from('orders')
    .select('*')
    .eq('id', conversationId)
    .single();
  if (!order) return errorResponse(404, 'NOT_FOUND', 'Sipariş bulunamadı.');

  await service.from('payments').insert({
    order_id: order.id,
    provider: 'iyzico',
    provider_payment_id: paymentId,
    amount: order.total_amount,
    status: success ? 'paid' : 'failed',
    raw_response: { ...Object.fromEntries(formData.entries()), verify: verifyResult },
  });

  await service
    .from('orders')
    .update({
      status: success ? 'confirmed' : 'cancelled',
      payment_status: success ? 'paid' : 'failed',
      cancellation_reason: success ? null : verifyResult?.errorMessage ?? 'Ödeme başarısız',
    })
    .eq('id', order.id);

  if (success) {
    await notifyOrderConfirmed(service, order);
  }

  return jsonResponse({ status: 'success', data: { ok: true } });
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
      body: `Sipariş ${order.order_number} onaylandı.`,
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
