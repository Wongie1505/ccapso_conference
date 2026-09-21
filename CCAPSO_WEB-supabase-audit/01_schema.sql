-- CCAPSO fundraiser: first database setup
-- Run this entire script once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline text,
  conference_dates text,
  venue text,
  fee numeric(12,2) not null default 0 check (fee >= 0),
  registration_fee text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create table public.committee_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create index attendees_event_id_idx on public.attendees(event_id);
create index payment_methods_event_id_idx on public.payment_methods(event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger attendees_set_updated_at
before update on public.attendees
for each row execute function public.set_updated_at();

create or replace function public.is_committee_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.committee_members
    where user_id = auth.uid()
  );
$$;

alter table public.events enable row level security;
alter table public.attendees enable row level security;
alter table public.payment_methods enable row level security;
alter table public.committee_members enable row level security;

revoke all on public.events, public.attendees,
  public.payment_methods, public.committee_members
from anon, authenticated;

grant select on public.events, public.attendees, public.payment_methods to anon, authenticated;
grant select, insert, update, delete on public.events, public.attendees, public.payment_methods to authenticated;
grant select on public.committee_members to authenticated;

create policy "public can read public events"
on public.events for select to anon, authenticated
using (is_public = true or public.is_committee_member());

create policy "committee can manage events"
on public.events for all to authenticated
using (public.is_committee_member())
with check (public.is_committee_member());

create policy "public can read attendees for public events"
on public.attendees for select to anon, authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (e.is_public = true or public.is_committee_member())
  )
);

create policy "committee can manage attendees"
on public.attendees for all to authenticated
using (public.is_committee_member())
with check (public.is_committee_member());

create policy "public can read payment methods for public events"
on public.payment_methods for select to anon, authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (e.is_public = true or public.is_committee_member())
  )
);

create policy "committee can manage payment methods"
on public.payment_methods for all to authenticated
using (public.is_committee_member())
with check (public.is_committee_member());

create policy "committee can read committee members"
on public.committee_members for select to authenticated
using (public.is_committee_member());

insert into public.events (
  title, deadline, conference_dates, venue, fee, registration_fee
)
values (
  '2026 National Conference',
  '26 October 2026',
  '30 October – 1 November 2026',
  'Mzuzu University (MZUNI)',
  70000,
  'MK 10,000 (registration)'
);

-- Confirm what was created.
select id, title, fee from public.events;
