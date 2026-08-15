'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ShoppingBag, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';
import { formatCurrency, localDateKey } from '@/lib/format';

export default function DashboardHome() {
  const supabase = useSupabase();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;

  const statsQuery = useQuery({
    queryKey: ['restaurant-dashboard-stats', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayOrders, activeOrders] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, status')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', today.toISOString()),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .not('status', 'in', '(delivered,cancelled)'),
      ]);

      const orders = todayOrders.data ?? [];
      const total = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const delivered = orders.filter(o => o.status === 'delivered').length;

      return {
        todayCount: orders.length,
        todayCiro: total,
        active: activeOrders.count ?? 0,
        delivered,
      };
    },
    enabled: !!restaurantId,
  });

  const last7DaysQuery = useQuery({
    queryKey: ['restaurant-7days', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', since.toISOString());

      const buckets: Record<string, { date: string; orders: number; revenue: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = localDateKey(d.toISOString());
        const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        buckets[key] = { date: label, orders: 0, revenue: 0 };
      }
      (data ?? []).forEach(o => {
        const key = localDateKey(o.created_at);
        if (buckets[key]) {
          buckets[key].orders += 1;
          buckets[key].revenue += Number(o.total_amount);
        }
      });
      return Object.values(buckets);
    },
    enabled: !!restaurantId,
  });

  const restaurantName = (restaurantQuery.data?.restaurants as { name?: string } | undefined)?.name;

  const kpis = [
    {
      label: 'Bugünkü Sipariş',
      value: statsQuery.data?.todayCount.toLocaleString('tr-TR') ?? '—',
      icon: ShoppingBag,
      accent: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Bugünkü Ciro',
      value: statsQuery.data ? formatCurrency(statsQuery.data.todayCiro) : '—',
      icon: TrendingUp,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Aktif Sipariş',
      value: statsQuery.data?.active.toLocaleString('tr-TR') ?? '—',
      icon: Clock,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Bugün Teslim',
      value: statsQuery.data?.delivered.toLocaleString('tr-TR') ?? '—',
      icon: CheckCircle,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={restaurantName ? `${restaurantName} – günlük özet` : 'Günlük özet'}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => {
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
        <CardHeader><CardTitle>Son 7 Gün</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={last7DaysQuery.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" name="Sipariş" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
