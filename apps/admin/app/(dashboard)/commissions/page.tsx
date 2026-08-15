'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  PageHeader,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { PAGINATION } from '@karaman/utils';

export default function CommissionsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'paid' | ''>('pending');

  const restaurantsQuery = useQuery({
    queryKey: ['restaurants-list'],
    queryFn: async () => {
      const { data } = await supabase.from('restaurants').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['commissions', restaurantId, status],
    queryFn: async () => {
      let q = supabase
        .from('commissions')
        .select('*, restaurants(name), orders(order_number, created_at)')
        .order('created_at', { ascending: false })
        .limit(PAGINATION.commissionsAdminLimit);
      if (restaurantId) q = q.eq('restaurant_id', restaurantId);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const totals = useMemo(() => {
    if (!data) return { count: 0, sum: 0, paidSum: 0, pendingSum: 0 };
    return data.reduce(
      (acc, c) => {
        const amount = Number(c.commission_amount);
        acc.count += 1;
        acc.sum += amount;
        if (c.status === 'paid') acc.paidSum += amount;
        if (c.status === 'pending') acc.pendingSum += amount;
        return acc;
      },
      { count: 0, sum: 0, paidSum: 0, pendingSum: 0 },
    );
  }, [data]);

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commissions')
        .update({ status: 'paid', payout_date: new Date().toISOString().slice(0, 10) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Komisyon ödendi olarak işaretlendi.');
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  return (
    <div>
      <PageHeader title="Komisyon & Abonelik" description="Restoran komisyon raporu ve ödeme takibi." />

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Komisyon</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals.sum)}</p>
            <p className="text-xs text-gray-500">{totals.count} kayıt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Ödenmemiş</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{formatCurrency(totals.pendingSum)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Ödenmiş</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(totals.paidSum)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select label="Restoran" value={restaurantId} onChange={e => setRestaurantId(e.target.value)}>
              <option value="">Tüm restoranlar</option>
              {(restaurantsQuery.data ?? []).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Select label="Durum" value={status} onChange={e => setStatus(e.target.value as 'pending' | 'paid' | '')}>
              <option value="">Tümü</option>
              <option value="pending">Bekleyen</option>
              <option value="paid">Ödenen</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Komisyon kaydı yok" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Restoran</TH>
                  <TH>Sipariş</TH>
                  <TH>Tarih</TH>
                  <TH className="text-right">Sipariş Tutarı</TH>
                  <TH className="text-right">Komisyon %</TH>
                  <TH className="text-right">Komisyon Tutarı</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map(c => (
                  <TR key={c.id}>
                    <TD className="font-medium">

                      {c.restaurants?.name ?? '—'}
                    </TD>
                    <TD className="font-mono text-xs">

                      {c.orders?.order_number ?? '—'}
                    </TD>
                    <TD className="text-gray-500">{formatDate(c.created_at)}</TD>
                    <TD className="text-right">{formatCurrency(c.order_total)}</TD>
                    <TD className="text-right">%{c.commission_rate}</TD>
                    <TD className="text-right font-medium">{formatCurrency(c.commission_amount)}</TD>
                    <TD>
                      <Badge tone={c.status === 'paid' ? 'success' : c.status === 'cancelled' ? 'neutral' : 'warning'}>
                        {c.status === 'paid' ? 'Ödendi' : c.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                      </Badge>
                    </TD>
                    <TD>
                      {c.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => markPaidMutation.mutate(c.id)}
                        >
                          <Check className="h-4 w-4" /> Ödendi
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
