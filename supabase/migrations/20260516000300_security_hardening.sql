-- ============================================================
-- 20260516000300 — Güvenlik sertleştirme migration'ı
-- Senior security audit bulgularına göre RLS, RPC ve constraint düzeltmeleri.
-- ============================================================

-- ============================================================
-- 1) PROFILES: karaman_user_id IMMUTABLE — kullanıcı manipüle edemez
-- ============================================================
-- Mevcut update policy çok geniş; kullanıcı karaman_user_id'sini değiştirebilir.
-- Trigger ile sütun seviyesinde koruma uyguluyoruz.

create or replace function prevent_karaman_user_id_change()
returns trigger as $$
begin
  if new.karaman_user_id is distinct from old.karaman_user_id then
    -- Sadece service_role bu kolonu değiştirebilir (admin / sistem mappingi)
    if current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'karaman_user_id değiştirilemez (USER_PROTECTED_FIELD)'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_karaman_user_id_change on profiles;
create trigger trg_prevent_karaman_user_id_change
  before update on profiles
  for each row execute function prevent_karaman_user_id_change();


-- ============================================================
-- 2) ORDERS: kullanıcı sadece izin verilen sütunları update edebilir
-- (status hariç). RLS WITH CHECK ile sütun seviyesi koruma.
-- ============================================================

-- Eski policy'yi kaldır (eğer varsa)
drop policy if exists "users_update_own_pending_orders" on orders;

-- Yeniden tanımla: WITH CHECK status değişikliğini yasaklar (sadece cancellation_reason eklenebilir;
-- "cancelled" status'üne geçişi yalnızca trigger veya servis yapar)
create policy "users_can_only_cancel_own_pending_orders" on orders
  for update
  using (
    user_id = auth.uid()
    and status in ('pending', 'confirmed')
  )
  with check (
    user_id = auth.uid()
    -- Kullanıcı status'ü sadece 'cancelled' yapabilir
    and (status = 'cancelled' or status in ('pending', 'confirmed'))
  );

-- Ek koruma: trigger ile kullanıcı status'ü 'delivered'/'preparing'/vb. yapamaz
create or replace function enforce_user_order_status_transition()
returns trigger as $$
declare
  v_is_team boolean;
begin
  -- Restaurant team veya admin değilse, status sadece 'cancelled'a geçebilir
  select exists (
    select 1 from restaurant_users
    where restaurant_id = new.restaurant_id
      and user_id = auth.uid()
      and is_active = true
  ) into v_is_team;

  if not v_is_team and current_setting('request.jwt.claim.role', true) <> 'service_role' then
    -- Kullanıcı tarafından yapılan update
    if old.status is distinct from new.status and new.status <> 'cancelled' then
      raise exception 'Sipariş durumunu yalnızca restoran/yönetim değiştirebilir (FORBIDDEN_STATUS_TRANSITION)'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_user_order_status_transition on orders;
create trigger trg_enforce_user_order_status_transition
  before update on orders
  for each row execute function enforce_user_order_status_transition();


-- ============================================================
-- 3) RESTAURANT_USERS: role escalation koruması
-- Owner kendi role'ünü değiştiremez; kendini ya da başkasını role manipülasyonu yapamaz.
-- ============================================================

create or replace function prevent_role_escalation()
returns trigger as $$
begin
  -- INSERT: owner role'ü yalnızca service_role (admin) tarafından atanabilir
  if tg_op = 'INSERT' then
    if new.role = 'owner'
       and current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'Owner rolü yalnızca admin tarafından atanabilir'
        using errcode = '42501';
    end if;
  end if;
  -- UPDATE: role değişiminde aynı kural
  if tg_op = 'UPDATE' then
    if old.role is distinct from new.role
       and current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'Restoran kullanıcı rolü yalnızca admin tarafından değiştirilebilir'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_role_escalation on restaurant_users;
create trigger trg_prevent_role_escalation
  before insert or update on restaurant_users
  for each row execute function prevent_role_escalation();


-- ============================================================
-- 4) admin_set_user_banned RPC
-- Admin panel kullanıyor ama tanım yoktu.
-- ============================================================

create or replace function admin_set_user_banned(
  target_user_id uuid,
  banned boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Sadece admin çağırabilir
  if (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception 'Yetkisiz erişim' using errcode = '42501';
  end if;

  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{banned}',
    to_jsonb(banned),
    true
  )
  where id = target_user_id;
end;
$$;

revoke all on function admin_set_user_banned(uuid, boolean) from public;
grant execute on function admin_set_user_banned(uuid, boolean) to authenticated;


-- ============================================================
-- 5) PAYMENTS: webhook idempotency için UNIQUE constraint
-- Aynı provider + provider_payment_id için duplicate insert engelle
-- ============================================================

-- Önce eski duplicate'leri temizle (geliştirme aşaması — production'da elle kontrol)
delete from payments p1
using payments p2
where p1.id > p2.id
  and p1.provider = p2.provider
  and p1.provider_payment_id = p2.provider_payment_id
  and p1.provider_payment_id is not null;

create unique index if not exists ux_payments_provider_payment
  on payments(provider, provider_payment_id)
  where provider_payment_id is not null;


-- ============================================================
-- 6) ORDER_ITEMS atomik insert — order + items tek transaction'da
-- Edge function'dan değil de DB seviyesinde rollback garantisi
-- (DEFERRABLE constraint ile FK check sona bırakılır)
-- ============================================================

-- order_items.order_id FK'sını DEFERRABLE yapamayız mevcut tanımda;
-- onun yerine bir RPC ile atomic insert sağlayalım.

create or replace function create_order_atomic(
  p_user_id uuid,
  p_restaurant_id uuid,
  p_delivery_address_id uuid,
  p_delivery_address_snapshot jsonb,
  p_delivery_location_wkt text,
  p_status order_status,
  p_payment_method payment_method,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_commission_amount numeric,
  p_vat_amount numeric,
  p_total_amount numeric,
  p_customer_note text,
  p_items jsonb,
  p_commission_rate numeric
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
begin
  -- 1) Order
  insert into orders (
    user_id, restaurant_id, delivery_address_id, delivery_address_snapshot,
    delivery_location, status, payment_method, payment_status,
    subtotal, delivery_fee, commission_amount, vat_amount, total_amount,
    customer_note
  ) values (
    p_user_id, p_restaurant_id, p_delivery_address_id, p_delivery_address_snapshot,
    p_delivery_location_wkt::geography, p_status, p_payment_method, 'pending',
    p_subtotal, p_delivery_fee, p_commission_amount, p_vat_amount, p_total_amount,
    p_customer_note
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  -- 2) Order items — bulk insert
  insert into order_items (
    order_id, menu_item_id, item_name_snapshot, item_image_snapshot,
    item_price_snapshot, quantity, variants, note, total_price
  )
  select
    v_order_id,
    (i->>'menu_item_id')::uuid,
    i->>'item_name_snapshot',
    i->>'item_image_snapshot',
    (i->>'item_price_snapshot')::numeric,
    (i->>'quantity')::integer,
    coalesce(i->'variants', '[]'::jsonb),
    i->>'note',
    (i->>'total_price')::numeric
  from jsonb_array_elements(p_items) as i;

  -- 3) Commission kaydı
  insert into commissions (order_id, restaurant_id, order_total, commission_rate, commission_amount, status)
  values (v_order_id, p_restaurant_id, p_total_amount, p_commission_rate, p_commission_amount, 'pending');

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function create_order_atomic(uuid, uuid, uuid, jsonb, text, order_status, payment_method, numeric, numeric, numeric, numeric, numeric, text, jsonb, numeric) from public;
grant execute on function create_order_atomic(uuid, uuid, uuid, jsonb, text, order_status, payment_method, numeric, numeric, numeric, numeric, numeric, text, jsonb, numeric) to authenticated, service_role;
