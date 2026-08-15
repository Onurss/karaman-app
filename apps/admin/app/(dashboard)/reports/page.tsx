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
import { Download } from 'lucide-react';
import {
  Button,
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
import { formatCurrency, formatDateTime, localDateKey } from '@/lib/format';
import { exportToCSV } from '@/lib/hooks/use-csv-export';

const COLORS = ['#0F172A', '#F97316', '#10B981', '#3B82F6', '#8B5CF6'];

export default function ReportsPage() {
  const supabase = useSupabase();
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', from, to],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select(
          'id, created_at, status, payment_method, payment_status, total_amount, commission_amount, vat_amount, restaurant_id',
        )
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59');

      const { data: items } = await supabase
        .from('order_items')
        .select('item_name_snapshot, quantity, total_price, order_id, orders!inner(created_at)')
        .gte('orders.created_at', from)
        .lte('orders.created_at', to + 'T23:59:59');

      return { orders: orders ?? [], items: items ?? [] };
    },
  });

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const items = data?.items ?? [];

    const total = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const commission = orders.reduce((s, o) => s + Number(o.commission_amount), 0);
    const vat = orders.reduce((s, o) => s + Number(o.vat_amount), 0);
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelRate = orders.length > 0 ? (cancelled / orders.length) * 100 : 0;

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
    const paymentDist = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

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
      vat,
      count: orders.length,
      delivered,
      cancelled,
      cancelRate,
      daily,
      paymentDist,
      topItems,
    };
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(
      'rapor',
      data.orders.map((o) => ({
        order_id: o.id,
        created_at: formatDateTime(o.created_at),
        status: o.status,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        total: o.total_amount,
        commission: o.commission_amount,
        vat: o.vat_amount,
      })),
      [
        { key: 'order_id', header: 'Sipariş ID' },
        { key: 'created_at', header: 'Tarih' },
        { key: 'status', header: 'Durum' },
        { key: 'payment_method', header: 'Ödeme' },
        { key: 'payment_status', header: 'Ödeme Durumu' },
        { key: 'total', header: 'Toplam' },
        { key: 'commission', header: 'Komisyon' },
        { key: 'vat', header: 'KDV' },
      ],
    );
  };

  return (
    <div>
      <PageHeader
        title="Raporlar"
        description="Finansal ve operasyonel performans raporları."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> CSV İndir
          </Button>
        }
      />

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
                <CardTitle className="text-sm text-gray-500">Komisyon Geliri</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(stats.commission)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">İptal Oranı</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">%{stats.cancelRate.toFixed(1)}</p>
                <p className="text-xs text-gray-500">
                  {stats.cancelled} iptal / {stats.delivered} teslim
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Günlük Ciro</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" name="Ciro" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ödeme Yöntemi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.paymentDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
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
