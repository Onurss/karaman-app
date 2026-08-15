'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseBrowser } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import { PAGINATION } from '@karaman/utils';
import { Badge, Card, CardContent, Empty, Table, TBody, TD, TH, THead, TR } from '@/components/ui';

type Segment = 'all' | 'food_customers';

interface PushNotificationRow {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
  target_segment: Record<string, unknown>;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  delivered_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

export default function PushPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['push-history'],
    queryFn: async () => {
      const supabase = getSupabaseBrowser() as any;
      const { data, error } = await supabase
        .from('push_notifications')
        .select(
          'id, title, body, deep_link, target_segment, status, delivered_count, failed_count, sent_at, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(PAGINATION.pushHistoryLimit);
      if (error) throw error;
      return (data ?? []) as PushNotificationRow[];
    },
    refetchInterval: 30_000,
  });

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    try {
      const supabase = getSupabaseBrowser() as any;
      const { data, error } = await supabase
        .from('push_notifications')
        .insert({
          title,
          body,
          deep_link: deepLink || null,
          target_segment: segment === 'food_customers' ? { food_customers: true } : { all: true },
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.functions.invoke('send-push', {
        body: { notification_id: data.id },
      });
      toast.success('Push gönderildi.');
      setTitle('');
      setBody('');
      setDeepLink('');
      queryClient.invalidateQueries({ queryKey: ['push-history'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Push gönderilemedi.';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }

  const statusTone: Record<
    PushNotificationRow['status'],
    'warning' | 'info' | 'success' | 'danger'
  > = {
    pending: 'warning',
    sending: 'info',
    sent: 'success',
    failed: 'danger',
  };
  const statusLabel: Record<PushNotificationRow['status'], string> = {
    pending: 'Beklemede',
    sending: 'Gönderiliyor',
    sent: 'Gönderildi',
    failed: 'Hata',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Push Bildirim</h1>
        <p className="text-sm text-slate-500">Kullanıcılara anlık bildirim gönder</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSend} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Başlık (max 50)</label>
            <input
              className="input"
              maxLength={50}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mesaj (max 200)</label>
            <textarea
              className="input min-h-[100px]"
              maxLength={200}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Deep Link (opsiyonel)</label>
            <input
              className="input"
              placeholder="karaman://news/1234"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hedef Kitle</label>
            <select
              className="input"
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
            >
              <option value="all">Tüm kullanıcılar</option>
              <option value="food_customers">Yemek müşterileri</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isSending}>
            {isSending ? 'Gönderiliyor…' : 'Şimdi Gönder'}
          </button>
        </form>
        <div className="card">
          <h3 className="mb-3 font-semibold">Önizleme</h3>
          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">Karaman.com</p>
            <p className="mt-1 font-semibold">{title || 'Başlık'}</p>
            <p className="mt-1 text-sm text-slate-700">{body || 'Mesaj içeriği'}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Gönderim Geçmişi</h2>
        <p className="mb-2 text-xs text-slate-500">
          Son 100 push bildirimi. Her 30 saniyede bir tazelenir.
        </p>
        <Card>
          <CardContent className="p-0">
            {historyQuery.isLoading ? (
              <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <Empty title="Gönderim geçmişi boş" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Tarih</TH>
                    <TH>Başlık</TH>
                    <TH>Hedef</TH>
                    <TH>Durum</TH>
                    <TH className="text-right">Teslim</TH>
                    <TH className="text-right">Hata</TH>
                  </TR>
                </THead>
                <TBody>
                  {historyQuery.data.map((p) => {
                    const segments = Object.keys(p.target_segment ?? {});
                    const targetLabel = segments.includes('all')
                      ? 'Tüm kullanıcılar'
                      : segments.includes('food_customers')
                        ? 'Yemek müşterileri'
                        : segments.join(', ') || '—';
                    return (
                      <TR key={p.id}>
                        <TD className="whitespace-nowrap text-xs text-gray-500">
                          {formatDateTime(p.sent_at ?? p.created_at)}
                        </TD>
                        <TD className="font-medium">
                          {p.title}
                          {p.deep_link ? (
                            <span className="ml-2 text-xs text-gray-400">{p.deep_link}</span>
                          ) : null}
                        </TD>
                        <TD className="text-xs text-gray-500">{targetLabel}</TD>
                        <TD>
                          <Badge tone={statusTone[p.status] ?? 'neutral'}>
                            {statusLabel[p.status] ?? p.status}
                          </Badge>
                        </TD>
                        <TD className="text-right">{p.delivered_count}</TD>
                        <TD className="text-right text-red-500">{p.failed_count}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
