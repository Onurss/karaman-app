'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import {
  KARAMAN_CENTER,
  KARAMAN_DISTRICTS,
  WEEKDAYS,
  defaultWorkingHours,
  type WorkingHours,
} from '@karaman/utils';
import { LocationPicker } from '@/components/ui/location-picker';
import { STEP_SCHEMAS, validatePaymentMethods } from '@/lib/schemas/restaurant';

const STEPS = ['Genel Bilgiler', 'Konum & Teslimat', 'Çalışma Saatleri', 'Komisyon & Abonelik', 'Sahip Hesabı'] as const;

const RESTAURANT_DEFAULTS = {
  minOrderAmount: 100,
  deliveryFee: 20,
  estimatedDeliveryMinutes: 30,
  commissionRate: 10,
} as const;

interface FormState {
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  tax_office: string;
  tax_number: string;
  cuisine_types: string;
  logo_url: string;
  cover_image_url: string;
  district: string;
  address: string;
  lat: string;
  lng: string;
  min_order_amount: string;
  delivery_fee: string;
  estimated_delivery_minutes: string;
  working_hours: WorkingHours;
  commission_rate: string;
  subscription_tier: '' | 'bronze' | 'silver' | 'gold';
  accepts_cash: boolean;
  accepts_card_on_delivery: boolean;
  accepts_online_payment: boolean;
  owner_email: string;
  owner_password: string;
  owner_name: string;
}

const initial: FormState = {
  name: '',
  slug: '',
  description: '',
  phone: '',
  email: '',
  tax_office: '',
  tax_number: '',
  cuisine_types: '',
  logo_url: '',
  cover_image_url: '',
  district: KARAMAN_DISTRICTS[0],
  address: '',
  lat: String(KARAMAN_CENTER.lat),
  lng: String(KARAMAN_CENTER.lng),
  min_order_amount: String(RESTAURANT_DEFAULTS.minOrderAmount),
  delivery_fee: String(RESTAURANT_DEFAULTS.deliveryFee),
  estimated_delivery_minutes: String(RESTAURANT_DEFAULTS.estimatedDeliveryMinutes),
  working_hours: defaultWorkingHours('10:00', '22:00'),
  commission_rate: String(RESTAURANT_DEFAULTS.commissionRate),
  subscription_tier: 'bronze',
  accepts_cash: true,
  accepts_card_on_delivery: true,
  accepts_online_payment: true,
  owner_email: '',
  owner_password: '',
  owner_name: '',
};

export default function NewRestaurantPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);

  const slug = (form.slug || form.name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  function validateCurrentStep(): boolean {
    const schema = STEP_SCHEMAS[step];
    const payload = step === 0 ? { ...form, slug } : form;
    const result = schema.safeParse(payload);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return false;
    }
    if (step === 3) {
      const err = validatePaymentMethods({
        commission_rate: Number(form.commission_rate),
        subscription_tier: form.subscription_tier,
        accepts_cash: form.accepts_cash,
        accepts_card_on_delivery: form.accepts_card_on_delivery,
        accepts_online_payment: form.accepts_online_payment,
      });
      if (err) {
        toast.error(err);
        return false;
      }
    }
    return true;
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('onboard-restaurant', {
        body: {
          name: form.name,
          slug,
          description: form.description || null,
          phone: form.phone,
          email: form.email || null,
          tax_office: form.tax_office || null,
          tax_number: form.tax_number || null,
          logo_url: form.logo_url || null,
          cover_image_url: form.cover_image_url || null,
          address: form.address,
          district: form.district,
          lat: Number(form.lat),
          lng: Number(form.lng),
          cuisine_types: form.cuisine_types.split(',').map(s => s.trim()).filter(Boolean),
          min_order_amount: Number(form.min_order_amount),
          delivery_fee: Number(form.delivery_fee),
          estimated_delivery_minutes: Number(form.estimated_delivery_minutes),
          commission_rate: Number(form.commission_rate),
          subscription_tier: form.subscription_tier || null,
          accepts_cash: form.accepts_cash,
          accepts_card_on_delivery: form.accepts_card_on_delivery,
          accepts_online_payment: form.accepts_online_payment,
          working_hours: form.working_hours,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          owner_password: form.owner_password,
        },
      });

      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error?.message) message = body.error.message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      return data.data as { restaurant_id: string; name: string };
    },
    onSuccess: r => {
      toast.success(`${r.name} eklendi.`);
      router.push('/restaurants');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const next = () => {
    if (!validateCurrentStep()) return;
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  };
  const prev = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = () => {
    if (!validateCurrentStep()) return;
    createMutation.mutate();
  };

  return (
    <div>
      <PageHeader title="Yeni Restoran" description="5 adımda yeni bir restoran oluşturun." />

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  i === step ? 'bg-primary text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'font-semibold' : 'text-gray-500'}`}>{s}</span>
                {i < STEPS.length - 1 ? <div className="h-px flex-1 bg-gray-200" /> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Restoran Adı" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <Input label="Slug" value={slug} onChange={e => setForm({ ...form, slug: e.target.value })} hint="URL'de görünür" />
              </div>
              <Textarea label="Açıklama" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+905..." required />
                <Input label="E-posta" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Vergi Dairesi" value={form.tax_office} onChange={e => setForm({ ...form, tax_office: e.target.value })} />
                <Input label="Vergi No" value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} />
              </div>
              <Input label="Mutfak türleri (virgülle ayırın)" value={form.cuisine_types} onChange={e => setForm({ ...form, cuisine_types: e.target.value })} placeholder="Pizza, Türk Mutfağı, ..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Logo URL" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} />
                <Input label="Kapak Görsel URL" value={form.cover_image_url} onChange={e => setForm({ ...form, cover_image_url: e.target.value })} />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Input label="Adres" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Konum (haritadan işaretleyin)
                </label>
                <LocationPicker
                  lat={Number(form.lat)}
                  lng={Number(form.lng)}
                  onChange={loc =>
                    setForm(f => ({
                      ...f,
                      lat: String(loc.lat),
                      lng: String(loc.lng),
                      address: loc.address ?? f.address,
                      district:
                        loc.district &&
                        (KARAMAN_DISTRICTS as readonly string[]).includes(loc.district)
                          ? loc.district
                          : f.district,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select label="İlçe" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} required>
                  {KARAMAN_DISTRICTS.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Input label="Enlem (lat)" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} required />
                <Input label="Boylam (lng)" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} required />
              </div>
              <p className="text-xs text-gray-500">
                Karaman Merkez: {KARAMAN_CENTER.lat}, {KARAMAN_CENTER.lng}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Tahmini teslim süresi (dk)" type="number" value={form.estimated_delivery_minutes} onChange={e => setForm({ ...form, estimated_delivery_minutes: e.target.value })} />
                <Input label="Min sipariş tutarı (₺)" type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />
                <Input label="Teslimat ücreti (₺)" type="number" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: e.target.value })} />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Restoran &ldquo;otomatik&rdquo; modda bu saatlere göre açılıp kapanır. Sahip kendi
                panelinden değiştirebilir.
              </p>
              {WEEKDAYS.map(({ key, label }) => {
                const hours = form.working_hours[key] ?? null;
                const closed = !hours;
                return (
                  <div key={key} className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-3 text-sm font-medium">{label}</span>
                    <label className="col-span-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!closed}
                        onChange={e =>
                          setForm({
                            ...form,
                            working_hours: {
                              ...form.working_hours,
                              [key]: e.target.checked ? { open: '10:00', close: '22:00' } : null,
                            },
                          })
                        }
                      />
                      {closed ? 'Kapalı' : 'Açık'}
                    </label>
                    <input
                      type="time"
                      disabled={closed}
                      value={hours?.open ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          working_hours: {
                            ...form.working_hours,
                            [key]: { open: e.target.value, close: hours?.close ?? '22:00' },
                          },
                        })
                      }
                      className="col-span-3 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    <input
                      type="time"
                      disabled={closed}
                      value={hours?.close ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          working_hours: {
                            ...form.working_hours,
                            [key]: { open: hours?.open ?? '10:00', close: e.target.value },
                          },
                        })
                      }
                      className="col-span-3 rounded-md border px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <>
              <Input label="Komisyon (%)" type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} />
              <Select
                label="Abonelik Tier"
                value={form.subscription_tier}
                onChange={e => setForm({ ...form, subscription_tier: e.target.value as FormState['subscription_tier'] })}
              >
                <option value="">Abonelik yok</option>
                <option value="bronze">Bronz</option>
                <option value="silver">Gümüş</option>
                <option value="gold">Altın</option>
              </Select>
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Ödeme Yöntemleri</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.accepts_cash} onChange={e => setForm({ ...form, accepts_cash: e.target.checked })} />
                  Kapıda nakit
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.accepts_card_on_delivery} onChange={e => setForm({ ...form, accepts_card_on_delivery: e.target.checked })} />
                  Kapıda kredi kartı
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.accepts_online_payment} onChange={e => setForm({ ...form, accepts_online_payment: e.target.checked })} />
                  Online ödeme (iyzico / Garanti)
                </label>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <p className="text-sm text-gray-500">Restoran panelini bu hesap ile kullanacaklar. Şifre paylaşılacaktır.</p>
              <Input label="Sahip Adı Soyadı" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} required />
              <Input label="Sahip E-posta" type="email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} required />
              <Input label="Geçici Şifre" type="text" value={form.owner_password} onChange={e => setForm({ ...form, owner_password: e.target.value })} hint="En az 8 karakter" required />
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Geri
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            İleri <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={createMutation.isPending}>
            Restoranı Oluştur
          </Button>
        )}
      </div>
    </div>
  );
}
