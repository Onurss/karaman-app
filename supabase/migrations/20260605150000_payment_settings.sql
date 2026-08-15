-- ============================================================
-- 20260605150000 — Sistem geneli ödeme ayarları (panelden aktif/pasif)
-- ============================================================
-- Onur Bey: ödeme yöntemleri en baştan; panelden aktif/pasif; tek POS aktif.
-- payment_method enum'una 'paytr' eklenir. Tek-satırlık payment_settings
-- tablosu hangi yöntemlerin açık olduğunu ve aktif online POS sağlayıcısını
-- tutar. Admin yazar, herkes okur (mobil checkout buna göre yöntem gösterir).
-- ============================================================

alter type payment_method add value if not exists 'paytr';

create table if not exists payment_settings (
  id boolean primary key default true,
  cash_enabled boolean not null default true,
  card_on_delivery_enabled boolean not null default true,
  online_enabled boolean not null default false,
  -- Tek aktif online POS sağlayıcısı (online_enabled=true iken anlamlı)
  active_pos_provider text,
  updated_at timestamptz default now(),
  constraint payment_settings_singleton check (id = true),
  constraint payment_settings_pos_check
    check (active_pos_provider is null or active_pos_provider in ('iyzico', 'garanti_pos', 'paytr'))
);

insert into payment_settings (id) values (true) on conflict (id) do nothing;

create or replace function set_payment_settings_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_settings_updated_at on payment_settings;
create trigger trg_payment_settings_updated_at
  before update on payment_settings
  for each row execute function set_payment_settings_updated_at();

alter table payment_settings enable row level security;

drop policy if exists "payment_settings_read_all" on payment_settings;
create policy "payment_settings_read_all" on payment_settings
  for select using (true);

drop policy if exists "payment_settings_admin_update" on payment_settings;
create policy "payment_settings_admin_update" on payment_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Mobil checkout panel değişikliğini anında görsün.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_settings'
  ) then
    alter publication supabase_realtime add table public.payment_settings;
  end if;
end $$;
