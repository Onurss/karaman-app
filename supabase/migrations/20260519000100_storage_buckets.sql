-- ============================================================
-- 20260519000100 — Storage bucket'ları + erişim politikaları
-- Restoran panel ve admin paneli için görsel yükleme altyapısı.
-- ============================================================

-- ============================================================
-- 1) menu-images bucket
-- - Restoran sahibi/yöneticisi: kendi restoranının menüsünde insert/update/delete
-- - Public read (mobile uygulama için)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Public read
create policy "menu_images_public_read"
  on storage.objects for select
  using (bucket_id = 'menu-images');

-- Restoran team upload: path formatı `restaurants/<restaurant_id>/menu/<filename>`
create policy "menu_images_restaurant_team_write"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and exists (
      select 1 from restaurant_users
      where restaurant_id = ((storage.foldername(name))[2])::uuid
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "menu_images_restaurant_team_delete"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and exists (
      select 1 from restaurant_users
      where restaurant_id = ((storage.foldername(name))[2])::uuid
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "menu_images_restaurant_team_update"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and exists (
      select 1 from restaurant_users
      where restaurant_id = ((storage.foldername(name))[2])::uuid
        and user_id = auth.uid()
        and is_active = true
    )
  );

-- ============================================================
-- 2) restaurant-assets bucket — logo + kapak görsel
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-assets',
  'restaurant-assets',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "restaurant_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'restaurant-assets');

create policy "restaurant_assets_team_write"
  on storage.objects for insert
  with check (
    bucket_id = 'restaurant-assets'
    and exists (
      select 1 from restaurant_users
      where restaurant_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "restaurant_assets_team_delete"
  on storage.objects for delete
  using (
    bucket_id = 'restaurant-assets'
    and exists (
      select 1 from restaurant_users
      where restaurant_id = ((storage.foldername(name))[1])::uuid
        and user_id = auth.uid()
        and is_active = true
    )
  );

-- Admin tam yetki (raw_app_meta_data->>role = 'admin')
create policy "storage_admin_full_access"
  on storage.objects for all
  using (
    bucket_id in ('menu-images', 'restaurant-assets')
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- ============================================================
-- 3) admin_delete_restaurant RPC — kaskat silme + cleanup
-- Admin panelden restoran silme. RLS yerine RPC ile kontrol.
-- ============================================================
create or replace function admin_delete_restaurant(
  target_restaurant_id uuid,
  delete_active_orders boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
begin
  -- Sadece admin
  if (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception 'Yetkisiz erişim' using errcode = '42501';
  end if;

  -- Aktif sipariş var mı?
  select count(*) into v_active_count
  from orders
  where restaurant_id = target_restaurant_id
    and status not in ('delivered', 'cancelled');

  if v_active_count > 0 and not delete_active_orders then
    raise exception
      'Restoranda % aktif sipariş var. Önce siparişleri tamamlayın veya delete_active_orders=true gönderin.',
      v_active_count
      using errcode = 'P0001';
  end if;

  -- Aktif siparişleri iptal et (admin müdahalesi)
  if v_active_count > 0 and delete_active_orders then
    update orders
    set status = 'cancelled',
        cancellation_reason = 'Restoran admin tarafından silindi'
    where restaurant_id = target_restaurant_id
      and status not in ('delivered', 'cancelled');
  end if;

  -- Restoran kaydını sil — CASCADE ile menü, kategoriler, kuryeler,
  -- restaurant_users, commissions silinir (FK on delete cascade).
  -- Geçmiş siparişler kalır (FK no action) — finansal kayıt önemli.
  delete from restaurants where id = target_restaurant_id;
end;
$$;

revoke all on function admin_delete_restaurant(uuid, boolean) from public;
grant execute on function admin_delete_restaurant(uuid, boolean) to authenticated;
