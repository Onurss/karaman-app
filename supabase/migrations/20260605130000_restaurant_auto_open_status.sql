-- ============================================================
-- 20260605130000 — Restoran açık/kapalı durumu: otomatik + manuel override
-- ============================================================
-- Davranış: varsayılan OTOMATİK (çalışma saatlerine göre); restoran isterse
-- manuel "Açık"/"Kapalı"ya zorlar. Müdahale etmezse saatlerine göre otomatik.
--
-- working_hours yapısal jsonb'ye geçer:
--   { "monday": {"open":"09:00","close":"22:00"}, ..., "sunday": null }
--   (gün yoksa / null ise o gün kapalı)
-- open_override: 'auto' | 'open' | 'closed'
-- is_open ARTIK TÜRETİLMİŞTİR (trigger yazımda, pg_cron saat sınırlarında).
-- Müşteri uygulaması yine sadece is_open okur — değişmez.
-- ============================================================

alter table restaurants
  add column if not exists open_override text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurants_open_override_check'
  ) then
    alter table restaurants
      add constraint restaurants_open_override_check
      check (open_override in ('auto', 'open', 'closed'));
  end if;
end $$;

-- Verilen anda restoran açık mı? (override + yapısal saatler, TR saati)
create or replace function is_restaurant_open_now(
  p_working_hours jsonb,
  p_open_override text,
  p_at timestamptz default now()
) returns boolean
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_keys text[] := array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  v_local timestamp;
  v_hours jsonb;
  v_open time;
  v_close time;
  v_now time;
begin
  if p_open_override = 'open' then return true; end if;
  if p_open_override = 'closed' then return false; end if;

  -- 'auto' → çalışma saatlerine göre (Türkiye saati, UTC+3 sabit)
  v_local := p_at at time zone 'Europe/Istanbul';
  v_hours := p_working_hours -> v_keys[extract(isodow from v_local)::int];

  if v_hours is null or jsonb_typeof(v_hours) = 'null'
     or (v_hours->>'open') is null or (v_hours->>'close') is null then
    return false; -- o gün kapalı / tanımsız
  end if;

  v_open := (v_hours->>'open')::time;
  v_close := (v_hours->>'close')::time;
  v_now := v_local::time;

  if v_close > v_open then
    return v_now >= v_open and v_now < v_close;
  else
    return v_now >= v_open or v_now < v_close; -- gece yarısını aşan (örn. 18:00–02:00)
  end if;
exception when others then
  return false; -- format bozuksa güvenli taraf: kapalı
end;
$$;

-- restaurants her yazıldığında is_open'ı override + saatlerden türet.
create or replace function set_restaurant_is_open()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.is_open := is_restaurant_open_now(new.working_hours, new.open_override, now());
  return new;
end;
$$;

drop trigger if exists trg_set_restaurant_is_open on restaurants;
create trigger trg_set_restaurant_is_open
  before insert or update on restaurants
  for each row execute function set_restaurant_is_open();

-- pg_cron: saat sınırlarında (açılış/kapanış) is_open'ı tazele.
-- SECURITY DEFINER → tüm restoranları RLS'siz güncelleyebilir.
create or replace function refresh_restaurant_open_status()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update restaurants
  set is_open = is_restaurant_open_now(working_hours, open_override, now())
  where is_active = true
    and is_open is distinct from is_restaurant_open_now(working_hours, open_override, now());
end;
$$;

do $$
begin
  perform cron.unschedule('refresh-restaurant-open-status');
exception when others then null;
end $$;

select cron.schedule(
  'refresh-restaurant-open-status',
  '*/5 * * * *',
  'select public.refresh_restaurant_open_status();'
);

-- Mevcut kayıtları bir kez hizala.
select refresh_restaurant_open_status();
