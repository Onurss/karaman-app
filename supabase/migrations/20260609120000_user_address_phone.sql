-- ============================================================
-- user_addresses: teslimat için iletişim telefonu (additive)
-- Figma "Teslimat Adresi Seç" kartlarında her adresin bir telefonu var.
-- Mevcut veriyi bozmaz: kolon nullable, varsayılanı yok.
-- ============================================================
alter table user_addresses
  add column if not exists phone text;

-- View'i phone'u da dönecek şekilde güncelle.
-- CREATE OR REPLACE VIEW kuralı: mevcut kolonlar aynı sıra/tiple kalmalı,
-- yeni kolon yalnızca SONA eklenebilir.
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
  created_at,
  phone
from user_addresses;

alter view user_addresses_view set (security_invoker = on);
