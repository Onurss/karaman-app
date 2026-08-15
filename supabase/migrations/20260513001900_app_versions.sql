create table app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android')),
  version text not null,
  build_number integer not null,
  is_force_update boolean default false,
  is_maintenance_mode boolean default false,
  release_notes text,
  created_at timestamptz default now(),
  unique(platform, version)
);

create index idx_app_versions_platform on app_versions(platform, build_number desc);

alter table app_versions enable row level security;

create policy "anyone_views_versions" on app_versions for select using (true);

create policy "admins_manage_versions" on app_versions
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
