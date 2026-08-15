create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default (
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
    substring(gen_random_uuid()::text from 1 for 8)
  ),
  user_id uuid not null references profiles(id),
  restaurant_id uuid not null references restaurants(id),

  delivery_address_id uuid references user_addresses(id) on delete set null,
  delivery_address_snapshot jsonb not null,
  delivery_location geography(point) not null,

  status order_status not null default 'pending',

  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',

  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,
  vat_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,

  courier_id uuid references restaurant_couriers(id),
  estimated_delivery_minutes integer,

  customer_note text,

  created_at timestamptz default now(),
  confirmed_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  on_the_way_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);

create index idx_orders_user on orders(user_id, created_at desc);
create index idx_orders_restaurant_active on orders(restaurant_id, status)
  where status not in ('delivered', 'cancelled');
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

alter table orders enable row level security;

create policy "users_view_own_orders" on orders
  for select using (user_id = auth.uid());

create policy "users_create_orders" on orders
  for insert with check (user_id = auth.uid());

create policy "users_update_own_pending_orders" on orders
  for update using (
    user_id = auth.uid()
    and status in ('pending', 'confirmed')
  );

create policy "restaurant_team_views_restaurant_orders" on orders
  for select using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = orders.restaurant_id
        and user_id = auth.uid()
    )
  );

create policy "restaurant_team_updates_restaurant_orders" on orders
  for update using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = orders.restaurant_id
        and user_id = auth.uid()
    )
  );

create policy "admins_full_access_orders" on orders
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Status değiştiğinde ilgili timestamp'i otomatik set et
create or replace function set_order_status_timestamps()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then new.confirmed_at = coalesce(new.confirmed_at, now());
      when 'preparing' then new.preparing_at = coalesce(new.preparing_at, now());
      when 'ready' then new.ready_at = coalesce(new.ready_at, now());
      when 'on_the_way' then new.on_the_way_at = coalesce(new.on_the_way_at, now());
      when 'delivered' then new.delivered_at = coalesce(new.delivered_at, now());
      when 'cancelled' then new.cancelled_at = coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_order_status_timestamps
  before update on orders
  for each row execute function set_order_status_timestamps();
