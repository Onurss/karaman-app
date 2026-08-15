'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
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
import { formatCurrency } from '@/lib/format';

interface RestaurantRow {
  id: string;
  name: string;
  phone: string;
  district: string;
  cuisine_types: string[];
  subscription_tier: string | null;
  min_order_amount: number;
  commission_rate: number;
  is_active: boolean;
}

export default function RestaurantsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteTarget, setDeleteTarget] = useState<RestaurantRow | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurants', search, activeFilter],
    queryFn: async () => {
      let q = supabase.from('restaurants').select('*').order('name');
      if (activeFilter === 'active') q = q.eq('is_active', true);
      if (activeFilter === 'inactive') q = q.eq('is_active', false);
      if (search) q = q.ilike('name', `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Durum güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }: { id: string; force: boolean }) => {
      const { error } = await supabase.rpc('admin_delete_restaurant', {
        target_restaurant_id: id,
        delete_active_orders: force,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success('Restoran silindi.');
      setDeleteTarget(null);
      setForceDelete(false);
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      void vars;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Restoranlar"
        description="Yemek modülündeki restoran kayıtları."
        actions={
          <Link href="/restaurants/new">
            <Button>
              <Plus className="h-4 w-4" /> Yeni Restoran
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Restoran adı ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">Tüm restoranlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>
          ) : !data || data.length === 0 ? (
            <Empty title="Restoran bulunamadı" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>İsim</TH>
                  <TH>Telefon</TH>
                  <TH>İlçe</TH>
                  <TH>Mutfak</TH>
                  <TH>Abonelik</TH>
                  <TH className="text-right">Min Sipariş</TH>
                  <TH className="text-right">Komisyon %</TH>
                  <TH>Durum</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-gray-600">{r.phone}</TD>
                    <TD>{r.district}</TD>
                    <TD className="text-xs text-gray-500">
                      {(r.cuisine_types as string[]).join(', ')}
                    </TD>
                    <TD>
                      {r.subscription_tier ? (
                        <Badge
                          tone={
                            r.subscription_tier === 'gold'
                              ? 'warning'
                              : r.subscription_tier === 'silver'
                                ? 'info'
                                : 'neutral'
                          }
                        >
                          {r.subscription_tier === 'gold'
                            ? 'Altın'
                            : r.subscription_tier === 'silver'
                              ? 'Gümüş'
                              : 'Bronz'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TD>
                    <TD className="text-right">{formatCurrency(r.min_order_amount)}</TD>
                    <TD className="text-right">%{r.commission_rate}</TD>
                    <TD>
                      <Badge tone={r.is_active ? 'success' : 'danger'}>
                        {r.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Link href={`/restaurants/${r.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleMutation.mutate({ id: r.id, value: !r.is_active })}
                          title={r.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                        >
                          <Power
                            className={`h-4 w-4 ${r.is_active ? 'text-red-500' : 'text-green-500'}`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(r as RestaurantRow)}
                          title="Sil"
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
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setForceDelete(false);
        }}
        title="Restoranı sil"
        description={
          deleteTarget ? `"${deleteTarget.name}" silinecek. Bu işlem geri alınamaz.` : undefined
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Dikkat:</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Menü, kategori, kurye kayıtları silinir.</li>
              <li>Restoran kullanıcı yetkileri kaldırılır.</li>
              <li>Geçmiş siparişler korunur (finansal kayıt için).</li>
              <li>
                Aktif siparişler varsa silinmez — &quot;Aktif siparişleri iptal ederek devam
                et&quot; seçeneğini işaretleyin.
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="mt-0.5"
            />
            <span>Aktif siparişleri iptal ederek devam et</span>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteTarget(null);
              setForceDelete(false);
            }}
          >
            Vazgeç
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() =>
              deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, force: forceDelete })
            }
          >
            <Trash2 className="h-4 w-4" /> Kalıcı Olarak Sil
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
