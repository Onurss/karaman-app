'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, Phone, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogFooter,
  Empty,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';
import { useOrderSound } from '@/lib/hooks/use-order-sound';
import { formatCurrency } from '@/lib/format';
import { ORDER_RULES, PAGINATION } from '@karaman/utils';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  on_the_way: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

const STATUS_TONE: Record<
  string,
  'warning' | 'info' | 'primary' | 'success' | 'secondary' | 'danger'
> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'info',
  on_the_way: 'secondary',
  delivered: 'success',
  cancelled: 'danger',
};

const FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'on_the_way'] as const;

interface OrderRow {
  id: string;
  order_number: string;
  status: keyof typeof STATUS_LABEL;
  total_amount: number;
  estimated_delivery_minutes: number | null;
  customer_note: string | null;
  payment_method: string;
  delivery_address_snapshot: { full_address: string; title: string; note?: string };
  created_at: string;
  courier_id: string | null;
  items?: { id: string; item_name_snapshot: string; quantity: number; note: string | null }[];
  profiles?: { full_name: string; phone: string | null } | null;
}

export default function OrdersPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;
  const sound = useOrderSound();
  const previousIdsRef = useRef<Set<string>>(new Set());

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [detailOpen, setDetailOpen] = useState<OrderRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectFor, setRejectFor] = useState<OrderRow | null>(null);
  const [courierPickerFor, setCourierPickerFor] = useState<OrderRow | null>(null);
  const [acceptFor, setAcceptFor] = useState<OrderRow | null>(null);
  const [prepMinutes, setPrepMinutes] = useState<number>(ORDER_RULES.prepDurationOptions[1]);

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-orders', restaurantId, filter],
    queryFn: async () => {
      if (!restaurantId) return [];
      let q = supabase
        .from('orders')
        .select(
          '*, profiles(full_name, phone), items:order_items(id, item_name_snapshot, quantity, note)',
        )
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(PAGINATION.maxLimit);
      if (filter !== 'all') q = q.eq('status', filter);
      else q = q.not('status', 'in', '(delivered,cancelled)');
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
    enabled: !!restaurantId,
  });

  const couriersQuery = useQuery({
    queryKey: ['couriers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from('restaurant_couriers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.map((o) => o.id));
    const pendingNew = data.filter(
      (o) => o.status === 'pending' && !previousIdsRef.current.has(o.id),
    );
    if (previousIdsRef.current.size > 0 && pendingNew.length > 0) {
      sound.playLoop(3000);
      sound.desktopNotification(
        'Yeni sipariş!',
        `${pendingNew.length} sipariş bekliyor — ${pendingNew[0].order_number}`,
      );
    }
    previousIdsRef.current = currentIds;
  }, [data, sound]);

  useEffect(() => {
    if (!restaurantId) return undefined;
    const channel = supabase
      .channel('restaurant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, queryClient]);

  const transition = useMutation({
    mutationFn: async (input: {
      orderId: string;
      status: string;
      extras?: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: input.status, ...(input.extras ?? {}) })
        .eq('id', input.orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      sound.stop();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAccept = (order: OrderRow) => {
    setAcceptFor(order);
    setPrepMinutes(ORDER_RULES.prepDurationOptions[1]);
  };

  const confirmAccept = () => {
    if (!acceptFor) return;
    transition.mutate(
      {
        orderId: acceptFor.id,
        status: 'preparing',
        extras: { estimated_delivery_minutes: prepMinutes },
      },
      {
        onSuccess: () => {
          toast.success('Sipariş hazırlığa alındı.');
          setAcceptFor(null);
        },
      },
    );
  };

  const confirmReject = () => {
    if (!rejectFor || !rejectReason) {
      toast.warning('Lütfen bir iptal sebebi girin.');
      return;
    }
    transition.mutate(
      {
        orderId: rejectFor.id,
        status: 'cancelled',
        extras: { cancellation_reason: rejectReason },
      },
      {
        onSuccess: () => {
          toast.success('Sipariş iptal edildi.');
          setRejectFor(null);
          setRejectReason('');
        },
      },
    );
  };

  const assignCourier = (courierId: string) => {
    if (!courierPickerFor) return;
    transition.mutate(
      {
        orderId: courierPickerFor.id,
        status: 'on_the_way',
        extras: { courier_id: courierId },
      },
      {
        onSuccess: () => {
          toast.success('Kurye atandı, sipariş yola çıktı.');
          setCourierPickerFor(null);
        },
      },
    );
  };

  return (
    <div>
      <PageHeader title="Siparişler" description={`${data?.length ?? 0} aktif sipariş`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'primary' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Aktif' : STATUS_LABEL[f]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent>Yükleniyor…</CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Empty title="Bu filtreye uygun sipariş yok." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((order) => (
            <Card key={order.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-gray-500">{order.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-2">
                      {order.delivery_address_snapshot?.full_address ?? '—'}
                    </span>
                  </div>
                  {order.estimated_delivery_minutes ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>~{order.estimated_delivery_minutes} dk</span>
                    </div>
                  ) : null}
                  {order.profiles?.phone ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${order.profiles.phone}`}>{order.profiles.phone}</a>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="font-semibold">
                    {formatCurrency(Number(order.total_amount))}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setDetailOpen(order)}>
                    Detay
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  {/* pending = ödeme bekleniyor (online), restoran etkileşim YOK */}
                  {order.status === 'pending' ? (
                    <span className="text-xs text-amber-600">
                      Ödeme bekleniyor — onaylanınca işleme alınabilir
                    </span>
                  ) : null}
                  {/* confirmed = ödeme alındı / kapıda ödeme onaylandı, restoran kabul edebilir */}
                  {order.status === 'confirmed' ? (
                    <>
                      <Button size="sm" variant="success" onClick={() => handleAccept(order)}>
                        Kabul Et
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectFor(order)}>
                        Reddet
                      </Button>
                    </>
                  ) : null}
                  {order.status === 'preparing' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => transition.mutate({ orderId: order.id, status: 'ready' })}
                    >
                      Hazır
                    </Button>
                  ) : null}
                  {order.status === 'ready' ? (
                    <Button size="sm" variant="primary" onClick={() => setCourierPickerFor(order)}>
                      Kurye Ata
                    </Button>
                  ) : null}
                  {order.status === 'on_the_way' ? (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => transition.mutate({ orderId: order.id, status: 'delivered' })}
                    >
                      Teslim Edildi
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!detailOpen}
        onClose={() => setDetailOpen(null)}
        title={detailOpen ? `Sipariş ${detailOpen.order_number}` : ''}
        size="lg"
      >
        {detailOpen ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500">Müşteri</p>
              <p className="font-medium">{detailOpen.profiles?.full_name ?? '—'}</p>
              {detailOpen.profiles?.phone ? (
                <a href={`tel:${detailOpen.profiles.phone}`} className="text-blue-600">
                  {detailOpen.profiles.phone}
                </a>
              ) : null}
            </div>
            <div>
              <p className="text-gray-500">Adres</p>
              <p>{detailOpen.delivery_address_snapshot?.full_address}</p>
              {detailOpen.delivery_address_snapshot?.note ? (
                <p className="text-gray-500 mt-1">
                  Kurye notu: {detailOpen.delivery_address_snapshot.note}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-gray-500">Sipariş Kalemleri</p>
              <div className="mt-1 space-y-1">
                {(detailOpen.items ?? []).map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity}× {it.item_name_snapshot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {detailOpen.customer_note ? (
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Müşteri notu</p>
                <p className="text-sm">{detailOpen.customer_note}</p>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-3">
              <span>Ödeme</span>
              <span className="font-medium">{detailOpen.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam</span>
              <span className="text-lg font-semibold">
                {formatCurrency(Number(detailOpen.total_amount))}
              </span>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={!!acceptFor} onClose={() => setAcceptFor(null)} title="Hazırlık Süresi">
        <p className="mb-3 text-sm text-gray-600">Bu sipariş için tahmini hazırlık süresi:</p>
        <div className="grid grid-cols-4 gap-2">
          {ORDER_RULES.prepDurationOptions.map((m) => (
            <Button
              key={m}
              variant={prepMinutes === m ? 'primary' : 'outline'}
              onClick={() => setPrepMinutes(m)}
            >
              {m} dk
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAcceptFor(null)}>
            Vazgeç
          </Button>
          <Button variant="success" onClick={confirmAccept} isLoading={transition.isPending}>
            Kabul Et
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={!!rejectFor}
        onClose={() => {
          setRejectFor(null);
          setRejectReason('');
        }}
        title="Siparişi Reddet"
      >
        <Textarea
          label="İptal sebebi"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          placeholder="Müşteriye bildirilecek iptal sebebi"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setRejectFor(null);
              setRejectReason('');
            }}
          >
            Vazgeç
          </Button>
          <Button variant="danger" onClick={confirmReject} isLoading={transition.isPending}>
            <X className="h-4 w-4" /> Reddet
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!courierPickerFor} onClose={() => setCourierPickerFor(null)} title="Kurye Ata">
        {couriersQuery.data && couriersQuery.data.length > 0 ? (
          <div className="space-y-2">
            {couriersQuery.data.map((c) => (
              <button
                key={c.id}
                onClick={() => assignCourier(c.id)}
                className="flex w-full items-center justify-between rounded-md border border-gray-200 p-3 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.phone}
                    {c.plate_number ? ` · ${c.plate_number}` : ''}
                  </p>
                </div>
                <span className="text-xs text-blue-600">Ata →</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Henüz aktif kurye yok. Önce{' '}
            <a href="/couriers" className="text-blue-600 underline">
              Kuryeler
            </a>{' '}
            sayfasından kurye ekleyin.
          </p>
        )}
      </Dialog>
    </div>
  );
}
