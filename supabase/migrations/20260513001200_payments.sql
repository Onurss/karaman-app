create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  amount numeric(10,2) not null,
  currency text default 'TRY',
  status payment_status not null default 'pending',
  raw_response jsonb,
  created_at timestamptz default now()
);

create index idx_payments_order on payments(order_id);
create index idx_payments_provider on payments(provider, provider_payment_id);

alter table payments enable row level security;

create policy "view_payments_via_order" on payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = payments.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "admins_full_access_payments" on payments
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
