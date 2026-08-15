-- ============================================================
-- Admin sipariş iptali / iade RPC'leri
--
-- Sözleşmede "Sipariş yönetimi (iptal/iade dahil)" maddesi için
-- gerekli. enforce_user_order_status_transition trigger'ı user
-- rolünün direkt status değiştirmesini engelliyor; admin değişikliği
-- security definer RPC ile yapılır.
-- ============================================================

create or replace function admin_cancel_order(
  p_order_id uuid,
  p_reason text,
  p_refund boolean default false
) returns void as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_status order_status;
  v_payment_status payment_status;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Yetkisiz erişim.';
  end if;

  -- Admin yetki kontrolü — auth.users.raw_app_meta_data.role = 'admin'
  select coalesce(
    (select raw_app_meta_data->>'role' from auth.users where id = v_user_id) = 'admin',
    false
  ) into v_is_admin;
  if not v_is_admin then
    raise exception 'Bu işlem yalnızca admin tarafından yapılabilir.';
  end if;

  select status, payment_status into v_status, v_payment_status
    from orders where id = p_order_id;
  if v_status is null then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Sipariş zaten iptal edilmiş.';
  end if;
  if v_status = 'delivered' then
    raise exception 'Teslim edilmiş sipariş iptal edilemez.';
  end if;

  update orders
    set status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        payment_status = case
          when p_refund and v_payment_status = 'paid' then 'refunded'::payment_status
          else payment_status
        end
    where id = p_order_id;

  -- Status history kaydı (varsa)
  insert into order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, v_status, 'cancelled', v_user_id, coalesce(p_reason, 'Admin iptali'));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function admin_cancel_order(uuid, text, boolean) from public;
grant execute on function admin_cancel_order(uuid, text, boolean) to authenticated;

-- ============================================================
-- admin_refund_order — iptal etmeden iade
-- ============================================================
create or replace function admin_refund_order(
  p_order_id uuid,
  p_reason text
) returns void as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_payment_status payment_status;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Yetkisiz erişim.';
  end if;
  select coalesce((select is_admin from profiles where id = v_user_id), false)
    into v_is_admin;
  if not v_is_admin then
    raise exception 'Bu işlem yalnızca admin tarafından yapılabilir.';
  end if;

  select payment_status into v_payment_status from orders where id = p_order_id;
  if v_payment_status is null then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if v_payment_status <> 'paid' then
    raise exception 'Yalnızca ödenmiş siparişler iade edilebilir.';
  end if;

  update orders
    set payment_status = 'refunded',
        cancellation_reason = coalesce(cancellation_reason, p_reason)
    where id = p_order_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function admin_refund_order(uuid, text) from public;
grant execute on function admin_refund_order(uuid, text) to authenticated;
