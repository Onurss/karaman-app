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
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { formatDateTime } from '@/lib/format';

const POSITIONS = [
  { value: 'home_hero', label: 'Ana Sayfa Hero' },
  { value: 'news_list', label: 'Haber Listesi' },
  { value: 'food_tab', label: 'Yemek Sekmesi' },
  { value: 'discover', label: 'Keşfet' },
] as const;

interface BannerForm {
  id?: string;
  title: string;
  image_url: string;
  click_url: string;
  position: string;
  starts_at: string;
  ends_at: string;
  display_order: number;
  is_active: boolean;
}

const empty: BannerForm = {
  title: '',
  image_url: '',
  click_url: '',
  position: 'home_hero',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16),
  display_order: 1,
  is_active: true,
};

export default function BannersPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: BannerForm) => {
      const payload = {
        title: values.title || null,
        image_url: values.image_url,
        click_url: values.click_url || null,
        position: values.position,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: new Date(values.ends_at).toISOString(),
        display_order: values.display_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from('ad_banners').update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ad_banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Banner kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ad_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Banner silindi.');
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Reklam Bannerları"
        description="Uygulamadaki reklam alanlarını yönetin."
        actions={
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Yeni Banner
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty
              title="Henüz banner yok"
              description="Yeni Banner butonu ile ilk reklamınızı ekleyin."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Başlık</TH>
                  <TH>Pozisyon</TH>
                  <TH>Başlangıç</TH>
                  <TH>Bitiş</TH>
                  <TH className="text-right">Görüntülenme</TH>
                  <TH className="text-right">Tıklama</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map(b => (
                  <TR key={b.id}>
                    <TD className="font-medium">{b.title ?? '—'}</TD>
                    <TD>{POSITIONS.find(p => p.value === b.position)?.label ?? b.position}</TD>
                    <TD>{formatDateTime(b.starts_at)}</TD>
                    <TD>{formatDateTime(b.ends_at)}</TD>
                    <TD className="text-right">{b.view_count}</TD>
                    <TD className="text-right">{b.click_count}</TD>
                    <TD>
                      <Badge tone={b.is_active ? 'success' : 'neutral'}>
                        {b.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              id: b.id,
                              title: b.title ?? '',
                              image_url: b.image_url,
                              click_url: b.click_url ?? '',
                              position: b.position,
                              starts_at: b.starts_at.slice(0, 16),
                              ends_at: b.ends_at.slice(0, 16),
                              display_order: b.display_order,
                              is_active: b.is_active,
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
                            if (confirm('Bu banner silinsin mi?')) deleteMutation.mutate(b.id);
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
        title={form.id ? 'Banner Düzenle' : 'Yeni Banner'}
        size="lg"
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label="Başlık (opsiyonel)"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Görsel URL"
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
            required
            placeholder="https://..."
          />
          <Input
            label="Tıklama URL (opsiyonel)"
            value={form.click_url}
            onChange={e => setForm({ ...form, click_url: e.target.value })}
            placeholder="https://karaman.com/..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pozisyon"
              value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })}
            >
              {POSITIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Input
              label="Sıra"
              type="number"
              value={form.display_order}
              onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Başlangıç"
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm({ ...form, starts_at: e.target.value })}
              required
            />
            <Input
              label="Bitiş"
              type="datetime-local"
              value={form.ends_at}
              onChange={e => setForm({ ...form, ends_at: e.target.value })}
              required
            />
          </div>
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
