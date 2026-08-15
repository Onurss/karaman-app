-- ============================================================
-- 20260605120000 — Restoran ekibi sipariş müşterisinin profilini görebilsin
-- ============================================================
-- Sorun: restoran paneli sipariş listesinde `profiles(full_name, phone)`
-- join'i yapıyor ama profiles üzerinde restoran ekibi için SELECT policy yok
-- (yalnızca users_view_own_profile + admin). Join sessizce null dönüyordu →
-- restoran sahibi müşteriyi arayamıyordu (teslimat için kritik).
--
-- Çözüm: restoran ekibi (owner/manager/staff), KENDİ restoranında siparişi
-- olan müşterilerin profilini okuyabilsin. Başka müşterilere erişim yok.
-- is_restaurant_member SECURITY DEFINER olduğundan recursion riski yok.
-- ============================================================

drop policy if exists "restaurant_team_view_order_customers" on profiles;

create policy "restaurant_team_view_order_customers" on profiles
  for select using (
    exists (
      select 1
      from orders o
      where o.user_id = profiles.id
        and public.is_restaurant_member(
          o.restaurant_id,
          array['owner', 'manager', 'staff']::text[]
        )
    )
  );

-- Policy alt-sorgusu orders.user_id üzerinden gittiği için index şart.
create index if not exists idx_orders_user_id on orders(user_id);
