-- Karaman'a özel şehir hizmetleri tabloları
-- 11.05.2026 müşteri talebi: su vezneleri, ATM'ler, şarj istasyonları
-- (admin panel üzerinden yönetilir, mobile app harita üstünde gösterir)

-- ============================================================
-- 1) Su vezneleri (içme suyu çeşmeleri)
-- ============================================================
create table water_fountains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  district text not null,
  location geography(point) not null,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create index idx_water_fountains_active on water_fountains(is_active);
create index idx_water_fountains_location on water_fountains using gist(location);

alter table water_fountains enable row level security;

create policy "anyone_views_active_water_fountains" on water_fountains
  for select using (is_active = true);

create policy "admins_manage_water_fountains" on water_fountains
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================
-- 2) ATM'ler
-- ============================================================
create table atms (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  branch_name text,
  address text not null,
  district text not null,
  location geography(point) not null,
  is_24_7 boolean default true,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create index idx_atms_active on atms(is_active);
create index idx_atms_bank on atms(bank_name);
create index idx_atms_location on atms using gist(location);

alter table atms enable row level security;

create policy "anyone_views_active_atms" on atms
  for select using (is_active = true);

create policy "admins_manage_atms" on atms
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================
-- 3) Elektrikli araç şarj istasyonları
-- ============================================================
create table charging_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operator text,
  address text not null,
  district text not null,
  location geography(point) not null,
  socket_types text[] default '{}',
  power_kw numeric(6,2) not null default 22,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create index idx_charging_stations_active on charging_stations(is_active);
create index idx_charging_stations_location on charging_stations using gist(location);

alter table charging_stations enable row level security;

create policy "anyone_views_active_charging_stations" on charging_stations
  for select using (is_active = true);

create policy "admins_manage_charging_stations" on charging_stations
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================
-- 4) Konuma göre yakındaki şehir hizmetlerini getiren RPC
-- ============================================================
create or replace function water_fountains_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km integer default 5
)
returns table (
  id uuid,
  name text,
  address text,
  district text,
  distance_meters double precision,
  notes text
) as $$
begin
  return query
  select
    w.id, w.name, w.address, w.district,
    st_distance(w.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_meters,
    w.notes
  from water_fountains w
  where w.is_active = true
    and st_dwithin(
      w.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_meters asc;
end;
$$ language plpgsql stable;

create or replace function atms_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km integer default 5,
  filter_bank text default null
)
returns table (
  id uuid,
  bank_name text,
  branch_name text,
  address text,
  district text,
  is_24_7 boolean,
  distance_meters double precision
) as $$
begin
  return query
  select
    a.id, a.bank_name, a.branch_name, a.address, a.district, a.is_24_7,
    st_distance(a.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_meters
  from atms a
  where a.is_active = true
    and (filter_bank is null or a.bank_name ilike filter_bank)
    and st_dwithin(
      a.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_meters asc;
end;
$$ language plpgsql stable;

create or replace function charging_stations_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km integer default 10
)
returns table (
  id uuid,
  name text,
  operator text,
  address text,
  district text,
  socket_types text[],
  power_kw numeric,
  distance_meters double precision
) as $$
begin
  return query
  select
    c.id, c.name, c.operator, c.address, c.district, c.socket_types, c.power_kw,
    st_distance(c.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_meters
  from charging_stations c
  where c.is_active = true
    and st_dwithin(
      c.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_meters asc;
end;
$$ language plpgsql stable;
