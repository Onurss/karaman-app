create table app_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  target_screen text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

create index idx_campaigns_active on app_campaigns(is_active, starts_at, ends_at);

alter table app_campaigns enable row level security;

create policy "anyone_views_active_campaigns" on app_campaigns
  for select using (
    is_active = true
    and starts_at <= now()
    and ends_at >= now()
  );

create policy "admins_manage_campaigns" on app_campaigns
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
