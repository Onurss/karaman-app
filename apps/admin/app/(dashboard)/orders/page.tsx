'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogFooter,
  Empty,
  Input,
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
import { formatCurrency, formatDateTime } from '@/lib/format';
import { exportToCSV } from '@/lib/hooks/use-csv-export';
import { Ban, Download, RotateCcw } from 'lucide-react';
import { PAGINATION } from '@karaman/utils';

const STATUSES = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'confirmed', label: 'Onaylandı' },
  { value: 'preparing', label: 'Hazırlanıyor' },
  { value: 'ready', label: 'Hazır' },
  { value: 'on_the_way', label: 'Yolda' },
  { value: 'delivered', label: 'Teslim Edildi' },
  { value: 'cancelled', label: 'İptal Edildi' },
] as const;

const PAYMENTS = [
  { value: '', label: 'Tüm ödeme yöntemleri' },
  { value: 'iyzico', label: 'iyzico' },
  { value: 'garanti_pos', label: 'Garanti POS' },
  { value: 'cash_on_delivery', label: 'Kapıda Nakit' },
  { value: 'card_on_delivery', label: 'Kapıda Kart' },
];

const statusTone: Record<
  string,
  'warning' | 'info' | 'primary' | 'success' | 'danger' | 'secondary'
> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'info',
  on_the_way: 'secondary',
  delivered: 'success',
  cancelled: 'danger',
};

interface CancelTarget {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  status: string;
}

interface RefundTarget {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
}

export default function OrdersPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null);
  const [reason, setReason] = useState('');
  const [refundOnCancel, setRefundOnCancel] = useState(true);

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason, refund }: { id: string; reason: string; refund: boolean }) => {
      const { error } = await supabase.rpc('admin_cancel_order', {
        p_order_id: id,
        p_reason: reason,
        p_refund: refund,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sipariş iptal edildi.');
      setCancelTarget(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('admin_refund_order', {
        p_order_id: id,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('İade işlendi.');
      setRefundTarget(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restaurantsQuery = useQuery({
    queryKey: ['restaurants-list'],
    queryFn: async () => {
      const { data } = await supabase.from('restaurants').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', status, payment, from, to, restaurantId],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select('*, restaurants(name)')
        .order('created_at', { ascending: false })
        .limit(PAGINATION.ordersAdminLimit);
      if (status) q = q.eq('status', status);
      if (payment) q = q.eq('payment_method', payment);
      if (restaurantId) q = q.eq('restaurant_id', restaurantId);
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const handleExport = () => {
    if (!data) return;
    exportToCSV(
      'siparisler',
      data.map((o) => ({
        order_number: o.order_number,
        created_at: formatDateTime(o.created_at),
        status: STATUSES.find((s) => s.value === o.status)?.label ?? o.status,
        payment_method:
          PAYMENTS.find((p) => p.value === o.payment_method)?.label ?? o.payment_method,
        payment_status: o.payment_status,

        restaurant: o.restaurants?.name ?? '',
        total: o.total_amount,
        commission: o.commission_amount,
      })),
      [
        { key: 'order_number', header: 'Sipariş No' },
        { key: 'created_at', header: 'Tarih' },
        { key: 'status', header: 'Durum' },
        { key: 'payment_method', header: 'Ödeme Yöntemi' },
        { key: 'payment_status', header: 'Ödeme Durumu' },
        { key: 'restaurant', header: 'Restoran' },
        { key: 'total', header: 'Toplam' },
        { key: 'commission', header: 'Komisyon' },
      ],
    );
  };

  return (
    <div>
      <PageHeader
        title="Siparişler"
        description="Tüm restoran siparişleri."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={!data || data.length === 0}>
            <Download className="h-4 w-4" /> CSV İndir
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select label="Durum" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select label="Ödeme" value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Select
              label="Restoran"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
            >
              <option value="">Tüm restoranlar</option>
              {(restaurantsQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <Input
              label="Başlangıç"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input label="Bitiş" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setReason('');
        }}
        title="Siparişi iptal et"
        description={
          cancelTarget
            ? `${cancelTarget.order_number} — ${formatCurrency(cancelTarget.total_amount)}`
            : undefined
        }
      >
        <div className="space-y-3">
          <Input
            label="İptal sebebi"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Müşteri talebi, stok yok, vb."
          />
          {cancelTarget?.payment_status === 'paid' ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={refundOnCancel}
                onChange={(e) => setRefundOnCancel(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ödenen tutarı da iade et (payment_status &rarr; refunded). iyzico/Garanti tarafında
                manuel iade ayrıca yapılmalıdır.
              </span>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCancelTarget(null);
              setReason('');
            }}
          >
            Vazgeç
          </Button>
          <Button
            variant="danger"
            isLoading={cancelMutation.isPending}
            disabled={!reason.trim()}
            onClick={() =>
              cancelTarget &&
              cancelMutation.mutate({
                id: cancelTarget.id,
                reason: reason.trim(),
                refund: cancelTarget.payment_status === 'paid' && refundOnCancel,
              })
            }
          >
            <Ban className="h-4 w-4" /> Siparişi İptal Et
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={!!refundTarget}
        onClose={() => {
          setRefundTarget(null);
          setReason('');
        }}
        title="İade işle"
        description={
          refundTarget
            ? `${refundTarget.order_number} — ${formatCurrency(refundTarget.total_amount)}`
            : undefined
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Sipariş açık kalır, yalnızca payment_status &quot;refunded&quot; olur. Banka tarafında
            iade ayrıca yapılmalıdır.
          </div>
          <Input
            label="İade sebebi"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Çift çekim, fiyat farkı, vb."
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setRefundTarget(null);
              setReason('');
            }}
          >
            Vazgeç
          </Button>
          <Button
            variant="primary"
            isLoading={refundMutation.isPending}
            disabled={!reason.trim()}
            onClick={() =>
              refundTarget && refundMutation.mutate({ id: refundTarget.id, reason: reason.trim() })
            }
          >
            <RotateCcw className="h-4 w-4" /> İadeyi Onayla
          </Button>
        </DialogFooter>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Sipariş bulunamadı" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Sipariş No</TH>
                  <TH>Tarih</TH>
                  <TH>Restoran</TH>
                  <TH>Durum</TH>
                  <TH>Ödeme</TH>
                  <TH className="text-right">Komisyon</TH>
                  <TH className="text-right">Toplam</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((o) => {
                  const isCancelled = o.status === 'cancelled';
                  const isDelivered = o.status === 'delivered';
                  const isPaid = o.payment_status === 'paid';
                  return (
                    <TR key={o.id}>
                      <TD className="font-mono text-xs">{o.order_number}</TD>
                      <TD>{formatDateTime(o.created_at)}</TD>
                      <TD>{o.restaurants?.name ?? '—'}</TD>
                      <TD>
                        <Badge tone={statusTone[o.status] ?? 'neutral'}>
                          {STATUSES.find((s) => s.value === o.status)?.label ?? o.status}
                        </Badge>
                      </TD>
                      <TD className="text-xs text-gray-500">
                        {PAYMENTS.find((p) => p.value === o.payment_method)?.label ??
                          o.payment_method}
                        {' · '}
                        <span className="uppercase">{o.payment_status}</span>
                      </TD>
                      <TD className="text-right text-gray-500">
                        {formatCurrency(o.commission_amount)}
                      </TD>
                      <TD className="text-right font-medium">{formatCurrency(o.total_amount)}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {!isCancelled && !isDelivered ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="İptal et"
                              onClick={() =>
                                setCancelTarget({
                                  id: o.id,
                                  order_number: o.order_number,
                                  total_amount: o.total_amount,
                                  payment_status: o.payment_status,
                                  status: o.status,
                                })
                              }
                            >
                              <Ban className="h-4 w-4 text-red-500" />
                            </Button>
                          ) : null}
                          {!isCancelled && isPaid ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="İade et"
                              onClick={() =>
                                setRefundTarget({
                                  id: o.id,
                                  order_number: o.order_number,
                                  total_amount: o.total_amount,
                                  payment_status: o.payment_status,
                                })
                              }
                            >
                              <RotateCcw className="h-4 w-4 text-amber-500" />
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
