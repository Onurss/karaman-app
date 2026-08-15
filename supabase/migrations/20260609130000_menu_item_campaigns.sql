-- ============================================================
-- menu_items: restoran kampanyaları (additive)
-- Kampanya = indirimli fiyatlı bir menü ürünü. price = kampanya (yeni) fiyatı,
-- original_price = üstü çizili eski fiyat. is_campaign true ise mobilde
-- restoran detayındaki "Kampanyalar" bölümünde gösterilir.
-- Sipariş hattı değişmez: kampanya da normal bir menu_item olarak sepete/
-- siparişe girer (create-order menu_item_id ile doğrular).
-- ============================================================
alter table menu_items
  add column if not exists original_price numeric(10,2)
    check (original_price is null or original_price >= 0),
  add column if not exists is_campaign boolean not null default false;

-- Kampanya ürünlerini hızlı çekmek için kısmi index.
create index if not exists idx_menu_items_campaign
  on menu_items(restaurant_id)
  where is_campaign = true;
