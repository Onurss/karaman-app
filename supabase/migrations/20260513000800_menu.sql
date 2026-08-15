create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_menu_categories_restaurant on menu_categories(restaurant_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  ingredients text[] default '{}',
  allergens text[] default '{}',
  is_available boolean default true,
  display_order integer default 0,
  variants jsonb default '[]'::jsonb,
  preparation_time_minutes integer,
  calories integer,
  is_spicy boolean default false,
  is_vegetarian boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_menu_items_restaurant on menu_items(restaurant_id);
create index idx_menu_items_category on menu_items(category_id);
create index idx_menu_items_available on menu_items(restaurant_id, is_available)
  where is_available = true;

create or replace function set_menu_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_menu_items_updated_at
  before update on menu_items
  for each row execute function set_menu_items_updated_at();

alter table menu_categories enable row level security;
alter table menu_items enable row level security;

create policy "anyone_views_menu_categories" on menu_categories for select using (true);
create policy "anyone_views_menu_items" on menu_items for select using (true);

create policy "restaurant_team_manages_categories" on menu_categories
  for all using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = menu_categories.restaurant_id
        and user_id = auth.uid()
    )
  );

create policy "restaurant_team_manages_items" on menu_items
  for all using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = menu_items.restaurant_id
        and user_id = auth.uid()
    )
  );
