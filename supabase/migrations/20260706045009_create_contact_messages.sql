create table public.contact_messages (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text not null,
    message text not null,
    status text not null default 'unread',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security
alter table public.contact_messages enable row level security;

-- Policies
-- Anyone can insert a contact message
create policy "Anyone can insert contact messages"
    on public.contact_messages for insert
    with check (true);

-- Only admins can view contact messages
create policy "Admins can view contact messages"
    on public.contact_messages for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Only admins can update contact messages
create policy "Admins can update contact messages"
    on public.contact_messages for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Only admins can delete contact messages
create policy "Admins can delete contact messages"
    on public.contact_messages for delete
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );
