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
import { formatDateTime } from '@/lib/format';

interface CampaignForm {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  target_screen: string;
  starts_at: string;
  ends_at: string;
  display_order: number;
  is_active: boolean;
}

const empty: CampaignForm = {
  title: '',
  description: '',
  image_url: '',
  target_screen: '',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16),
  display_order: 1,
  is_active: true,
};

export default function CampaignsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['app-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_campaigns')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CampaignForm) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        image_url: values.image_url || null,
        target_screen: values.target_screen || null,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: new Date(values.ends_at).toISOString(),
        display_order: values.display_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from('app_campaigns').update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Kampanya kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['app-campaigns'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kampanya silindi.');
      queryClient.invalidateQueries({ queryKey: ['app-campaigns'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Uygulama Kampanyaları"
        description="App içi kampanya ve promosyonları yönetin."
        actions={
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Yeni Kampanya
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz kampanya yok" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Başlık</TH>
                  <TH>Hedef Ekran</TH>
                  <TH>Başlangıç</TH>
                  <TH>Bitiş</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map(c => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.title}</TD>
                    <TD>{c.target_screen ?? '—'}</TD>
                    <TD>{formatDateTime(c.starts_at)}</TD>
                    <TD>{formatDateTime(c.ends_at)}</TD>
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
                          onClick={() => {
                            setForm({
                              id: c.id,
                              title: c.title,
                              description: c.description ?? '',
                              image_url: c.image_url ?? '',
                              target_screen: c.target_screen ?? '',
                              starts_at: c.starts_at.slice(0, 16),
                              ends_at: c.ends_at.slice(0, 16),
                              display_order: c.display_order,
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
                          onClick={() => {
                            if (confirm('Bu kampanya silinsin mi?')) deleteMutation.mutate(c.id);
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
        title={form.id ? 'Kampanya Düzenle' : 'Yeni Kampanya'}
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
            label="Başlık"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Açıklama"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Input
            label="Görsel URL"
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
          />
          <Input
            label="Hedef Ekran (örn. /yemek, /karaman)"
            value={form.target_screen}
            onChange={e => setForm({ ...form, target_screen: e.target.value })}
          />
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sıra"
              type="number"
              value={form.display_order}
              onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
              min={1}
            />
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
              />
              Aktif
            </label>
          </div>

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
