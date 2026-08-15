'use client';

import { useMemo, useState } from 'react';
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
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';

const DAYS = [
  { v: 1, l: 'Pzt' },
  { v: 2, l: 'Sal' },
  { v: 3, l: 'Çar' },
  { v: 4, l: 'Per' },
  { v: 5, l: 'Cum' },
  { v: 6, l: 'Cmt' },
  { v: 7, l: 'Paz' },
];

interface TransportForm {
  id?: string;
  type: 'bus' | 'train';
  route_name: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  arrival_time: string;
  days_of_week: number[];
  operator: string;
  price: string;
  notes: string;
  is_active: boolean;
}

const empty: TransportForm = {
  type: 'bus',
  route_name: '',
  from_location: '',
  to_location: '',
  departure_time: '08:00',
  arrival_time: '12:00',
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  operator: '',
  price: '',
  notes: '',
  is_active: true,
};

export default function TransportPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TransportForm>(empty);
  const [typeFilter, setTypeFilter] = useState<'all' | 'bus' | 'train'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['transport'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_schedules')
        .select('*')
        .order('type', { ascending: true })
        .order('departure_time', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter(t => (typeFilter === 'all' ? true : t.type === typeFilter)),
    [data, typeFilter],
  );

  const saveMutation = useMutation({
    mutationFn: async (values: TransportForm) => {
      const payload = {
        type: values.type,
        route_name: values.route_name,
        from_location: values.from_location,
        to_location: values.to_location,
        departure_time: values.departure_time,
        arrival_time: values.arrival_time || null,
        days_of_week: values.days_of_week,
        operator: values.operator || null,
        price: values.price ? Number(values.price) : null,
        notes: values.notes || null,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase
          .from('transport_schedules')
          .update(payload)
          .eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transport_schedules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Sefer kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['transport'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transport_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sefer silindi.');
      queryClient.invalidateQueries({ queryKey: ['transport'] });
    },
  });

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort(),
    }));
  };

  return (
    <div>
      <PageHeader
        title="Otobüs & Tren Saatleri"
        description="Karaman'a giden seferleri yönetin."
        actions={
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Yeni Sefer
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <div className="flex gap-2">
            {(['all', 'bus', 'train'] as const).map(t => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? 'primary' : 'outline'}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'Tümü' : t === 'bus' ? 'Otobüs' : 'Tren'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <Empty title="Sefer bulunamadı" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Tip</TH>
                  <TH>Hat</TH>
                  <TH>Kalkış</TH>
                  <TH>Varış</TH>
                  <TH>Operatör</TH>
                  <TH className="text-right">Fiyat</TH>
                  <TH>Günler</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map(t => (
                  <TR key={t.id}>
                    <TD>
                      <Badge tone={t.type === 'bus' ? 'info' : 'secondary'}>
                        {t.type === 'bus' ? 'Otobüs' : 'Tren'}
                      </Badge>
                    </TD>
                    <TD className="font-medium">{t.route_name}</TD>
                    <TD>{t.departure_time}</TD>
                    <TD>{t.arrival_time ?? '—'}</TD>
                    <TD>{t.operator ?? '—'}</TD>
                    <TD className="text-right">{t.price ? `${t.price} ₺` : '—'}</TD>
                    <TD className="text-xs text-gray-500">
                      {(t.days_of_week as number[])
                        .map(d => DAYS.find(x => x.v === d)?.l)
                        .join(' ')}
                    </TD>
                    <TD>
                      <Badge tone={t.is_active ? 'success' : 'neutral'}>
                        {t.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              id: t.id,
                              type: t.type,
                              route_name: t.route_name,
                              from_location: t.from_location,
                              to_location: t.to_location,
                              departure_time: t.departure_time,
                              arrival_time: t.arrival_time ?? '',
                              days_of_week: t.days_of_week as number[],
                              operator: t.operator ?? '',
                              price: t.price ? String(t.price) : '',
                              notes: t.notes ?? '',
                              is_active: t.is_active,
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Bu sefer silinsin mi?')) deleteMutation.mutate(t.id);
                          }}
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
        title={form.id ? 'Sefer Düzenle' : 'Yeni Sefer'}
        size="lg"
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tip"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as 'bus' | 'train' })}
            >
              <option value="bus">Otobüs</option>
              <option value="train">Tren</option>
            </Select>
            <Input
              label="Hat adı"
              value={form.route_name}
              onChange={e => setForm({ ...form, route_name: e.target.value })}
              required
              placeholder="Örn. İstanbul - Karaman"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nereden"
              value={form.from_location}
              onChange={e => setForm({ ...form, from_location: e.target.value })}
              required
            />
            <Input
              label="Nereye"
              value={form.to_location}
              onChange={e => setForm({ ...form, to_location: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kalkış saati"
              type="time"
              value={form.departure_time}
              onChange={e => setForm({ ...form, departure_time: e.target.value })}
              required
            />
            <Input
              label="Varış saati"
              type="time"
              value={form.arrival_time}
              onChange={e => setForm({ ...form, arrival_time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Operatör"
              value={form.operator}
              onChange={e => setForm({ ...form, operator: e.target.value })}
              placeholder="Örn. Metro Turizm"
            />
            <Input
              label="Fiyat (₺)"
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Hizmet Günleri</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    form.days_of_week.includes(d.v)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Notlar"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
            />
            Aktif
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
