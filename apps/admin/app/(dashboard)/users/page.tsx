'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Empty,
  Input,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { formatDate, formatPhone } from '@/lib/format';
import { PAGINATION } from '@karaman/utils';

export default function UsersPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGINATION.adminTableLimit);
      if (search) {
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['user-detail', detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', detailId).single(),
        supabase
          .from('orders')
          .select('id, order_number, total_amount, status, created_at')
          .eq('user_id', detailId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      return { profile: profileRes.data, orders: ordersRes.data ?? [] };
    },
    enabled: !!detailId,
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = await supabase.rpc('admin_set_user_banned', {
        target_user_id: userId,
        banned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kullanıcı durumu güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => toast.error(`Banlama başarısız: ${e.message}`),
  });

  return (
    <div>
      <PageHeader title="Kullanıcılar" description="Karaman.com mobil kullanıcıları." />

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="İsim, e-posta veya telefon ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Kullanıcı bulunamadı" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ad Soyad</TH>
                  <TH>E-posta</TH>
                  <TH>Telefon</TH>
                  <TH>Kayıt</TH>
                  <TH>Bildirim</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium">{u.full_name}</TD>
                    <TD className="text-gray-600">{u.email}</TD>
                    <TD className="text-gray-600">{u.phone ? formatPhone(u.phone) : '—'}</TD>
                    <TD className="text-gray-500">{formatDate(u.created_at)}</TD>
                    <TD>
                      <Badge tone={u.notification_enabled ? 'success' : 'neutral'}>
                        {u.notification_enabled ? 'Açık' : 'Kapalı'}
                      </Badge>
                    </TD>
                    <TD>
                      <Button size="sm" variant="outline" onClick={() => setDetailId(u.id)}>
                        Detay
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title="Kullanıcı Detayı"
        size="xl"
      >
        {detailQuery.data?.profile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Ad Soyad</p>
                <p className="font-medium">{detailQuery.data.profile.full_name}</p>
              </div>
              <div>
                <p className="text-gray-500">E-posta</p>
                <p>{detailQuery.data.profile.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Telefon</p>
                <p>
                  {detailQuery.data.profile.phone
                    ? formatPhone(detailQuery.data.profile.phone)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Kayıt Tarihi</p>
                <p>{formatDate(detailQuery.data.profile.created_at)}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Son Siparişler ({detailQuery.data.orders.length})
              </h3>
              {detailQuery.data.orders.length === 0 ? (
                <p className="text-sm text-gray-500">Bu kullanıcı henüz sipariş vermemiş.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Sipariş No</TH>
                      <TH>Tarih</TH>
                      <TH>Durum</TH>
                      <TH className="text-right">Tutar</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {detailQuery.data.orders.map((o) => (
                      <TR key={o.id}>
                        <TD className="font-mono">{o.order_number}</TD>
                        <TD>{formatDate(o.created_at)}</TD>
                        <TD>
                          <Badge tone="info">{o.status}</Badge>
                        </TD>
                        <TD className="text-right">
                          {Number(o.total_amount).toLocaleString('tr-TR')} ₺
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Bu kullanıcı banlansın mı?')) {
                    banMutation.mutate({ userId: detailQuery.data!.profile.id, banned: true });
                  }
                }}
              >
                Hesabı Banla
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Yükleniyor…</p>
        )}
      </Dialog>
    </div>
  );
}
