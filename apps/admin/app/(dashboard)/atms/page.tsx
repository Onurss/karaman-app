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

interface AtmForm {
  id?: string;
  bank_name: string;
  branch_name: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  is_24_7: boolean;
  is_active: boolean;
  notes: string;
}

const empty: AtmForm = {
  bank_name: '',
  branch_name: '',
  address: '',
  district: KARAMAN_DISTRICTS[0],
  lat: String(KARAMAN_CENTER.lat),
  lng: String(KARAMAN_CENTER.lng),
  is_24_7: true,
  is_active: true,
  notes: '',
};

export default function AtmsAdminPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AtmForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-atms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atms_view')
        .select('*')
        .order('bank_name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (v: AtmForm) => {
      const payload = {
        bank_name: v.bank_name,
        branch_name: v.branch_name || null,
        address: v.address,
        district: v.district,
        location: `SRID=4326;POINT(${v.lng} ${v.lat})`,
        is_24_7: v.is_24_7,
        is_active: v.is_active,
        notes: v.notes || null,
      };
      if (v.id) {
        const { error } = await supabase.from('atms').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('atms').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('ATM kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['admin-atms'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('atms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ATM silindi.');
      queryClient.invalidateQueries({ queryKey: ['admin-atms'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="ATM'ler"
        description="Karaman'daki banka ATM'lerini yönetin."
        actions={
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Yeni ATM
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz ATM eklenmemiş" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Banka</TH>
                  <TH>Şube</TH>
                  <TH>İlçe</TH>
                  <TH>Adres</TH>
                  <TH>7/24</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map(a => (
                  <TR key={a.id}>
                    <TD className="font-medium">{a.bank_name}</TD>
                    <TD>{a.branch_name ?? '—'}</TD>
                    <TD>{a.district}</TD>
                    <TD className="text-sm text-gray-600">{a.address}</TD>
                    <TD>
                      <Badge tone={a.is_24_7 ? 'success' : 'neutral'}>
                        {a.is_24_7 ? '7/24' : 'Mesai'}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={a.is_active ? 'success' : 'danger'}>
                        {a.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const loc = a.location as { lat: number; lng: number };
                            setForm({
                              id: a.id,
                              bank_name: a.bank_name,
                              branch_name: a.branch_name ?? '',
                              address: a.address,
                              district: a.district,
                              lat: String(loc.lat),
                              lng: String(loc.lng),
                              is_24_7: a.is_24_7,
                              is_active: a.is_active,
                              notes: a.notes ?? '',
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirm('Silinsin mi?') && del.mutate(a.id)}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={form.id ? 'ATM Düzenle' : 'Yeni ATM'}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
          <Input label="Banka" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} required />
          <Input label="Şube" value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} />
          <Input label="Adres" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
          <Input label="İlçe" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} required />

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

          <div className="grid grid-cols-2 gap-3">
            <Input label="Enlem" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} required />
            <Input label="Boylam" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} required />
          </div>
          <Textarea label="Notlar" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_24_7} onChange={e => setForm({ ...form, is_24_7: e.target.checked })} />
            7/24 hizmet
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Aktif
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" isLoading={save.isPending}>Kaydet</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
