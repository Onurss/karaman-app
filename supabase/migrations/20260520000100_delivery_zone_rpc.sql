-- ============================================================
-- Teslimat bölgesi yönetimi (restoran paneli polygon çizimi)
--
-- Restoran panel kullanıcısı kendi restoranı için polygon
-- şeklinde delivery_zone tanımlayabilir. Polygon GeoJSON
-- formatında gönderilir; PostGIS ST_GeomFromGeoJSON ile
-- geography(polygon)'a çevrilir.
-- ============================================================

-- Yetki kontrol helper'ı: kullanıcı restorana ait mi?
create or replace function _user_has_restaurant_access(
  p_restaurant_id uuid,
  p_user_id uuid
) returns boolean as $$
begin
  return exists (
    select 1 from restaurant_users
    where restaurant_id = p_restaurant_id
      and user_id = p_user_id
      and is_active = true
      and role in ('owner', 'manager')
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- ============================================================
-- restaurant_set_delivery_zone
-- ============================================================
-- p_polygon_geojson: { type: "Polygon", coordinates: [[[lng,lat],...]] }
-- p_polygon_geojson NULL gönderilirse delivery_zone temizlenir
-- (her adrese teslimat — eski 5km otomatik daire fallback'i kaldırılır)
-- ============================================================
create or replace function restaurant_set_delivery_zone(
  p_restaurant_id uuid,
  p_polygon_geojson jsonb
) returns void as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Yetkisiz erişim.';
  end if;

  if not _user_has_restaurant_access(p_restaurant_id, v_user_id) then
    raise exception 'Bu restoran için yetkiniz yok.';
  end if;

  if p_polygon_geojson is null then
    update restaurants
      set delivery_zone = null, updated_at = now()
      where id = p_restaurant_id;
    return;
  end if;

  -- GeoJSON tipini doğrula
  if (p_polygon_geojson ->> 'type') not in ('Polygon', 'MultiPolygon') then
    raise exception 'Geçersiz GeoJSON tipi. Polygon veya MultiPolygon bekleniyor.';
  end if;

  update restaurants
    set delivery_zone = st_geomfromgeojson(p_polygon_geojson::text)::geography,
        updated_at = now()
    where id = p_restaurant_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function restaurant_set_delivery_zone(uuid, jsonb) from public;
grant execute on function restaurant_set_delivery_zone(uuid, jsonb) to authenticated;

-- ============================================================
-- Restoran panelinin kendi delivery_zone'unu okuyabilmesi için
-- restaurants_view yeterli (security_invoker=on, RLS okuma izni var).
-- ============================================================
