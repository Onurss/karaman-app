'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogFooter,
  Empty,
  ImageUpload,
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
import { useCurrentRestaurant } from '@/lib/hooks/use-restaurant';
import { formatCurrency } from '@/lib/format';
import type { MenuItemVariantGroup } from '@karaman/shared-types';

interface CategoryForm {
  id?: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface ItemForm {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  ingredients: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  is_campaign: boolean;
  original_price: string;
  variants: MenuItemVariantGroup[];
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.round(performance.now() * 1000)}-${Math.floor(performance.now())}`;
}

const EMPTY_ITEM: ItemForm = {
  category_id: '',
  name: '',
  description: '',
  price: '',
  image_url: '',
  ingredients: '',
  is_available: true,
  is_vegetarian: false,
  is_spicy: false,
  is_campaign: false,
  original_price: '',
  variants: [],
};

export default function MenuPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const restaurantQuery = useCurrentRestaurant();
  const restaurantId = restaurantQuery.data?.restaurant_id;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: '',
    display_order: 1,
    is_active: true,
  });
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);

  const categoriesQuery = useQuery({
    queryKey: ['menu-categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order');
      if (error) throw error;
      if (!activeCategoryId && data && data.length > 0) {
        setActiveCategoryId(data[0].id);
      }
      return data;
    },
    enabled: !!restaurantId,
  });

  const itemsQuery = useQuery({
    queryKey: ['menu-items', activeCategoryId],
    queryFn: async () => {
      if (!activeCategoryId) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category_id', activeCategoryId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!activeCategoryId,
  });

  const saveCategory = useMutation({
    mutationFn: async (v: CategoryForm) => {
      const payload = {
        restaurant_id: restaurantId!,
        name: v.name,
        display_order: v.display_order,
        is_active: v.is_active,
      };
      if (v.id) {
        const { error } = await supabase.from('menu_categories').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Kategori kaydedildi.');
      setCategoryDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });

  const reorderCategory = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const cats = categoriesQuery.data ?? [];
      const idx = cats.findIndex((c) => c.id === id);
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= cats.length) return;
      const a = cats[idx];
      const b = cats[targetIdx];
      await Promise.all([
        supabase.from('menu_categories').update({ display_order: b.display_order }).eq('id', a.id),
        supabase.from('menu_categories').update({ display_order: a.display_order }).eq('id', b.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-categories'] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kategori silindi.');
      setActiveCategoryId(null);
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });

  const saveItem = useMutation({
    mutationFn: async (v: ItemForm) => {
      const payload = {
        restaurant_id: restaurantId!,
        category_id: v.category_id,
        name: v.name,
        description: v.description || null,
        price: Number(v.price),
        image_url: v.image_url || null,
        ingredients: v.ingredients
          ? v.ingredients
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        is_available: v.is_available,
        is_vegetarian: v.is_vegetarian,
        is_spicy: v.is_spicy,
        is_campaign: v.is_campaign,
        original_price: v.is_campaign && v.original_price ? Number(v.original_price) : null,
        variants: v.variants,
      };
      if (v.id) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Ürün kaydedildi.');
      setItemDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAvailable = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ürün silindi.');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
  });

  return (
    <div>
      <PageHeader title="Menü Yönetimi" description="Kategori ve ürünleri yönetin." />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold">Kategoriler</p>
              <Button
                size="sm"
                onClick={() => {
                  setCategoryForm({
                    name: '',
                    display_order: (categoriesQuery.data?.length ?? 0) + 1,
                    is_active: true,
                  });
                  setCategoryDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {!categoriesQuery.data || categoriesQuery.data.length === 0 ? (
              <Empty title="Henüz kategori yok" />
            ) : (
              categoriesQuery.data.map((c, idx, arr) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-md p-2 cursor-pointer ${
                    activeCategoryId === c.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <div className="opacity-0 group-hover:opacity-100">
                    {idx > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderCategory.mutate({ id: c.id, direction: 'up' });
                        }}
                        className="p-1"
                      >
                        <ChevronUp className="h-3 w-3 text-gray-500" />
                      </button>
                    ) : null}
                    {idx < arr.length - 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderCategory.mutate({ id: c.id, direction: 'down' });
                        }}
                        className="p-1"
                      >
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryForm({
                          id: c.id,
                          name: c.name,
                          display_order: c.display_order,
                          is_active: c.is_active,
                        });
                        setCategoryDialogOpen(true);
                      }}
                      className="p-1"
                    >
                      <Pencil className="h-3 w-3 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Kategori silinsin mi?')) deleteCategory.mutate(c.id);
                      }}
                      className="p-1"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <p className="text-sm font-semibold">
                {categoriesQuery.data?.find((c) => c.id === activeCategoryId)?.name ?? 'Ürünler'}
              </p>
              {activeCategoryId ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setItemForm({ ...EMPTY_ITEM, category_id: activeCategoryId });
                    setItemDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Ürün Ekle
                </Button>
              ) : null}
            </div>
            {!itemsQuery.data || itemsQuery.data.length === 0 ? (
              <Empty title="Bu kategoride henüz ürün yok" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Ürün</TH>
                    <TH>Açıklama</TH>
                    <TH className="text-right">Fiyat</TH>
                    <TH>Durum</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {itemsQuery.data.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">
                        <div className="flex items-center gap-2">
                          {it.name}
                          {it.is_vegetarian ? <Badge tone="success">🌱</Badge> : null}
                          {it.is_spicy ? <Badge tone="danger">🌶</Badge> : null}
                          {it.is_campaign ? <Badge tone="warning">Kampanya</Badge> : null}
                        </div>
                      </TD>
                      <TD className="line-clamp-1 max-w-[280px] text-sm text-gray-500">
                        {it.description ?? '—'}
                      </TD>
                      <TD className="text-right font-medium">
                        {it.is_campaign && it.original_price != null ? (
                          <span className="mr-1 text-xs font-normal text-gray-400 line-through">
                            {formatCurrency(it.original_price)}
                          </span>
                        ) : null}
                        {formatCurrency(it.price)}
                      </TD>
                      <TD>
                        <Badge tone={it.is_available ? 'success' : 'neutral'}>
                          {it.is_available ? 'Stokta' : 'Stokta Yok'}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              toggleAvailable.mutate({ id: it.id, value: !it.is_available })
                            }
                            title={it.is_available ? 'Stoktan kaldır' : 'Stoğa al'}
                          >
                            {it.is_available ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setItemForm({
                                id: it.id,
                                category_id: it.category_id,
                                name: it.name,
                                description: it.description ?? '',
                                price: String(it.price),
                                image_url: it.image_url ?? '',
                                ingredients: (it.ingredients as string[]).join(', '),
                                is_available: it.is_available,
                                is_vegetarian: it.is_vegetarian,
                                is_spicy: it.is_spicy,
                                is_campaign: it.is_campaign ?? false,
                                original_price:
                                  it.original_price != null ? String(it.original_price) : '',
                                variants: (it.variants as MenuItemVariantGroup[] | null) ?? [],
                              });
                              setItemDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirm('Silinsin mi?') && deleteItem.mutate(it.id)}
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
      </div>

      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        title={categoryForm.id ? 'Kategori Düzenle' : 'Yeni Kategori'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveCategory.mutate(categoryForm);
          }}
          className="space-y-3"
        >
          <Input
            label="Kategori Adı"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
          />
          <Input
            label="Sıra"
            type="number"
            value={categoryForm.display_order}
            onChange={(e) =>
              setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={categoryForm.is_active}
              onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
            />
            Aktif
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" isLoading={saveCategory.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        title={itemForm.id ? 'Ürün Düzenle' : 'Yeni Ürün'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveItem.mutate(itemForm);
          }}
          className="space-y-3"
        >
          <Input
            label="Ürün Adı"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Açıklama"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            rows={3}
          />
          <Input
            label="Fiyat (₺)"
            type="number"
            step="0.01"
            value={itemForm.price}
            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
            required
          />

          {/* Kampanya — restoran detayında "Kampanyalar" bölümünde gösterilir */}
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={itemForm.is_campaign}
                onChange={(e) => setItemForm({ ...itemForm, is_campaign: e.target.checked })}
              />
              Kampanya ürünü
            </label>
            {itemForm.is_campaign ? (
              <>
                <Input
                  label="Eski fiyat (üstü çizili ₺)"
                  type="number"
                  step="0.01"
                  value={itemForm.original_price}
                  onChange={(e) => setItemForm({ ...itemForm, original_price: e.target.value })}
                  placeholder="Örn. 900"
                />
                <p className="text-xs text-gray-500">
                  Yukarıdaki “Fiyat” indirimli (yeni) fiyattır; eski fiyat üstü çizili gösterilir.
                </p>
              </>
            ) : null}
          </div>
          {restaurantId ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ürün Görseli</label>
              <ImageUpload
                bucket="menu-images"
                pathPrefix={`restaurants/${restaurantId}/menu`}
                value={itemForm.image_url}
                onChange={(url) => setItemForm({ ...itemForm, image_url: url ?? '' })}
              />
            </div>
          ) : null}
          <Input
            label="İçindekiler (virgülle ayırın)"
            value={itemForm.ingredients}
            onChange={(e) => setItemForm({ ...itemForm, ingredients: e.target.value })}
            placeholder="Domates, mozarella, fesleğen"
          />
          <p className="text-xs text-gray-500">
            Müşteri, ürün ekranında bu malzemeleri çıkarabilir.
          </p>

          {/* Seçenek grupları — Ekstra Malzeme, Yan Ürünler, Boy vb. */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Seçenek Grupları</p>
                <p className="text-xs text-gray-500">
                  Ekstra malzeme, yan ürün, boy gibi ücretli seçenekler.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setItemForm((f) => ({
                    ...f,
                    variants: [
                      ...f.variants,
                      { id: genId(), name: '', required: false, multi_select: true, options: [] },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Grup
              </Button>
            </div>

            {itemForm.variants.length === 0 ? (
              <p className="text-xs text-gray-400">Henüz seçenek grubu yok.</p>
            ) : null}

            {itemForm.variants.map((g, gi) => (
              <div key={g.id} className="space-y-2 rounded-md bg-gray-50 p-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={g.name}
                    placeholder="Grup adı (örn. Ekstra Malzeme)"
                    onChange={(e) =>
                      setItemForm((f) => {
                        const variants = [...f.variants];
                        variants[gi] = { ...variants[gi], name: e.target.value };
                        return { ...f, variants };
                      })
                    }
                  />
                  <button
                    type="button"
                    className="p-1"
                    onClick={() =>
                      setItemForm((f) => ({
                        ...f,
                        variants: f.variants.filter((_, i) => i !== gi),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>

                <div className="flex gap-4 text-xs text-gray-600">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={g.required}
                      onChange={(e) =>
                        setItemForm((f) => {
                          const variants = [...f.variants];
                          variants[gi] = { ...variants[gi], required: e.target.checked };
                          return { ...f, variants };
                        })
                      }
                    />
                    Zorunlu
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={g.multi_select}
                      onChange={(e) =>
                        setItemForm((f) => {
                          const variants = [...f.variants];
                          variants[gi] = { ...variants[gi], multi_select: e.target.checked };
                          return { ...f, variants };
                        })
                      }
                    />
                    Çoklu seçim
                  </label>
                </div>

                {g.options.map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Input
                      value={o.name}
                      placeholder="Seçenek adı"
                      onChange={(e) =>
                        setItemForm((f) => {
                          const variants = [...f.variants];
                          const options = [...variants[gi].options];
                          options[oi] = { ...options[oi], name: e.target.value };
                          variants[gi] = { ...variants[gi], options };
                          return { ...f, variants };
                        })
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      className="w-28"
                      value={String(o.price_delta)}
                      placeholder="+₺"
                      onChange={(e) =>
                        setItemForm((f) => {
                          const variants = [...f.variants];
                          const options = [...variants[gi].options];
                          options[oi] = {
                            ...options[oi],
                            price_delta: Number(e.target.value) || 0,
                          };
                          variants[gi] = { ...variants[gi], options };
                          return { ...f, variants };
                        })
                      }
                    />
                    <button
                      type="button"
                      className="p-1"
                      onClick={() =>
                        setItemForm((f) => {
                          const variants = [...f.variants];
                          variants[gi] = {
                            ...variants[gi],
                            options: variants[gi].options.filter((_, i) => i !== oi),
                          };
                          return { ...f, variants };
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setItemForm((f) => {
                      const variants = [...f.variants];
                      variants[gi] = {
                        ...variants[gi],
                        options: [
                          ...variants[gi].options,
                          { id: genId(), name: '', price_delta: 0 },
                        ],
                      };
                      return { ...f, variants };
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Seçenek
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.is_available}
                onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
              />
              Stokta
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.is_vegetarian}
                onChange={(e) => setItemForm({ ...itemForm, is_vegetarian: e.target.checked })}
              />
              Vejetaryen
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.is_spicy}
                onChange={(e) => setItemForm({ ...itemForm, is_spicy: e.target.checked })}
              />
              Acılı
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" isLoading={saveItem.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
