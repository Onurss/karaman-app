-- ============================================================
-- 20260605140000 — Supabase Realtime: tabloları publication'a ekle
-- ============================================================
-- Mobil uygulama `postgres_changes` ile şu tablolara abone oluyor (panel
-- değişikliklerinin ANINDA yansıması için). Ancak tablolar `supabase_realtime`
-- publication'ına eklenmezse abonelikler sessiz kalır — hiçbir olay gelmez.
-- config.toml'daki [realtime] enabled=true yalnızca sunucuyu açar, üyelik vermez.
--
-- Bu migration ilgili tabloları idempotent şekilde publication'a ekler ve
-- filtreli (PK olmayan kolon) tablolarda DELETE olaylarının da düşmesi için
-- REPLICA IDENTITY FULL ayarlar.
-- ============================================================

do $$
declare
  t text;
  realtime_tables text[] := array[
    'restaurants',          -- is_open, çalışma saatleri, logo/kapak (restoran+admin)
    'menu_categories',      -- menü (restoran paneli)
    'menu_items',           -- menü ürün/fiyat/stok (restoran paneli)
    'ad_banners',           -- reklam bannerları (admin)
    'app_campaigns',        -- uygulama kampanyaları (admin)
    'atms',                 -- ATM'ler (admin)
    'water_fountains',      -- su vezneleri (admin)
    'charging_stations',    -- şarj istasyonları (admin)
    'transport_schedules',  -- otobüs/tren saatleri (admin)
    'orders'                -- sipariş durumu (restoran→müşteri canlı takip)
  ];
begin
  foreach t in array realtime_tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Filtre PK olmayan kolonda (restaurant_id) olduğundan DELETE olaylarının
-- mobile düşmesi için eski satır gerekli → REPLICA IDENTITY FULL.
alter table menu_categories replica identity full;
alter table menu_items replica identity full;
