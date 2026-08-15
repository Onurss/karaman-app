'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Mail, Clock } from 'lucide-react';
import {
  Badge,
  Button,
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
import { formatCurrency, formatDate, formatPhone } from '@/lib/format';
import { PAGINATION, type WorkingHours } from '@karaman/utils';

const DAY_LABEL: Record<string, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = useSupabase();
  const id = params?.id;

  const restaurantQuery = useQuery({
    queryKey: ['admin-restaurant-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('restaurants_view')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const ownersQuery = useQuery({
    queryKey: ['admin-restaurant-owners', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('restaurant_users')
        .select('id, role, is_active, user_id, profiles(full_name, email, phone)')
        .eq('restaurant_id', id);
      return data ?? [];
    },
    enabled: !!id,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-restaurant-orders', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, payment_method')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(PAGINATION.restaurantDetailOrdersLimit);
      return data ?? [];
    },
    enabled: !!id,
  });

  if (restaurantQuery.isLoading) {
    return <div className="p-6 text-sm text-gray-500">Yükleniyor…</div>;
  }
  if (!restaurantQuery.data) {
    return (
      <div className="p-6">
        <Link href="/restaurants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> Restoran Listesi
          </Button>
        </Link>
        <p className="mt-4 text-sm text-gray-500">Restoran bulunamadı.</p>
      </div>
    );
  }

  const r = restaurantQuery.data as {
    id: string;
    name: string;
    slug: string;
    description?: string;
    phone: string;
    email?: string;
    address: string;
    district: string;
    cuisine_types: string[];
    rating: number;
    review_count: number;
    min_order_amount: number;
    delivery_fee: number;
    estimated_delivery_minutes: number;
    commission_rate: number;
    subscription_tier?: string;
    is_active: boolean;
    is_open: boolean;
    working_hours: WorkingHours;
    accepts_cash: boolean;
    accepts_card_on_delivery: boolean;
    accepts_online_payment: boolean;
    created_at: string;
  };

  return (
    <div>
      <Link href="/restaurants">
        <Button variant="outline" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Restoran Listesi
        </Button>
      </Link>

      <PageHeader
        title={r.name}
        description={`${r.district} · ${(r.cuisine_types ?? []).join(', ')}`}
        actions={
          <div className="flex gap-2">
            <Badge tone={r.is_active ? 'success' : 'danger'}>
              {r.is_active ? 'Aktif' : 'Pasif'}
            </Badge>
            <Badge tone={r.is_open ? 'success' : 'warning'}>
              {r.is_open ? 'Açık' : 'Kapalı'}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>İletişim & Konum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
              <span>{r.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${r.phone}`} className="text-blue-600">
                {formatPhone(r.phone)}
              </a>
            </div>
            {r.email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${r.email}`} className="text-blue-600">
                  {r.email}
                </a>
              </div>
            ) : null}
            {r.description ? (
              <p className="text-sm text-gray-600">{r.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finansal Ayarlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Min sipariş</span>
              <span className="font-medium">{formatCurrency(r.min_order_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Teslimat ücreti</span>
              <span className="font-medium">{formatCurrency(r.delivery_fee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Komisyon</span>
              <span className="font-medium">%{r.commission_rate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Abonelik</span>
              <span className="font-medium">{r.subscription_tier ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Puan</span>
              <span className="font-medium">
                {r.rating?.toFixed?.(1) ?? '—'} ({r.review_count} oy)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Çalışma Saatleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              {Object.entries(r.working_hours ?? {}).map(([day, hours]) => (
                <div key={day} className="flex flex-col">
                  <span className="text-xs text-gray-500">{DAY_LABEL[day] ?? day}</span>
                  <span className="font-medium">
                    {hours ? `${hours.open} - ${hours.close}` : 'Kapalı'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödeme Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Kapıda nakit</span>
              <Badge tone={r.accepts_cash ? 'success' : 'neutral'}>
                {r.accepts_cash ? 'Açık' : 'Kapalı'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Kapıda kart</span>
              <Badge tone={r.accepts_card_on_delivery ? 'success' : 'neutral'}>
                {r.accepts_card_on_delivery ? 'Açık' : 'Kapalı'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Online ödeme</span>
              <Badge tone={r.accepts_online_payment ? 'success' : 'neutral'}>
                {r.accepts_online_payment ? 'Açık' : 'Kapalı'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Yetkili Kullanıcılar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ownersQuery.data && ownersQuery.data.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Ad Soyad</TH>
                    <TH>E-posta</TH>
                    <TH>Telefon</TH>
                    <TH>Rol</TH>
                    <TH>Durum</TH>
                  </TR>
                </THead>
                <TBody>
                  {ownersQuery.data.map(u => {
                    const raw = u.profiles as unknown;
                    const profile = (Array.isArray(raw) ? raw[0] : raw) as
                      | { full_name: string; email: string; phone: string | null }
                      | null
                      | undefined;
                    return (
                      <TR key={u.id}>
                        <TD className="font-medium">{profile?.full_name ?? '—'}</TD>
                        <TD>{profile?.email ?? '—'}</TD>
                        <TD>{profile?.phone ? formatPhone(profile.phone) : '—'}</TD>
                        <TD>
                          <Badge tone={u.role === 'owner' ? 'primary' : 'neutral'}>
                            {u.role}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge tone={u.is_active ? 'success' : 'neutral'}>
                            {u.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-gray-500">Yetkili kullanıcı yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Son Siparişler (20)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersQuery.data && ordersQuery.data.length > 0 ? (
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
                  {ordersQuery.data.map(o => (
                    <TR key={o.id}>
                      <TD className="font-mono text-xs">{o.order_number}</TD>
                      <TD>{formatDate(o.created_at)}</TD>
                      <TD>
                        <Badge tone="info">{o.status}</Badge>
                      </TD>
                      <TD className="text-xs text-gray-500">{o.payment_method}</TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(o.total_amount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-gray-500">Henüz sipariş yok.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
