-- Geliştirme için örnek veri. `supabase db reset` ile çalışır.
-- Karaman Merkez koordinatları kullanılır.

-- ============================================================
-- Restoranlar
-- ============================================================

insert into restaurants (id, name, slug, description, phone, address, location, district, cuisine_types, rating, review_count, min_order_amount, delivery_fee, estimated_delivery_minutes, commission_rate, subscription_tier, working_hours)
values
  ('11111111-1111-1111-1111-111111111111', 'Mevlana Restaurant', 'mevlana-restaurant',
   'Karaman''ın en köklü restoranı', '+903381234567',
   'Atatürk Cad. No:45 Karaman Merkez',
   st_setsrid(st_makepoint(33.2287, 37.1759), 4326)::geography,
   'Merkez', array['Türk Mutfağı', 'Yöresel'], 4.6, 234,
   150, 25, 35, 10.0, 'gold',
   '{"monday": "09:00 - 23:00", "tuesday": "09:00 - 23:00", "wednesday": "09:00 - 23:00", "thursday": "09:00 - 23:00", "friday": "09:00 - 23:00", "saturday": "10:00 - 23:00", "sunday": "10:00 - 22:00"}'::jsonb),

  ('22222222-2222-2222-2222-222222222222', 'Express Pizza', 'express-pizza',
   'Karaman''ın en hızlı pizzacısı', '+903382345678',
   'İnönü Cad. No:12 Karaman Merkez',
   st_setsrid(st_makepoint(33.2289, 37.1763), 4326)::geography,
   'Merkez', array['Pizza', 'Hızlı'], 4.9, 328,
   100, 20, 25, 12.0, 'silver',
   '{"monday": "11:00 - 23:00", "tuesday": "11:00 - 23:00", "wednesday": "11:00 - 23:00", "thursday": "11:00 - 23:00", "friday": "11:00 - 00:00", "saturday": "11:00 - 00:00", "sunday": "11:00 - 23:00"}'::jsonb),

  ('33333333-3333-3333-3333-333333333333', 'Burger Republic', 'burger-republic',
   'Premium el yapımı hamburger', '+903383456789',
   'Cumhuriyet Mah. No:30 Karaman Merkez',
   st_setsrid(st_makepoint(33.2275, 37.1750), 4326)::geography,
   'Merkez', array['Hamburger', 'Fast Food'], 4.6, 412,
   120, 25, 30, 10.0, 'silver',
   '{"monday": "12:00 - 23:00", "tuesday": "12:00 - 23:00", "wednesday": "12:00 - 23:00", "thursday": "12:00 - 23:00", "friday": "12:00 - 00:00", "saturday": "12:00 - 00:00", "sunday": "12:00 - 23:00"}'::jsonb),

  ('44444444-4444-4444-4444-444444444444', 'Karaman Sofrası', 'karaman-sofrasi',
   'Yöresel Karaman lezzetleri', '+903384567890',
   'Hacı Hatun Mah. Karaman',
   st_setsrid(st_makepoint(33.2310, 37.1745), 4326)::geography,
   'Merkez', array['Türk Mutfağı', 'Yöresel'], 4.7, 388,
   100, 22, 35, 10.0, 'bronze',
   '{"monday": "10:00 - 22:00", "tuesday": "10:00 - 22:00", "wednesday": "10:00 - 22:00", "thursday": "10:00 - 22:00", "friday": "10:00 - 23:00", "saturday": "10:00 - 23:00", "sunday": "10:00 - 22:00"}'::jsonb),

  ('55555555-5555-5555-5555-555555555555', 'Mado', 'mado',
   'Maraş dondurması ve tatlılar', '+903385678901',
   'Karaman Park AVM',
   st_setsrid(st_makepoint(33.2295, 37.1772), 4326)::geography,
   'Merkez', array['Tatlı', 'Dondurma'], 4.8, 521,
   80, 15, 20, 10.0, null,
   '{"monday": "10:00 - 23:00", "tuesday": "10:00 - 23:00", "wednesday": "10:00 - 23:00", "thursday": "10:00 - 23:00", "friday": "10:00 - 23:00", "saturday": "10:00 - 23:00", "sunday": "10:00 - 23:00"}'::jsonb);

-- Tüm restoranlara 5km yarıçaplı (yaklaşık) teslimat bölgesi tanımla.
-- ÖNEMLİ: st_buffer geography üzerinde mesafe-meter alır. geometry'e cast edip
-- WGS84'te 5000 ekleme HATALI olur (~555km). Doğru kullanım: geography olarak buffer.
update restaurants set delivery_zone = st_buffer(location, 5000);

-- ============================================================
-- Menü Kategorileri ve Öğeleri — TÜM restoranlar için
-- ============================================================

-- Mevlana Restaurant
insert into menu_categories (id, restaurant_id, name, display_order) values
  ('aa011111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Çorbalar', 1),
  ('aa012222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ana Yemekler', 2),
  ('aa013333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kebaplar', 3),
  ('aa014444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Tatlılar', 4),
  ('aa015555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'İçecekler', 5);

insert into menu_items (restaurant_id, category_id, name, description, price, is_available, display_order, is_vegetarian) values
  ('11111111-1111-1111-1111-111111111111', 'aa011111-1111-1111-1111-111111111111', 'Mercimek Çorbası', 'Sıcak servis, limon eşliğinde', 70, true, 1, true),
  ('11111111-1111-1111-1111-111111111111', 'aa011111-1111-1111-1111-111111111111', 'Ezogelin Çorbası', 'Geleneksel ev usulü', 75, true, 2, true),
  ('11111111-1111-1111-1111-111111111111', 'aa012222-2222-2222-2222-222222222222', 'Karaman Kapama', 'Yöresel pirinçli kuzu eti', 320, true, 1, false),
  ('11111111-1111-1111-1111-111111111111', 'aa012222-2222-2222-2222-222222222222', 'Tas Kebabı', 'Patates ve havuçla', 280, true, 2, false),
  ('11111111-1111-1111-1111-111111111111', 'aa012222-2222-2222-2222-222222222222', 'İçli Köfte', '4 adet, yanında salata', 220, true, 3, false),
  ('11111111-1111-1111-1111-111111111111', 'aa013333-3333-3333-3333-333333333333', 'Adana Kebap', '180 gr, lavaş ve garnitür', 380, true, 1, false),
  ('11111111-1111-1111-1111-111111111111', 'aa013333-3333-3333-3333-333333333333', 'Urfa Kebap', '180 gr, lavaş ve garnitür', 380, true, 2, false),
  ('11111111-1111-1111-1111-111111111111', 'aa013333-3333-3333-3333-333333333333', 'Beyti', 'Yoğurt ve domates sosuyla', 420, true, 3, false),
  ('11111111-1111-1111-1111-111111111111', 'aa014444-4444-4444-4444-444444444444', 'Künefe', 'Kaymaklı, sıcak servis', 180, true, 1, true),
  ('11111111-1111-1111-1111-111111111111', 'aa014444-4444-4444-4444-444444444444', 'Sütlaç', 'Geleneksel fırın sütlaç', 95, true, 2, true),
  ('11111111-1111-1111-1111-111111111111', 'aa015555-5555-5555-5555-555555555555', 'Ayran 500ml', 'Soğuk servis', 35, true, 1, true),
  ('11111111-1111-1111-1111-111111111111', 'aa015555-5555-5555-5555-555555555555', 'Şalgam Suyu', 'Şişe', 40, true, 2, true);

-- Express Pizza
insert into menu_categories (id, restaurant_id, name, display_order) values
  ('aa021111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Pizza', 1),
  ('aa022222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Tatlı', 2),
  ('aa023333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'İçecek', 3);

insert into menu_items (restaurant_id, category_id, name, description, price, is_available, display_order, is_vegetarian) values
  ('22222222-2222-2222-2222-222222222222', 'aa021111-1111-1111-1111-111111111111', 'Karışık Pizza', 'Sucuk, mantar, mısır, biber', 360, true, 1, false),
  ('22222222-2222-2222-2222-222222222222', 'aa021111-1111-1111-1111-111111111111', 'Margarita Pizza', 'Domates ve fesleğen', 290, true, 2, true),
  ('22222222-2222-2222-2222-222222222222', 'aa021111-1111-1111-1111-111111111111', 'Sucuklu Pizza', 'Bol sucuk', 350, true, 3, false),
  ('22222222-2222-2222-2222-222222222222', 'aa021111-1111-1111-1111-111111111111', 'Tavuklu Pizza', 'Izgara tavuk, mantar', 380, true, 4, false),
  ('22222222-2222-2222-2222-222222222222', 'aa021111-1111-1111-1111-111111111111', 'Spesiyal Pizza', 'Soğan, mantar, biber, jalapeño', 550, true, 5, false),
  ('22222222-2222-2222-2222-222222222222', 'aa022222-2222-2222-2222-222222222222', 'Sufle', 'Sıcak çikolata soslu', 120, true, 1, true),
  ('22222222-2222-2222-2222-222222222222', 'aa022222-2222-2222-2222-222222222222', 'Tiramisu', 'Ev yapımı', 140, true, 2, true),
  ('22222222-2222-2222-2222-222222222222', 'aa023333-3333-3333-3333-333333333333', 'Coca Cola 1L', 'Soğuk', 60, true, 1, true),
  ('22222222-2222-2222-2222-222222222222', 'aa023333-3333-3333-3333-333333333333', 'Ayran 500ml', 'Soğuk', 35, true, 2, true);

-- Burger Republic
insert into menu_categories (id, restaurant_id, name, display_order) values
  ('aa031111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Hamburgerler', 1),
  ('aa032222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Yan Ürünler', 2),
  ('aa033333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'İçecekler', 3);

insert into menu_items (restaurant_id, category_id, name, description, price, is_available, display_order, is_vegetarian, is_spicy) values
  ('33333333-3333-3333-3333-333333333333', 'aa031111-1111-1111-1111-111111111111', 'Classic Burger', '150 gr dana eti, cheddar', 280, true, 1, false, false),
  ('33333333-3333-3333-3333-333333333333', 'aa031111-1111-1111-1111-111111111111', 'Double Burger', '300 gr dana, çift peynir', 380, true, 2, false, false),
  ('33333333-3333-3333-3333-333333333333', 'aa031111-1111-1111-1111-111111111111', 'BBQ Bacon', 'Smoke BBQ sos, bacon', 360, true, 3, false, false),
  ('33333333-3333-3333-3333-333333333333', 'aa031111-1111-1111-1111-111111111111', 'Spicy Jalapeno', 'Acı, jalapeño dilimleri', 340, true, 4, false, true),
  ('33333333-3333-3333-3333-333333333333', 'aa031111-1111-1111-1111-111111111111', 'Veggie Burger', 'Vegan, mercimek köfte', 250, true, 5, true, false),
  ('33333333-3333-3333-3333-333333333333', 'aa032222-2222-2222-2222-222222222222', 'Patates Kızartması', 'Tuzlu, M boy', 80, true, 1, true, false),
  ('33333333-3333-3333-3333-333333333333', 'aa032222-2222-2222-2222-222222222222', 'Soğan Halkası', '8 adet', 95, true, 2, true, false),
  ('33333333-3333-3333-3333-333333333333', 'aa033333-3333-3333-3333-333333333333', 'Coca Cola 330ml', null, 45, true, 1, true, false),
  ('33333333-3333-3333-3333-333333333333', 'aa033333-3333-3333-3333-333333333333', 'Ev Limonata', null, 60, true, 2, true, false);

-- Karaman Sofrası
insert into menu_categories (id, restaurant_id, name, display_order) values
  ('aa041111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Yöresel', 1),
  ('aa042222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Çorba', 2),
  ('aa043333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Tatlı', 3);

insert into menu_items (restaurant_id, category_id, name, description, price, is_available, display_order) values
  ('44444444-4444-4444-4444-444444444444', 'aa041111-1111-1111-1111-111111111111', 'Etli Ekmek', 'İnce hamur, kıyma', 220, true, 1),
  ('44444444-4444-4444-4444-444444444444', 'aa041111-1111-1111-1111-111111111111', 'Bandırma', 'Geleneksel Karaman tabağı', 280, true, 2),
  ('44444444-4444-4444-4444-444444444444', 'aa041111-1111-1111-1111-111111111111', 'Bamya Yemeği', 'Etli', 240, true, 3),
  ('44444444-4444-4444-4444-444444444444', 'aa042222-2222-2222-2222-222222222222', 'Yarma Çorbası', 'Yöresel', 80, true, 1),
  ('44444444-4444-4444-4444-444444444444', 'aa042222-2222-2222-2222-222222222222', 'Tarhana', 'Ev yapımı', 75, true, 2),
  ('44444444-4444-4444-4444-444444444444', 'aa043333-3333-3333-3333-333333333333', 'Höşmerim', 'Kaymaklı', 130, true, 1),
  ('44444444-4444-4444-4444-444444444444', 'aa043333-3333-3333-3333-333333333333', 'Helva', 'Tahin helva', 90, true, 2);

-- Mado
insert into menu_categories (id, restaurant_id, name, display_order) values
  ('aa051111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Dondurma', 1),
  ('aa052222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Tatlılar', 2),
  ('aa053333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Sıcak İçecekler', 3);

insert into menu_items (restaurant_id, category_id, name, description, price, is_available, display_order, is_vegetarian) values
  ('55555555-5555-5555-5555-555555555555', 'aa051111-1111-1111-1111-111111111111', 'Maraş Dondurma 3 Top', 'Kaymak, çikolata, fıstık', 130, true, 1, true),
  ('55555555-5555-5555-5555-555555555555', 'aa051111-1111-1111-1111-111111111111', 'Kazandibi Dondurma', null, 110, true, 2, true),
  ('55555555-5555-5555-5555-555555555555', 'aa051111-1111-1111-1111-111111111111', 'Fıstık Sade', 'Tek top', 70, true, 3, true),
  ('55555555-5555-5555-5555-555555555555', 'aa052222-2222-2222-2222-222222222222', 'Künefe', null, 150, true, 1, true),
  ('55555555-5555-5555-5555-555555555555', 'aa052222-2222-2222-2222-222222222222', 'Profiterol', null, 130, true, 2, true),
  ('55555555-5555-5555-5555-555555555555', 'aa053333-3333-3333-3333-333333333333', 'Türk Kahvesi', null, 55, true, 1, true),
  ('55555555-5555-5555-5555-555555555555', 'aa053333-3333-3333-3333-333333333333', 'Salep', 'Sıcak', 65, true, 2, true);

-- ============================================================
-- Banner örnekleri
-- ============================================================

insert into ad_banners (title, image_url, click_url, position, starts_at, ends_at, display_order) values
  ('Bahar Kampanyası', 'https://placehold.co/800x400/0F172A/FFFFFF?text=Bahar+Kampanyasi', 'https://karaman.com', 'home_hero', now() - interval '1 day', now() + interval '30 days', 1),
  ('Yeni Restoranlar', 'https://placehold.co/800x300/F97316/FFFFFF?text=Yeni+Restoranlar', null, 'food_tab', now() - interval '1 day', now() + interval '30 days', 1),
  ('Karaman Lale Festivali', 'https://placehold.co/800x300/14B8A6/FFFFFF?text=Lale+Festivali', null, 'home_hero', now() - interval '5 days', now() + interval '20 days', 2),
  ('Sıcak Fırsatları Kaçırma', 'https://placehold.co/800x300/F59E0B/FFFFFF?text=Sicak+Firsatlar', null, 'news_list', now() - interval '1 day', now() + interval '30 days', 1),
  ('Yakındaki İlanlar', 'https://placehold.co/800x300/8B5CF6/FFFFFF?text=Yakindaki+Ilanlar', null, 'discover', now() - interval '1 day', now() + interval '30 days', 1);

-- ============================================================
-- App Kampanyaları (uygulama içi promosyonlar)
-- ============================================================

insert into app_campaigns (title, description, image_url, target_screen, starts_at, ends_at, display_order) values
  ('İlk Sipariş %30 İndirim', 'Yeni kullanıcılara özel ilk siparişte %30 indirim.', 'https://placehold.co/600x400/F97316/FFFFFF?text=Ilk+Siparis', '/yemek', now() - interval '1 day', now() + interval '60 days', 1),
  ('Ücretsiz Teslimat Haftası', 'Bu hafta tüm siparişlerde ücretsiz teslimat.', 'https://placehold.co/600x400/14B8A6/FFFFFF?text=Ucretsiz+Teslimat', '/yemek', now() - interval '1 day', now() + interval '7 days', 2),
  ('Karaman''ı Keşfet', 'Tarihi ve doğal güzellikleri keşfedin.', 'https://placehold.co/600x400/0F172A/FFFFFF?text=Karamani+Kesfet', '/karaman', now() - interval '5 days', now() + interval '90 days', 3);

-- ============================================================
-- Otobüs/Tren saatleri (20+ kayıt)
-- ============================================================

insert into transport_schedules (type, route_name, from_location, to_location, departure_time, arrival_time, days_of_week, operator, price) values
  ('bus', 'İstanbul - Karaman', 'İstanbul Otogar', 'Karaman Otogar', '20:00', '06:00', array[1,2,3,4,5,6,7], 'Metro Turizm', 850),
  ('bus', 'İstanbul - Karaman', 'İstanbul Otogar', 'Karaman Otogar', '22:30', '08:30', array[1,2,3,4,5,6,7], 'Pamukkale Turizm', 800),
  ('bus', 'Ankara - Karaman', 'Ankara AŞTİ', 'Karaman Otogar', '07:30', '11:00', array[1,2,3,4,5,6,7], 'AKE Karaman', 450),
  ('bus', 'Ankara - Karaman', 'Ankara AŞTİ', 'Karaman Otogar', '14:00', '17:30', array[1,2,3,4,5,6,7], 'AKE Karaman', 450),
  ('bus', 'Ankara - Karaman', 'Ankara AŞTİ', 'Karaman Otogar', '19:30', '23:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 480),
  ('bus', 'İzmir - Karaman', 'İzmir Otogar', 'Karaman Otogar', '19:00', '07:00', array[1,2,3,4,5,6,7], 'Pamukkale Turizm', 950),
  ('bus', 'Antalya - Karaman', 'Antalya Otogar', 'Karaman Otogar', '08:00', '14:00', array[1,2,3,4,5,6,7], 'Kamil Koç', 620),
  ('bus', 'Adana - Karaman', 'Adana Otogar', 'Karaman Otogar', '09:30', '13:30', array[1,2,3,4,5,6,7], 'AKE Karaman', 380),
  ('bus', 'Mersin - Karaman', 'Mersin Otogar', 'Karaman Otogar', '11:00', '14:00', array[1,2,3,4,5,6,7], 'Mersin Seyahat', 250),
  ('bus', 'Konya - Karaman', 'Konya Otogar', 'Karaman Otogar', '07:00', '09:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 150),
  ('bus', 'Konya - Karaman', 'Konya Otogar', 'Karaman Otogar', '10:00', '12:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 150),
  ('bus', 'Konya - Karaman', 'Konya Otogar', 'Karaman Otogar', '13:00', '15:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 150),
  ('bus', 'Konya - Karaman', 'Konya Otogar', 'Karaman Otogar', '16:00', '18:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 150),
  ('bus', 'Konya - Karaman', 'Konya Otogar', 'Karaman Otogar', '19:00', '21:00', array[1,2,3,4,5,6,7], 'Karaman Birlik', 150),
  ('train', 'Konya - Karaman Bölgesel', 'Konya Garı', 'Karaman Garı', '08:00', '09:05', array[1,2,3,4,5,6,7], 'TCDD', 140),
  ('train', 'Konya - Karaman Bölgesel', 'Konya Garı', 'Karaman Garı', '12:30', '13:35', array[1,2,3,4,5,6,7], 'TCDD', 140),
  ('train', 'Konya - Karaman Akşam', 'Konya Garı', 'Karaman Garı', '17:30', '18:35', array[1,2,3,4,5,6,7], 'TCDD', 140),
  ('train', 'Adana - Karaman', 'Adana Garı', 'Karaman Garı', '06:30', '11:00', array[1,2,3,4,5,6,7], 'TCDD', 220),
  ('train', 'Mersin - Karaman', 'Mersin Garı', 'Karaman Garı', '08:00', '11:30', array[1,2,3,4,5,6,7], 'TCDD', 180),
  ('train', 'Ankara YHT - Konya - Karaman', 'Ankara Gar', 'Karaman Garı', '13:00', '17:00', array[1,2,3,4,5,6,7], 'TCDD YHT', 380);

-- ============================================================
-- App versiyonları
-- ============================================================

insert into app_versions (platform, version, build_number, is_force_update, release_notes) values
  ('ios', '1.0.0', 1, false, 'İlk sürüm yayında.'),
  ('android', '1.0.0', 1, false, 'İlk sürüm yayında.');

-- ============================================================
-- Şehir hizmetleri — ATM'ler
-- ============================================================

insert into atms (bank_name, branch_name, address, district, location, is_24_7) values
  ('Ziraat Bankası', 'Karaman Merkez Şubesi', 'Atatürk Bulvarı No:12, Merkez/Karaman', 'Merkez', st_setsrid(st_makepoint(33.2287, 37.1759), 4326)::geography, true),
  ('İş Bankası', 'Karaman Şubesi', 'İnönü Cad. No:24, Merkez/Karaman', 'Merkez', st_setsrid(st_makepoint(33.2295, 37.1762), 4326)::geography, true),
  ('Garanti BBVA', 'Karaman Şubesi', 'Hastane Cad. No:8, Merkez/Karaman', 'Merkez', st_setsrid(st_makepoint(33.2278, 37.1755), 4326)::geography, true),
  ('Akbank', 'Karaman Şubesi', 'Cumhuriyet Mah. No:5, Merkez/Karaman', 'Merkez', st_setsrid(st_makepoint(33.2310, 37.1748), 4326)::geography, true),
  ('Yapı Kredi', 'Karaman Şubesi', 'Karaman Park AVM Zemin Kat', 'Merkez', st_setsrid(st_makepoint(33.2295, 37.1772), 4326)::geography, true),
  ('Halkbank', 'Karaman Şubesi', 'Atatürk Bulvarı No:88', 'Merkez', st_setsrid(st_makepoint(33.2271, 37.1773), 4326)::geography, false),
  ('VakıfBank', 'Karaman Şubesi', 'Hacı Hatun Mah. No:14', 'Merkez', st_setsrid(st_makepoint(33.2305, 37.1751), 4326)::geography, true),
  ('Denizbank', 'Karaman Şubesi', 'Sanayi Sitesi B Blok', 'Merkez', st_setsrid(st_makepoint(33.2340, 37.1730), 4326)::geography, false),
  ('TEB', 'Karaman Şubesi', 'Atatürk Bulvarı No:35', 'Merkez', st_setsrid(st_makepoint(33.2280, 37.1765), 4326)::geography, true),
  ('QNB Finansbank', 'Karaman Şubesi', 'İnönü Cad. No:55', 'Merkez', st_setsrid(st_makepoint(33.2293, 37.1758), 4326)::geography, true);

-- ============================================================
-- Şehir hizmetleri — Su vezneleri
-- ============================================================

insert into water_fountains (name, address, district, location, notes) values
  ('Atatürk Parkı Çeşmesi', 'Atatürk Parkı içi, Merkez', 'Merkez', st_setsrid(st_makepoint(33.2287, 37.1759), 4326)::geography, '7/24 açık'),
  ('Belediye Önü Su Veznesi', 'Belediye Binası önü', 'Merkez', st_setsrid(st_makepoint(33.2293, 37.1761), 4326)::geography, null),
  ('Mevlana Camii Şadırvanı', 'Mevlana Camii avlusu', 'Merkez', st_setsrid(st_makepoint(33.2278, 37.1755), 4326)::geography, 'Tarihi şadırvan, içme suyu'),
  ('Şehit Cengiz Topel Parkı', 'Cumhuriyet Mah.', 'Merkez', st_setsrid(st_makepoint(33.2310, 37.1748), 4326)::geography, null),
  ('Karaman Otogar Çeşmesi', 'Otogar binası dışı', 'Merkez', st_setsrid(st_makepoint(33.2340, 37.1720), 4326)::geography, null),
  ('Hastane Bahçesi Çeşmesi', 'Devlet Hastanesi bahçesi', 'Merkez', st_setsrid(st_makepoint(33.2305, 37.1781), 4326)::geography, null),
  ('Sanayi Sitesi Çeşmesi', 'Sanayi Sitesi A Blok yanı', 'Merkez', st_setsrid(st_makepoint(33.2350, 37.1730), 4326)::geography, null),
  ('İstasyon Meydanı Çeşmesi', 'Karaman Garı önü', 'Merkez', st_setsrid(st_makepoint(33.2256, 37.1789), 4326)::geography, '24 saat akar');

-- ============================================================
-- Şehir hizmetleri — Şarj istasyonları (elektrikli araç)
-- ============================================================

insert into charging_stations (name, operator, address, district, location, socket_types, power_kw, notes) values
  ('Karaman Park AVM Şarj', 'Trugo', 'Karaman Park AVM otoparkı', 'Merkez', st_setsrid(st_makepoint(33.2295, 37.1772), 4326)::geography, array['type2', 'ccs'], 60, '2 soketli, AVM açık olduğunda'),
  ('Tofaş Yetkili Şarj', 'Eşarj', 'Atatürk Bulvarı No:88', 'Merkez', st_setsrid(st_makepoint(33.2271, 37.1773), 4326)::geography, array['type2'], 22, null),
  ('Belediye Otoparkı Şarj', 'ZES', 'Belediye otoparkı zemin', 'Merkez', st_setsrid(st_makepoint(33.2293, 37.1761), 4326)::geography, array['type2', 'ccs', 'chademo'], 50, '3 soket, 7/24'),
  ('Karayolları Dinlenme Tesisi', 'Voltrun', 'D330 karayolu Konya yönü', 'Merkez', st_setsrid(st_makepoint(33.2400, 37.1700), 4326)::geography, array['type2', 'ccs'], 120, 'Hızlı şarj'),
  ('Sanayi Sitesi Şarj Noktası', 'Eşarj', 'Sanayi Sitesi giriş', 'Merkez', st_setsrid(st_makepoint(33.2340, 37.1730), 4326)::geography, array['type2'], 22, null),
  ('Otogar Şarj İstasyonu', 'ZES', 'Otogar otoparkı', 'Merkez', st_setsrid(st_makepoint(33.2340, 37.1720), 4326)::geography, array['type2', 'ccs'], 60, '24 saat hizmet');
