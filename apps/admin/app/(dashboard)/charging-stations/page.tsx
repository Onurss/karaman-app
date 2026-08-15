'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { KARAMAN_CENTER, KARAMAN_DISTRICTS } from '@karaman/utils';
import { LocationPicker } from '@/components/ui/location-picker';

const DEFAULT_POWER_KW = 22;

const SOCKETS = ['type1', 'type2', 'ccs', 'chademo', 'tesla'] as const;
const SOCKET_LABEL: Record<string, string> = {
  type1: 'Type 1',
  type2: 'Type 2',
  ccs: 'CCS',
  chademo: 'CHAdeMO',
  tesla: 'Tesla',
};

interface ChargingForm {
  id?: string;
  name: string;
  operator: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  socket_types: string[];
  power_kw: string;
  is_active: boolean;
  notes: string;
}

const empty: ChargingForm = {
  name: '',
  operator: '',
  address: '',
  district: KARAMAN_DISTRICTS[0],
  lat: String(KARAMAN_CENTER.lat),
  lng: String(KARAMAN_CENTER.lng),
  socket_types: ['type2'],
  power_kw: String(DEFAULT_POWER_KW),
  is_active: true,
  notes: '',
};

export default function ChargingStationsAdminPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ChargingForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-charging-stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charging_stations_view')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (v: ChargingForm) => {
      const payload = {
        name: v.name,
        operator: v.operator || null,
        address: v.address,
        district: v.district,
        location: `SRID=4326;POINT(${v.lng} ${v.lat})`,
        socket_types: v.socket_types,
        power_kw: Number(v.power_kw),
        is_active: v.is_active,
        notes: v.notes || null,
      };
      if (v.id) {
        const { error } = await supabase.from('charging_stations').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('charging_stations').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Şarj istasyonu kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['admin-charging-stations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('charging_stations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Silindi.');
      queryClient.invalidateQueries({ queryKey: ['admin-charging-stations'] });
    },
  });

  const toggleSocket = (s: string) => {
    setForm((f) => ({
      ...f,
      socket_types: f.socket_types.includes(s)
        ? f.socket_types.filter((x) => x !== s)
        : [...f.socket_types, s],
    }));
  };

  return (
    <div>
      <PageHeader
        title="Şarj İstasyonları"
        description="Elektrikli araç şarj istasyonlarını yönetin."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yeni İstasyon
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz şarj istasyonu yok" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Adı</TH>
                  <TH>Operatör</TH>
                  <TH>İlçe</TH>
                  <TH>Soket Tipleri</TH>
                  <TH className="text-right">Güç</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD>{c.operator ?? '—'}</TD>
                    <TD>{c.district}</TD>
                    <TD className="text-xs">
                      <div className="flex gap-1">
                        {(c.socket_types as string[]).map((s) => (
                          <Badge key={s} tone="neutral">
                            {SOCKET_LABEL[s] ?? s}
                          </Badge>
                        ))}
                      </div>
                    </TD>
                    <TD className="text-right font-medium">{c.power_kw} kW</TD>
                    <TD>
                      <Badge tone={c.is_active ? 'success' : 'danger'}>
                        {c.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const loc = c.location as { lat: number; lng: number };
                            setForm({
                              id: c.id,
                              name: c.name,
                              operator: c.operator ?? '',
                              address: c.address,
                              district: c.district,
                              lat: String(loc.lat),
                              lng: String(loc.lng),
                              socket_types: c.socket_types as string[],
                              power_kw: String(c.power_kw),
                              is_active: c.is_active,
                              notes: c.notes ?? '',
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirm('Silinsin mi?') && del.mutate(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? 'İstasyon Düzenle' : 'Yeni Şarj İstasyonu'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="space-y-3"
        >
          <Input
            label="Adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Operatör"
            value={form.operator}
            onChange={(e) => setForm({ ...form, operator: e.target.value })}
            placeholder="Örn. ZES, Eşarj, Trugo"
          />
          <Input
            label="Adres"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Konum (haritadan işaretleyin)
            </label>
            <LocationPicker
              lat={Number(form.lat)}
              lng={Number(form.lng)}
              onChange={(loc) =>
                setForm((f) => ({
                  ...f,
                  lat: String(loc.lat),
                  lng: String(loc.lng),
                  address: loc.address ?? f.address,
                  district:
                    loc.district && (KARAMAN_DISTRICTS as readonly string[]).includes(loc.district)
                      ? loc.district
                      : f.district,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="İlçe"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              required
            />
            <Input
              label="Enlem"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              required
            />
            <Input
              label="Boylam"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              required
            />
          </div>
          <Input
            label="Güç (kW)"
            type="number"
            value={form.power_kw}
            onChange={(e) => setForm({ ...form, power_kw: e.target.value })}
            required
          />

          <div>
            <p className="mb-1.5 text-sm font-medium">Soket Tipleri</p>
            <div className="flex flex-wrap gap-2">
              {SOCKETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSocket(s)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    form.socket_types.includes(s)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {SOCKET_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Notlar"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Aktif
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
