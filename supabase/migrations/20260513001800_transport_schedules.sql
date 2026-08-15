create table transport_schedules (
  id uuid primary key default gen_random_uuid(),
  type transport_type not null,
  route_name text not null,
  from_location text not null,
  to_location text not null,
  departure_time time not null,
  arrival_time time,
  days_of_week integer[] not null,
  operator text,
  price numeric(10,2),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_transport_type_active on transport_schedules(type, is_active);

alter table transport_schedules enable row level security;

create policy "anyone_views_active_transport" on transport_schedules
  for select using (is_active = true);

create policy "admins_manage_transport" on transport_schedules
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
