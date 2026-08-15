create table restaurant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  tier subscription_tier not null,
  monthly_fee numeric(10,2) not null,
  starts_at date not null,
  ends_at date not null,
  is_active boolean default true,
  payment_status text default 'pending',
  created_at timestamptz default now()
);

create index idx_subscriptions_restaurant on restaurant_subscriptions(restaurant_id, is_active);

alter table restaurant_subscriptions enable row level security;

create policy "restaurant_owners_view_subscriptions" on restaurant_subscriptions
  for select using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = restaurant_subscriptions.restaurant_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

create policy "admins_manage_subscriptions" on restaurant_subscriptions
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
