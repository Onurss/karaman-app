create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  cover_image_url text,
  phone text not null,
  email text,
  tax_office text,
  tax_number text,
  address text not null,
  location geography(point) not null,
  district text not null,
  cuisine_types text[] default '{}',
  rating numeric(2,1) default 0,
  review_count integer default 0,
  delivery_zone geography(polygon),
  min_order_amount numeric(10,2) default 0,
  delivery_fee numeric(10,2) default 0,
  estimated_delivery_minutes integer default 30,
  commission_rate numeric(5,2) default 10,
  subscription_tier subscription_tier,
  subscription_active boolean default true,
  is_active boolean default true,
  is_open boolean default true,
  working_hours jsonb default '{}'::jsonb,
  accepts_cash boolean default true,
  accepts_card_on_delivery boolean default true,
  accepts_online_payment boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_restaurants_location on restaurants using gist(location);
create index idx_restaurants_active on restaurants(is_active, is_open) where is_active = true;
create index idx_restaurants_slug on restaurants(slug);
create index idx_restaurants_district on restaurants(district);

create or replace function set_restaurants_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_restaurants_updated_at
  before update on restaurants
  for each row execute function set_restaurants_updated_at();

alter table restaurants enable row level security;

create policy "anyone_can_view_active_restaurants" on restaurants
  for select using (is_active = true);

-- NOT: restaurant_owners_can_update politikası restaurant_users tablosuna referans
-- verdiği için, o tablonun oluştuğu 000600 migration'ının sonuna taşındı
-- (aksi halde forward-reference → "relation restaurant_users does not exist").

create policy "admins_full_access_restaurants" on restaurants
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
