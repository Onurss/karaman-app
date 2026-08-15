create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  old_status order_status,
  new_status order_status not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz default now()
);

create index idx_status_history_order on order_status_history(order_id, created_at);

alter table order_status_history enable row level security;

create policy "view_status_history_via_order" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (
          o.user_id = auth.uid()
          or exists (
            select 1 from restaurant_users
            where restaurant_id = o.restaurant_id
              and user_id = auth.uid()
          )
        )
    )
  );

create or replace function log_order_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into order_status_history (order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_log_order_status
  after update of status on orders
  for each row execute function log_order_status_change();
