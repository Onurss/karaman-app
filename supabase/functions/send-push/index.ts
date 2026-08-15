import { serve } from 'std/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserClient } from '../_shared/supabase.ts';

interface SendPushRequest {
  notification_id: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Yalnızca POST.');
  }

  const authHeader = req.headers.get('Authorization');
  const bearer = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const isService = serviceKey.length > 0 && bearer === serviceKey;
  if (!isService) {
    const userClient = getUserClient(authHeader);
    const { data: caller } = await userClient.auth.getUser();
    const role = (caller?.user?.app_metadata as { role?: string } | null)?.role;
    if (role !== 'admin') {
      return errorResponse(403, 'FORBIDDEN', 'Bu işlem yalnızca admin tarafından yapılabilir.');
    }
  }

  const { notification_id } = (await req.json()) as SendPushRequest;
  if (!notification_id) {
    return errorResponse(400, 'BAD_REQUEST', 'notification_id zorunlu.');
  }

  const service = getServiceClient();

  const { data: notification, error: nErr } = await service
    .from('push_notifications')
    .select('*')
    .eq('id', notification_id)
    .single();

  if (nErr || !notification) {
    return errorResponse(404, 'NOT_FOUND', 'Bildirim bulunamadı.');
  }

  const segment = notification.target_segment ?? {};
  let query = service.from('profiles').select('id, push_token').not('push_token', 'is', null);

  if (segment.user_ids?.length) {
    query = query.in('id', segment.user_ids);
  } else if (segment.food_customers) {
    const { data: orderUsers } = await service.from('orders').select('user_id');
    const uniqueIds = Array.from(new Set((orderUsers ?? []).map((o) => o.user_id)));
    if (uniqueIds.length) query = query.in('id', uniqueIds);
  }

  const { data: recipients, error: recipientsErr } = await query;
  if (recipientsErr) {
    return errorResponse(500, 'RECIPIENTS_FETCH', recipientsErr.message);
  }

  const messages: ExpoPushMessage[] = (recipients ?? [])
    .filter((p) => p.push_token)
    .map((p) => ({
      to: p.push_token!,
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: notification.deep_link ? { deep_link: notification.deep_link } : undefined,
    }));

  // Gönderim başladı — geçmişte "Gönderiliyor" görünsün.
  await service.from('push_notifications').update({ status: 'sending' }).eq('id', notification_id);

  let delivered = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (resp.ok) {
        // Expo her mesaj için bir ticket döner: { status: 'ok' | 'error' }.
        // Ticket bazında say — geçersiz/iptal edilmiş token'lar "error" gelir.
        const json = (await resp.json().catch(() => null)) as {
          data?: Array<{ status?: string }>;
        } | null;
        const tickets = json?.data ?? [];
        if (tickets.length) {
          for (const t of tickets) {
            if (t.status === 'ok') delivered += 1;
            else failed += 1;
          }
        } else {
          // Beklenmedik yanıt gövdesi ama HTTP 200 — teslim edildi varsay.
          delivered += batch.length;
        }
      } else {
        failed += batch.length;
      }
    } catch {
      failed += batch.length;
    }
  }

  // Alıcı var ama hiçbiri teslim edilemediyse "failed", aksi halde "sent".
  const finalStatus = messages.length > 0 && delivered === 0 ? 'failed' : 'sent';

  await service
    .from('push_notifications')
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      total_recipients: messages.length,
      delivered_count: delivered,
      failed_count: failed,
    })
    .eq('id', notification_id);

  return jsonResponse({
    status: 'success',
    data: {
      total_recipients: messages.length,
      delivered_count: delivered,
      failed_count: failed,
    },
  });
});
