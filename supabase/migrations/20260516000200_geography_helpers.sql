-- ============================================================
-- Geography → JSON dönüşümü için yardımcılar
-- PostgREST default olarak geography'yi WKB hex string döner;
-- client tarafı {lat,lng} bekliyor. Bu migration ile:
--   1) Tabloları sorgulayan view'ler ekliyoruz (location_lat, location_lng)
--   2) RPC fonksiyonları ile {lat, lng} json objesi döndürüyoruz
-- ============================================================

-- Address_in_delivery_zone RPC adlandırma düzeltmesi (p_ önekiyle parametre).
-- PG, create-or-replace ile input parametre ADINI değiştirmeye izin vermez
-- (önceki migration restaurant_id ile tanımlamıştı) → önce drop et.
drop function if exists address_in_delivery_zone(uuid, double precision, double precision);
create or replace function address_in_delivery_zone(
  p_restaurant_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns boolean as $$
declare
  zone geography;
begin
  select delivery_zone into zone from restaurants where id = p_restaurant_id;
  if zone is null then
    -- Teslimat bölgesi tanımlı değilse herkese teslimat
    return true;
  end if;
  return st_contains(
    zone::geometry,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geometry
  );
end;
$$ language plpgsql stable;

-- ============================================================
-- View: user_addresses_view — location'ı JSON {lat, lng} olarak döner
-- ============================================================
create or replace view user_addresses_view as
select
  id,
  user_id,
  title,
  full_address,
  district,
  building_no,
  apartment_no,
  floor,
  note,
  json_build_object(
    'lat', st_y(location::geometry),
    'lng', st_x(location::geometry)
  ) as location,
  is_default,
  created_at
from user_addresses;

-- View RLS — user_addresses tablosundaki RLS'yi miras alır (security_invoker)
alter view user_addresses_view set (security_invoker = on);

-- ============================================================
-- View: restaurants_view — location & delivery_zone JSON
-- ============================================================
create or replace view restaurants_view as
select
  r.id,
  r.name,
  r.slug,
  r.description,
  r.logo_url,
  r.cover_image_url,
  r.phone,
  r.email,
  r.tax_office,
  r.tax_number,
  r.address,
  json_build_object(
    'lat', st_y(r.location::geometry),
    'lng', st_x(r.location::geometry)
  ) as location,
  r.district,
  r.cuisine_types,
  r.rating,
  r.review_count,
  case
    when r.delivery_zone is null then null
    else st_asgeojson(r.delivery_zone)::json
  end as delivery_zone,
  r.min_order_amount,
  r.delivery_fee,
  r.estimated_delivery_minutes,
  r.commission_rate,
  r.subscription_tier,
  r.subscription_active,
  r.is_active,
  r.is_open,
  r.working_hours,
  r.accepts_cash,
  r.accepts_card_on_delivery,
  r.accepts_online_payment,
  r.created_at,
  r.updated_at
from restaurants r;

alter view restaurants_view set (security_invoker = on);

-- ============================================================
-- View: orders_view — delivery_location JSON
-- ============================================================
create or replace view orders_view as
select
  o.id,
  o.order_number,
  o.user_id,
  o.restaurant_id,
  o.delivery_address_id,
  o.delivery_address_snapshot,
  json_build_object(
    'lat', st_y(o.delivery_location::geometry),
    'lng', st_x(o.delivery_location::geometry)
  ) as delivery_location,
  o.status,
  o.payment_method,
  o.payment_status,
  o.subtotal,
  o.delivery_fee,
  o.commission_amount,
  o.vat_amount,
  o.total_amount,
  o.courier_id,
  o.estimated_delivery_minutes,
  o.customer_note,
  o.created_at,
  o.confirmed_at,
  o.preparing_at,
  o.ready_at,
  o.on_the_way_at,
  o.delivered_at,
  o.cancelled_at,
  o.cancellation_reason
from orders o;

alter view orders_view set (security_invoker = on);

-- ============================================================
-- View'ler: şehir hizmetleri (atms, water_fountains, charging_stations)
-- ============================================================
create or replace view atms_view as
select
  id, bank_name, branch_name, address, district,
  json_build_object(
    'lat', st_y(location::geometry),
    'lng', st_x(location::geometry)
  ) as location,
  is_24_7, is_active, notes, created_at
from atms;

alter view atms_view set (security_invoker = on);

create or replace view water_fountains_view as
select
  id, name, address, district,
  json_build_object(
    'lat', st_y(location::geometry),
    'lng', st_x(location::geometry)
  ) as location,
  is_active, notes, created_at
from water_fountains;

alter view water_fountains_view set (security_invoker = on);

create or replace view charging_stations_view as
select
  id, name, operator, address, district,
  json_build_object(
    'lat', st_y(location::geometry),
    'lng', st_x(location::geometry)
  ) as location,
  socket_types, power_kw, is_active, notes, created_at
from charging_stations;

alter view charging_stations_view set (security_invoker = on);
