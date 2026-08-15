create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  karaman_user_id integer unique not null,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  push_token text,
  notification_enabled boolean default true,
  language text default 'tr',
  kvkk_accepted_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_karaman_user on profiles(karaman_user_id);
create index idx_profiles_email on profiles(email);

create or replace function set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_profiles_updated_at();

alter table profiles enable row level security;

create policy "users_view_own_profile" on profiles
  for select using (auth.uid() = id);

create policy "users_update_own_profile" on profiles
  for update using (auth.uid() = id);

create policy "users_insert_own_profile" on profiles
  for insert with check (auth.uid() = id);

create policy "admins_full_access_profiles" on profiles
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
