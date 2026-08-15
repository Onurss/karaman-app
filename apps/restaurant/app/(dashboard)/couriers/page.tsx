'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
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
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';

interface CourierForm {
  id?: string;
  name: string;
  phone: string;
  plate_number: string;
  is_active: boolean;
}

const empty: CourierForm = { name: '', phone: '', plate_number: '', is_active: true };

export default function CouriersPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CourierForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['couriers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('restaurant_couriers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const save = useMutation({
    mutationFn: async (v: CourierForm) => {
      const payload = {
        restaurant_id: restaurantId!,
        name: v.name,
        phone: v.phone,
        plate_number: v.plate_number || null,
        is_active: v.is_active,
      };
      if (v.id) {
        const { error } = await supabase.from('restaurant_couriers').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('restaurant_couriers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Kurye kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('restaurant_couriers')
        .update({ is_active: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['couriers'] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurant_couriers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kurye silindi.');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Kuryeler"
        description="Restoranınızın kurye listesi."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yeni Kurye
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz kurye eklenmemiş" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ad Soyad</TH>
                  <TH>Telefon</TH>
                  <TH>Plaka</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD>
                      <a href={`tel:${c.phone}`} className="text-blue-600">
                        {c.phone}
                      </a>
                    </TD>
                    <TD className="font-mono">{c.plate_number ?? '—'}</TD>
                    <TD>
                      <Badge tone={c.is_active ? 'success' : 'neutral'}>
                        {c.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive.mutate({ id: c.id, value: !c.is_active })}
                        >
                          <Power
                            className={`h-4 w-4 ${c.is_active ? 'text-red-500' : 'text-green-500'}`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              id: c.id,
                              name: c.name,
                              phone: c.phone,
                              plate_number: c.plate_number ?? '',
                              is_active: c.is_active,
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
        title={form.id ? 'Kurye Düzenle' : 'Yeni Kurye'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="space-y-3"
        >
          <Input
            label="Ad Soyad"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+90..."
            required
          />
          <Input
            label="Plaka"
            value={form.plate_number}
            onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
            placeholder="70 ABC 123"
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
