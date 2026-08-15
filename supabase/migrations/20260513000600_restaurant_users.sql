create table restaurant_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role restaurant_user_role not null default 'staff',
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, user_id)
);

create index idx_restaurant_users_restaurant on restaurant_users(restaurant_id);
create index idx_restaurant_users_user on restaurant_users(user_id);

alter table restaurant_users enable row level security;

create policy "restaurant_users_view_own" on restaurant_users
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from restaurant_users ru2
      where ru2.restaurant_id = restaurant_users.restaurant_id
        and ru2.user_id = auth.uid()
        and ru2.role = 'owner'
    )
  );

create policy "owners_manage_restaurant_users" on restaurant_users
  for all using (
    exists (
      select 1 from restaurant_users ru2
      where ru2.restaurant_id = restaurant_users.restaurant_id
        and ru2.user_id = auth.uid()
        and ru2.role = 'owner'
    )
  );

create policy "admins_full_access_restaurant_users" on restaurant_users
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

-- restaurants tablosunun owner-update politikası burada tanımlanır: restaurant_users
-- bu migration'da oluştuğu için forward-reference olmadan referans verebilir.
create policy "restaurant_owners_can_update" on restaurants
  for update using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = restaurants.id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    )
  );
