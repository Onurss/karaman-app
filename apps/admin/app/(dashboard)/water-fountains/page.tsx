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

interface WaterForm {
  id?: string;
  name: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  is_active: boolean;
  notes: string;
}

const empty: WaterForm = {
  name: '',
  address: '',
  district: KARAMAN_DISTRICTS[0],
  lat: String(KARAMAN_CENTER.lat),
  lng: String(KARAMAN_CENTER.lng),
  is_active: true,
  notes: '',
};

export default function WaterFountainsAdminPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<WaterForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-water-fountains'],
    queryFn: async () => {
      const { data, error } = await supabase.from('water_fountains_view').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (v: WaterForm) => {
      const payload = {
        name: v.name,
        address: v.address,
        district: v.district,
        location: `SRID=4326;POINT(${v.lng} ${v.lat})`,
        is_active: v.is_active,
        notes: v.notes || null,
      };
      if (v.id) {
        const { error } = await supabase.from('water_fountains').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('water_fountains').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Su veznesi kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['admin-water-fountains'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('water_fountains').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Silindi.');
      queryClient.invalidateQueries({ queryKey: ['admin-water-fountains'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Su Vezneleri"
        description="Karaman'daki içme suyu çeşmelerini yönetin."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yeni Su Veznesi
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz su veznesi yok" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Adı</TH>
                  <TH>İlçe</TH>
                  <TH>Adres</TH>
                  <TH>Not</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((w) => (
                  <TR key={w.id}>
                    <TD className="font-medium">{w.name}</TD>
                    <TD>{w.district}</TD>
                    <TD className="text-sm text-gray-600">{w.address}</TD>
                    <TD className="text-sm text-gray-500">{w.notes ?? '—'}</TD>
                    <TD>
                      <Badge tone={w.is_active ? 'success' : 'danger'}>
                        {w.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const loc = w.location as { lat: number; lng: number };
                            setForm({
                              id: w.id,
                              name: w.name,
                              address: w.address,
                              district: w.district,
                              lat: String(loc.lat),
                              lng: String(loc.lng),
                              is_active: w.is_active,
                              notes: w.notes ?? '',
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirm('Silinsin mi?') && del.mutate(w.id)}
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
        title={form.id ? 'Su Veznesi Düzenle' : 'Yeni Su Veznesi'}
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
            label="Adres"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
          <Input
            label="İlçe"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
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

          <div className="grid grid-cols-2 gap-3">
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
