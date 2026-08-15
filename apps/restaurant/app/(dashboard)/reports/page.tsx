'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';
import { formatCurrency, localDateKey } from '@/lib/format';
import { ANALYTICS } from '@karaman/utils';

const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6'];

const PAYMENT_LABEL: Record<string, string> = {
  iyzico: 'iyzico',
  garanti_pos: 'Garanti POS',
  cash_on_delivery: 'Kapıda Nakit',
  card_on_delivery: 'Kapıda Kart',
};

export default function ReportsPage() {
  const supabase = useSupabase();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;

  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - ANALYTICS.restaurantReportDays);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-reports', restaurantId, from, to],
    queryFn: async () => {
      if (!restaurantId) return { orders: [], items: [] };
      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, created_at, status, payment_method, total_amount, commission_amount')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', from)
          .lte('created_at', to + 'T23:59:59'),
        supabase
          .from('order_items')
          .select(
            'item_name_snapshot, quantity, total_price, orders!inner(restaurant_id, created_at)',
          )
          .eq('orders.restaurant_id', restaurantId)
          .gte('orders.created_at', from)
          .lte('orders.created_at', to + 'T23:59:59'),
      ]);
      return { orders: ordersRes.data ?? [], items: itemsRes.data ?? [] };
    },
    enabled: !!restaurantId,
  });

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const items = data?.items ?? [];

    const total = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const commission = orders.reduce((s, o) => s + Number(o.commission_amount), 0);
    const restaurantEarning = total - commission;

    const dailyMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    orders.forEach((o) => {
      const key = localDateKey(o.created_at);
      if (!dailyMap[key]) dailyMap[key] = { date: key.slice(5), revenue: 0, orders: 0 };
      dailyMap[key].revenue += Number(o.total_amount);
      dailyMap[key].orders += 1;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const paymentMap: Record<string, number> = {};
    orders.forEach((o) => {
      paymentMap[o.payment_method] = (paymentMap[o.payment_method] ?? 0) + 1;
    });
    const paymentDist = Object.entries(paymentMap).map(([name, value]) => ({
      name: PAYMENT_LABEL[name] ?? name,
      value,
    }));

    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    items.forEach((it) => {
      const k = it.item_name_snapshot;
      if (!itemMap[k]) itemMap[k] = { name: k, quantity: 0, revenue: 0 };
      itemMap[k].quantity += Number(it.quantity);
      itemMap[k].revenue += Number(it.total_price);
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      total,
      commission,
      restaurantEarning,
      count: orders.length,
      daily,
      paymentDist,
      topItems,
    };
  }, [data]);

  return (
    <div>
      <PageHeader title="Raporlar" description="Sipariş ve ciro istatistikleri." />

      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
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

      {isLoading ? (
        <Card>
          <CardContent>Yükleniyor…</CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">Toplam Sipariş</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stats.count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">Toplam Ciro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCurrency(stats.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">Komisyon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-amber-600">
                  {formatCurrency(stats.commission)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">Kazancınız</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(stats.restaurantEarning)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Günlük Satış</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" name="Sipariş" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ödeme Yöntemi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.paymentDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {stats.paymentDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>En Çok Satan Ürünler (Top 10)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>#</TH>
                    <TH>Ürün</TH>
                    <TH className="text-right">Adet</TH>
                    <TH className="text-right">Ciro</TH>
                  </TR>
                </THead>
                <TBody>
                  {stats.topItems.map((it, i) => (
                    <TR key={it.name}>
                      <TD>{i + 1}</TD>
                      <TD className="font-medium">{it.name}</TD>
                      <TD className="text-right">{it.quantity}</TD>
                      <TD className="text-right">{formatCurrency(it.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
