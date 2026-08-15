'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, ShoppingBag, TrendingUp, Store } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { formatCurrency, formatDateTime, localDateKey } from '@/lib/format';
import { ANALYTICS, PAGINATION } from '@karaman/utils';

const orderStatusLabel: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  on_the_way: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

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

export default function DashboardPage() {
  const supabase = useSupabase();

  const kpisQuery = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [users, todayOrders, activeRestaurants, totalRevenue] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', todayIso),
        supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', todayIso)
          .eq('payment_status', 'paid'),
      ]);

      const ciro = (todayOrders.data ?? []).reduce(
        (sum, o) => sum + Number(o.total_amount ?? 0),
        0,
      );
      const paidCiro = (totalRevenue.data ?? []).reduce(
        (sum, o) => sum + Number(o.total_amount ?? 0),
        0,
      );

      return {
        totalUsers: users.count ?? 0,
        todayOrders: todayOrders.count ?? 0,
        todayCiro: ciro,
        paidCiro,
        activeRestaurants: activeRestaurants.count ?? 0,
      };
    },
  });

  const last7DaysQuery = useQuery({
    queryKey: ['dashboard-7days'],
    queryFn: async () => {
      const days = ANALYTICS.adminDashboardDays;
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', since.toISOString());

      const buckets: Record<string, { date: string; orders: number; revenue: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = localDateKey(d.toISOString());
        const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        buckets[key] = { date: label, orders: 0, revenue: 0 };
      }
      (data ?? []).forEach((o) => {
        const key = localDateKey(o.created_at);
        if (buckets[key]) {
          buckets[key].orders += 1;
          buckets[key].revenue += Number(o.total_amount ?? 0);
        }
      });
      return Object.values(buckets);
    },
  });

  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, payment_method')
        .order('created_at', { ascending: false })
        .limit(PAGINATION.dashboardRecentLimit);
      return data ?? [];
    },
  });

  const kpis = [
    {
      label: 'Toplam Kullanıcı',
      value: kpisQuery.data?.totalUsers.toLocaleString('tr-TR') ?? '—',
      icon: Users,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Bugünkü Sipariş',
      value: kpisQuery.data?.todayOrders.toLocaleString('tr-TR') ?? '—',
      icon: ShoppingBag,
      accent: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Bugünkü Ciro',
      value: kpisQuery.data ? formatCurrency(kpisQuery.data.todayCiro) : '—',
      icon: TrendingUp,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Aktif Restoran',
      value: kpisQuery.data?.activeRestaurants.toLocaleString('tr-TR') ?? '—',
      icon: Store,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Karaman.com genel bakış" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-3 ${k.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{k.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son 7 Gün</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={last7DaysQuery.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" name="Sipariş" fill="#F97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name="Ciro (₺)" fill="#0F172A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Siparişler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrdersQuery.isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !recentOrdersQuery.data || recentOrdersQuery.data.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Henüz sipariş yok.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Sipariş No</TH>
                  <TH>Tarih</TH>
                  <TH>Durum</TH>
                  <TH>Ödeme</TH>
                  <TH className="text-right">Tutar</TH>
                </TR>
              </THead>
              <TBody>
                {recentOrdersQuery.data.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-medium">{o.order_number}</TD>
                    <TD>{formatDateTime(o.created_at)}</TD>
                    <TD>
                      <Badge tone={statusTone[o.status] ?? 'neutral'}>
                        {orderStatusLabel[o.status] ?? o.status}
                      </Badge>
                    </TD>
                    <TD className="text-gray-500">{o.payment_method}</TD>
                    <TD className="text-right font-medium">{formatCurrency(o.total_amount)}</TD>
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
