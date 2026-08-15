-- ============================================================
-- 20260604120000 — RLS policy düzeltmeleri
-- ============================================================
-- İki sınıf bug düzeltilir:
--   BUG 1 (auth.users erişimi): anon/authenticated rolleri auth.users'ı
--     SELECT edemez; admin kontrolü yapan policy'ler 42501 fırlatıp
--     ilgili tablolardaki TÜM sorguları kırar.
--   BUG 2 (restaurant_users recursion): restaurant_users policy'leri
--     kendine referans veriyor (infinite recursion → 500). Ayrıca diğer
--     tabloların policy'lerindeki inline `select ... from restaurant_users`
--     subquery'leri restaurant_users RLS'ini tekrar tetikleyip aynı
--     recursion'a yol açıyor.
--
-- Çözüm: iki SECURITY DEFINER / STABLE helper fonksiyon ile RLS'i baypas
-- ederek kontrolleri yapıyoruz ve tüm etkilenen policy'leri yeniden
-- oluşturuyoruz.
--
-- NOT: Sadece RLS POLICY'leri değiştirilir. SECURITY DEFINER fonksiyon/
-- trigger'lar (security_hardening, admin_order_cancel, delivery_zone_rpc,
-- rpc_functions) ve public-read policy'ler dokunulmadan bırakılır.
-- ============================================================

-- ============================================================
-- STEP A — helper fonksiyonlar
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable
as $$ select coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false) $$;

create or replace function public.is_restaurant_member(p_restaurant_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from restaurant_users
    where restaurant_id = p_restaurant_id and user_id = auth.uid() and is_active
      and (p_roles is null or role::text = any(p_roles))
  )
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_restaurant_member(uuid, text[]) to anon, authenticated;


-- ============================================================
-- STEP B — etkilenen policy'lerin yeniden oluşturulması
-- ============================================================

-- ------------------------------------------------------------
-- profiles  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_full_access_profiles" on profiles;
create policy "admins_full_access_profiles" on profiles
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- restaurants  (admin-fix + recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_full_access_restaurants" on restaurants;
create policy "admins_full_access_restaurants" on restaurants
  for all using (
    public.is_admin()
  );

drop policy if exists "restaurant_owners_can_update" on restaurants;
create policy "restaurant_owners_can_update" on restaurants
  for update using (
    public.is_restaurant_member(restaurants.id, array['owner', 'manager']::text[])
  );


-- ------------------------------------------------------------
-- restaurant_users  (recursion-fix self-referential + admin-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_users_view_own" on restaurant_users;
create policy "restaurant_users_view_own" on restaurant_users
  for select using (
    user_id = auth.uid()
    or public.is_restaurant_member(restaurant_users.restaurant_id, array['owner']::text[])
  );

drop policy if exists "owners_manage_restaurant_users" on restaurant_users;
create policy "owners_manage_restaurant_users" on restaurant_users
  for all using (
    public.is_restaurant_member(restaurant_users.restaurant_id, array['owner']::text[])
  );

drop policy if exists "admins_full_access_restaurant_users" on restaurant_users;
create policy "admins_full_access_restaurant_users" on restaurant_users
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- restaurant_couriers  (recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_team_manages_couriers" on restaurant_couriers;
create policy "restaurant_team_manages_couriers" on restaurant_couriers
  for all using (
    public.is_restaurant_member(restaurant_couriers.restaurant_id)
  );


-- ------------------------------------------------------------
-- menu_categories  (recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_team_manages_categories" on menu_categories;
create policy "restaurant_team_manages_categories" on menu_categories
  for all using (
    public.is_restaurant_member(menu_categories.restaurant_id)
  );


-- ------------------------------------------------------------
-- menu_items  (recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_team_manages_items" on menu_items;
create policy "restaurant_team_manages_items" on menu_items
  for all using (
    public.is_restaurant_member(menu_items.restaurant_id)
  );


-- ------------------------------------------------------------
-- orders  (recursion-fix x2 + admin-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_team_views_restaurant_orders" on orders;
create policy "restaurant_team_views_restaurant_orders" on orders
  for select using (
    public.is_restaurant_member(orders.restaurant_id)
  );

drop policy if exists "restaurant_team_updates_restaurant_orders" on orders;
create policy "restaurant_team_updates_restaurant_orders" on orders
  for update using (
    public.is_restaurant_member(orders.restaurant_id)
  );

drop policy if exists "admins_full_access_orders" on orders;
create policy "admins_full_access_orders" on orders
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- order_items  (recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "view_order_items_via_order" on order_items;
create policy "view_order_items_via_order" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid()
          or public.is_restaurant_member(o.restaurant_id)
        )
    )
  );


-- ------------------------------------------------------------
-- order_status_history  (recursion-fix)
-- ------------------------------------------------------------
drop policy if exists "view_status_history_via_order" on order_status_history;
create policy "view_status_history_via_order" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (
          o.user_id = auth.uid()
          or public.is_restaurant_member(o.restaurant_id)
        )
    )
  );


-- ------------------------------------------------------------
-- payments  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_full_access_payments" on payments;
create policy "admins_full_access_payments" on payments
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- commissions  (recursion-fix + admin-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_owners_view_commissions" on commissions;
create policy "restaurant_owners_view_commissions" on commissions
  for select using (
    public.is_restaurant_member(commissions.restaurant_id, array['owner', 'manager']::text[])
  );

drop policy if exists "admins_manage_commissions" on commissions;
create policy "admins_manage_commissions" on commissions
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- restaurant_subscriptions  (recursion-fix + admin-fix)
-- ------------------------------------------------------------
drop policy if exists "restaurant_owners_view_subscriptions" on restaurant_subscriptions;
create policy "restaurant_owners_view_subscriptions" on restaurant_subscriptions
  for select using (
    public.is_restaurant_member(restaurant_subscriptions.restaurant_id, array['owner']::text[])
  );

drop policy if exists "admins_manage_subscriptions" on restaurant_subscriptions;
create policy "admins_manage_subscriptions" on restaurant_subscriptions
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- ad_banners  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_banners" on ad_banners;
create policy "admins_manage_banners" on ad_banners
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- app_campaigns  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_campaigns" on app_campaigns;
create policy "admins_manage_campaigns" on app_campaigns
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- push_notifications  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_push" on push_notifications;
create policy "admins_manage_push" on push_notifications
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- transport_schedules  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_transport" on transport_schedules;
create policy "admins_manage_transport" on transport_schedules
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- app_versions  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_versions" on app_versions;
create policy "admins_manage_versions" on app_versions
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- water_fountains  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_water_fountains" on water_fountains;
create policy "admins_manage_water_fountains" on water_fountains
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- atms  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_atms" on atms;
create policy "admins_manage_atms" on atms
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- charging_stations  (admin-fix)
-- ------------------------------------------------------------
drop policy if exists "admins_manage_charging_stations" on charging_stations;
create policy "admins_manage_charging_stations" on charging_stations
  for all using (
    public.is_admin()
  );


-- ------------------------------------------------------------
-- storage.objects  (recursion-fix — inline restaurant_users subquery)
-- restaurant_id, dosya yolundan türetilir (storage.foldername).
-- Public-read ve admin (jwt) policy'leri DEĞİŞTİRİLMEZ.
-- ------------------------------------------------------------
drop policy if exists "menu_images_restaurant_team_write" on storage.objects;
create policy "menu_images_restaurant_team_write"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and public.is_restaurant_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "menu_images_restaurant_team_delete" on storage.objects;
create policy "menu_images_restaurant_team_delete"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and public.is_restaurant_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "menu_images_restaurant_team_update" on storage.objects;
create policy "menu_images_restaurant_team_update"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and public.is_restaurant_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "restaurant_assets_team_write" on storage.objects;
create policy "restaurant_assets_team_write"
  on storage.objects for insert
  with check (
    bucket_id = 'restaurant-assets'
    and public.is_restaurant_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "restaurant_assets_team_delete" on storage.objects;
create policy "restaurant_assets_team_delete"
  on storage.objects for delete
  using (
    bucket_id = 'restaurant-assets'
    and public.is_restaurant_member(((storage.foldername(name))[1])::uuid)
  );
