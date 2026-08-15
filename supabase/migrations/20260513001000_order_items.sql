create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  item_name_snapshot text not null,
  item_image_snapshot text,
  item_price_snapshot numeric(10,2) not null,
  quantity integer not null default 1 check (quantity > 0),
  variants jsonb default '[]'::jsonb,
  note text,
  total_price numeric(10,2) not null
);

create index idx_order_items_order on order_items(order_id);

alter table order_items enable row level security;

create policy "view_order_items_via_order" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
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

create policy "insert_order_items_via_own_order" on order_items
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );
