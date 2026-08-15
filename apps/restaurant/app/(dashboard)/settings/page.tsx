'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DeliveryZoneMap,
  ImageUpload,
  Input,
  PageHeader,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';
import type { GeoPoint } from '@karaman/shared-types';
import {
  WEEKDAYS,
  isRestaurantOpenNow,
  type WorkingHours,
  type OpenOverride,
} from '@karaman/utils';

interface DeliveryZoneGeoJson {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export default function SettingsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;
  const restaurant = restaurantQuery.data?.restaurants as
    | {
        name: string;
        phone: string;
        logo_url: string | null;
        cover_image_url: string | null;
        min_order_amount: number;
        delivery_fee: number;
        estimated_delivery_minutes: number;
        working_hours: WorkingHours;
        is_open: boolean;
        open_override: OpenOverride;
        accepts_cash: boolean;
        accepts_card_on_delivery: boolean;
        accepts_online_payment: boolean;
        location: GeoPoint | null;
        delivery_zone: DeliveryZoneGeoJson | null;
      }
    | undefined;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [minOrder, setMinOrder] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estDelivery, setEstDelivery] = useState('');
  const [override, setOverride] = useState<OpenOverride>('auto');
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptsCard, setAcceptsCard] = useState(true);
  const [acceptsOnline, setAcceptsOnline] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    setLogoUrl(restaurant.logo_url ?? null);
    setCoverUrl(restaurant.cover_image_url ?? null);
    setWorkingHours(restaurant.working_hours ?? {});
    setMinOrder(String(restaurant.min_order_amount));
    setDeliveryFee(String(restaurant.delivery_fee));
    setEstDelivery(String(restaurant.estimated_delivery_minutes));
    setOverride(restaurant.open_override ?? 'auto');
    setAcceptsCash(restaurant.accepts_cash);
    setAcceptsCard(restaurant.accepts_card_on_delivery);
    setAcceptsOnline(restaurant.accepts_online_payment);
  }, [restaurant]);

  const save = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restoran bulunamadı.');
      const { error } = await supabase
        .from('restaurants')
        .update({
          logo_url: logoUrl,
          cover_image_url: coverUrl,
          working_hours: workingHours,
          min_order_amount: Number(minOrder),
          delivery_fee: Number(deliveryFee),
          estimated_delivery_minutes: Number(estDelivery),
          open_override: override,
          accepts_cash: acceptsCash,
          accepts_card_on_delivery: acceptsCard,
          accepts_online_payment: acceptsOnline,
        })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ayarlar kaydedildi.');
      queryClient.invalidateQueries({ queryKey: ['current-restaurant'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Ayarlar" description={restaurant?.name ?? 'Restoran ayarları'} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Anlık Durum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ['auto', 'Otomatik (çalışma saatlerine göre)'],
                ['open', 'Manuel: Açık tut'],
                ['closed', 'Manuel: Kapalı tut'],
              ] as [OpenOverride, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="open_override"
                  checked={override === value}
                  onChange={() => setOverride(value)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
            <div className="mt-1 rounded-md bg-gray-50 px-3 py-2 text-sm">
              Şu an:{' '}
              <span
                className={
                  isRestaurantOpenNow(workingHours, override)
                    ? 'font-semibold text-green-600'
                    : 'font-semibold text-red-600'
                }
              >
                {isRestaurantOpenNow(workingHours, override) ? 'Açık' : 'Kapalı'}
              </span>
              {override === 'auto' ? (
                <span className="text-gray-500"> · saatlerinize göre otomatik</span>
              ) : (
                <span className="text-gray-500"> · manuel sabitlendi</span>
              )}
            </div>
          </CardContent>
        </Card>

        {restaurantId ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Marka Görselleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Logo</label>
                  <ImageUpload
                    bucket="restaurant-assets"
                    pathPrefix={`${restaurantId}/logo`}
                    value={logoUrl}
                    onChange={setLogoUrl}
                    maxSizeMB={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Kapak Görseli
                  </label>
                  <ImageUpload
                    bucket="restaurant-assets"
                    pathPrefix={`${restaurantId}/cover`}
                    value={coverUrl}
                    onChange={setCoverUrl}
                    maxSizeMB={5}
                    aspect="wide"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Teslimat & Sipariş</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Min sipariş tutarı (₺)"
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
            <Input
              label="Teslimat ücreti (₺)"
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
            <Input
              label="Tahmini teslim süresi (dk)"
              type="number"
              value={estDelivery}
              onChange={(e) => setEstDelivery(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Çalışma Saatleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="mb-1 text-xs text-gray-500">
              &ldquo;Otomatik&rdquo; modda restoran bu saatlere göre açılıp kapanır. Gece yarısını
              aşan saatler (örn. 18:00–02:00) desteklenir.
            </p>
            {WEEKDAYS.map((d) => {
              const hours = workingHours[d.key] ?? null;
              const isClosed = !hours;
              return (
                <div key={d.key} className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-3 text-sm font-medium">{d.label}</span>
                  <label className="col-span-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!isClosed}
                      onChange={(e) =>
                        setWorkingHours({
                          ...workingHours,
                          [d.key]: e.target.checked ? { open: '09:00', close: '22:00' } : null,
                        })
                      }
                    />
                    {isClosed ? 'Kapalı' : 'Açık'}
                  </label>
                  <input
                    type="time"
                    disabled={isClosed}
                    value={hours?.open ?? ''}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        [d.key]: { open: e.target.value, close: hours?.close ?? '22:00' },
                      })
                    }
                    className="col-span-3 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                  />
                  <input
                    type="time"
                    disabled={isClosed}
                    value={hours?.close ?? ''}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        [d.key]: { open: hours?.open ?? '09:00', close: e.target.value },
                      })
                    }
                    className="col-span-3 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ödeme Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptsCash}
                onChange={(e) => setAcceptsCash(e.target.checked)}
              />
              Kapıda nakit
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptsCard}
                onChange={(e) => setAcceptsCard(e.target.checked)}
              />
              Kapıda kredi kartı
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptsOnline}
                onChange={(e) => setAcceptsOnline(e.target.checked)}
              />
              Online ödeme (iyzico / Garanti)
            </label>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teslimat Bölgesi</CardTitle>
          </CardHeader>
          <CardContent>
            {restaurantId ? (
              <DeliveryZoneMap
                restaurantId={restaurantId}
                restaurantLocation={restaurant?.location ?? null}
                initialGeoJson={
                  restaurant?.delivery_zone as
                    | { type: 'Polygon'; coordinates: number[][][] }
                    | { type: 'MultiPolygon'; coordinates: number[][][][] }
                    | null
                }
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['current-restaurant'] })}
              />
            ) : (
              <p className="text-sm text-gray-500">Restoran yükleniyor…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} isLoading={save.isPending}>
          Tüm Ayarları Kaydet
        </Button>
      </div>
    </div>
  );
}
