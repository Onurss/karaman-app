create table user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type favorite_type not null,
  external_id text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(user_id, type, external_id)
);

create index idx_user_favorites_user_type on user_favorites(user_id, type);

alter table user_favorites enable row level security;

create policy "users_manage_own_favorites" on user_favorites
  for all using (auth.uid() = user_id);
