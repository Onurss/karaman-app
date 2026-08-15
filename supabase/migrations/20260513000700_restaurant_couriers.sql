create table restaurant_couriers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  phone text not null,
  plate_number text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_couriers_restaurant on restaurant_couriers(restaurant_id);

alter table restaurant_couriers enable row level security;

create policy "restaurant_team_manages_couriers" on restaurant_couriers
  for all using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = restaurant_couriers.restaurant_id
        and user_id = auth.uid()
        and is_active = true
    )
  );
