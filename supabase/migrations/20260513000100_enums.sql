-- Tüm enum'lar tek yerde — TypeScript paketindeki enums.ts ile birebir senkron tutulmalı.

create type order_status as enum (
  'pending', 'confirmed', 'preparing', 'ready',
  'on_the_way', 'delivered', 'cancelled'
);

create type payment_method as enum (
  'iyzico', 'garanti_pos', 'cash_on_delivery', 'card_on_delivery'
);

create type payment_status as enum (
  'pending', 'paid', 'failed', 'refunded'
);

create type restaurant_user_role as enum (
  'owner', 'manager', 'staff'
);

create type subscription_tier as enum (
  'bronze', 'silver', 'gold'
);

create type banner_position as enum (
  'home_hero', 'news_list', 'food_tab', 'discover'
);

create type transport_type as enum ('bus', 'train');

create type favorite_type as enum (
  'news', 'company', 'listing', 'event', 'restaurant'
);
