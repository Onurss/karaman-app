create table user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  full_address text not null,
  district text,
  building_no text,
  apartment_no text,
  floor text,
  note text,
  location geography(point) not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

create index idx_user_addresses_user on user_addresses(user_id);
create index idx_user_addresses_location on user_addresses using gist(location);

alter table user_addresses enable row level security;

create policy "users_manage_own_addresses" on user_addresses
  for all using (auth.uid() = user_id);

create or replace function ensure_single_default_address()
returns trigger as $$
begin
  if new.is_default = true then
    update user_addresses set is_default = false
    where user_id = new.user_id and id <> new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_ensure_single_default_address
  before insert or update on user_addresses
  for each row execute function ensure_single_default_address();
