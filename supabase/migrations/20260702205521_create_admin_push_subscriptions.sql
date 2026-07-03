create table public.admin_push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  subscription jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admin_push_subscriptions enable row level security;

-- Only authenticated users (admins) can insert/view
create policy "Admins can manage push subscriptions"
  on public.admin_push_subscriptions
  for all
  to authenticated
  using (true)
  with check (true);
