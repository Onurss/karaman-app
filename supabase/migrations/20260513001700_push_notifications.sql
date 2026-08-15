create table push_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  deep_link text,
  image_url text,
  target_segment jsonb default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer default 0,
  delivered_count integer default 0,
  opened_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index idx_push_scheduled on push_notifications(scheduled_at)
  where sent_at is null;

alter table push_notifications enable row level security;

create policy "admins_manage_push" on push_notifications
  for all using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and raw_app_meta_data->>'role' = 'admin'
    )
  );
