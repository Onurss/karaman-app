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
  Textarea,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { formatDate } from '@/lib/format';

interface VersionForm {
  id?: string;
  platform: 'ios' | 'android';
  version: string;
  build_number: number;
  is_force_update: boolean;
  is_maintenance_mode: boolean;
  release_notes: string;
}

const empty: VersionForm = {
  platform: 'ios',
  version: '',
  build_number: 1,
  is_force_update: false,
  is_maintenance_mode: false,
  release_notes: '',
};

export default function AppVersionsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VersionForm>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['app-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('platform')
        .order('build_number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: VersionForm) => {
      const payload = {
        platform: values.platform,
        version: values.version,
        build_number: values.build_number,
        is_force_update: values.is_force_update,
        is_maintenance_mode: values.is_maintenance_mode,
        release_notes: values.release_notes || null,
      };
      if (values.id) {
        const { error } = await supabase.from('app_versions').update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_versions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Versiyon kaydedildi.');
      setDialogOpen(false);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'is_force_update' | 'is_maintenance_mode'; value: boolean }) => {
      const { error } = await supabase.from('app_versions').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_versions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Versiyon silindi.');
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Uygulama Versiyon Kontrol"
        description="iOS ve Android sürüm yönetimi."
        actions={
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Yeni Versiyon
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Henüz versiyon yok" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Platform</TH>
                  <TH>Versiyon</TH>
                  <TH>Build</TH>
                  <TH>Tarih</TH>
                  <TH>Zorunlu Güncelleme</TH>
                  <TH>Bakım Modu</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map(v => (
                  <TR key={v.id}>
                    <TD>
                      <Badge tone={v.platform === 'ios' ? 'info' : 'success'}>
                        {v.platform.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD className="font-mono font-medium">{v.version}</TD>
                    <TD>{v.build_number}</TD>
                    <TD className="text-gray-500">{formatDate(v.created_at)}</TD>
                    <TD>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={v.is_force_update}
                          onChange={e => toggleMutation.mutate({ id: v.id, field: 'is_force_update', value: e.target.checked })}
                        />
                        {v.is_force_update ? 'Zorunlu' : 'İsteğe Bağlı'}
                      </label>
                    </TD>
                    <TD>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={v.is_maintenance_mode}
                          onChange={e => toggleMutation.mutate({ id: v.id, field: 'is_maintenance_mode', value: e.target.checked })}
                        />
                        {v.is_maintenance_mode ? 'Bakımda' : 'Açık'}
                      </label>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              id: v.id,
                              platform: v.platform as 'ios' | 'android',
                              version: v.version,
                              build_number: v.build_number,
                              is_force_update: v.is_force_update,
                              is_maintenance_mode: v.is_maintenance_mode,
                              release_notes: v.release_notes ?? '',
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirm('Silinsin mi?') && deleteMutation.mutate(v.id)}
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
        title={form.id ? 'Versiyon Düzenle' : 'Yeni Versiyon'}
      >
        <form
          onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}
          className="space-y-4"
        >
          <Select label="Platform" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value as 'ios' | 'android' })}>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Versiyon" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" required />
            <Input label="Build No" type="number" value={form.build_number} onChange={e => setForm({ ...form, build_number: Number(e.target.value) })} required />
          </div>
          <Textarea label="Sürüm Notları" value={form.release_notes} onChange={e => setForm({ ...form, release_notes: e.target.value })} rows={3} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_force_update} onChange={e => setForm({ ...form, is_force_update: e.target.checked })} />
            Zorunlu güncelleme
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_maintenance_mode} onChange={e => setForm({ ...form, is_maintenance_mode: e.target.checked })} />
            Bakım modu
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>Kaydet</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
