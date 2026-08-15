-- Yakındaki restoranları döndürür (PostGIS ile mesafe hesaplı).
create or replace function restaurants_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km integer default 10
)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_image_url text,
  cuisine_types text[],
  rating numeric,
  review_count integer,
  is_open boolean,
  delivery_fee numeric,
  min_order_amount numeric,
  estimated_delivery_minutes integer,
  distance_meters double precision
) as $$
begin
  return query
  select
    r.id, r.name, r.slug, r.logo_url, r.cover_image_url,
    r.cuisine_types, r.rating, r.review_count, r.is_open,
    r.delivery_fee, r.min_order_amount, r.estimated_delivery_minutes,
    st_distance(
      r.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  from restaurants r
  where r.is_active = true
    and st_dwithin(
      r.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_meters asc;
end;
$$ language plpgsql stable;

-- Bir adres restaurant'ın teslimat bölgesi içinde mi
create or replace function address_in_delivery_zone(
  restaurant_id uuid,
  lat double precision,
  lng double precision
)
returns boolean as $$
declare
  zone geography(polygon);
begin
  select delivery_zone into zone from restaurants where id = restaurant_id;
  if zone is null then return true; end if;
  return st_contains(
    zone::geometry,
    st_setsrid(st_makepoint(lng, lat), 4326)
  );
end;
$$ language plpgsql stable;

-- Bir restoran şu anki saate göre açık mı (working_hours JSON'ından bakar)
create or replace function restaurant_is_open_now(restaurant_id uuid)
returns boolean as $$
declare
  r record;
  today_key text;
  range_text text;
  start_t time;
  end_t time;
  now_t time;
begin
  select is_active, is_open, working_hours into r
    from restaurants where id = restaurant_id;

  if not found or not r.is_active or not r.is_open then
    return false;
  end if;

  today_key := lower(to_char(now() at time zone 'Europe/Istanbul', 'FMday'));
  range_text := r.working_hours->>today_key;

  if range_text is null or range_text = '' then
    return false;
  end if;

  begin
    start_t := split_part(range_text, ' - ', 1)::time;
    end_t := split_part(range_text, ' - ', 2)::time;
  exception when others then
    return r.is_open;
  end;

  now_t := (now() at time zone 'Europe/Istanbul')::time;
  return now_t between start_t and end_t;
end;
$$ language plpgsql stable;
