create table ad_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  click_url text,
  position banner_position not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  click_count integer default 0,
  view_count integer default 0,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_banners_active on ad_banners(position, is_active, starts_at, ends_at);

alter table ad_banners enable row level security;

create policy "anyone_views_active_banners" on ad_banners
  for select using (
    is_active = true
    and starts_at <= now()
    and ends_at >= now()
  );

create policy "admins_manage_banners" on ad_banners
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );

create or replace function increment_banner_view(banner_id uuid)
returns void as $$
begin
  update ad_banners set view_count = view_count + 1 where id = banner_id;
end;
$$ language plpgsql security definer;

create or replace function increment_banner_click(banner_id uuid)
returns void as $$
begin
  update ad_banners set click_count = click_count + 1 where id = banner_id;
end;
$$ language plpgsql security definer;
