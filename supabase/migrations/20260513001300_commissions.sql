create table commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id),
  restaurant_id uuid not null references restaurants(id),
  order_total numeric(10,2) not null,
  commission_rate numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  payout_date date,
  created_at timestamptz default now()
);

create index idx_commissions_restaurant on commissions(restaurant_id, status);

alter table commissions enable row level security;

create policy "restaurant_owners_view_commissions" on commissions
  for select using (
    exists (
      select 1 from restaurant_users
      where restaurant_id = commissions.restaurant_id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    )
  );

create policy "admins_manage_commissions" on commissions
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
