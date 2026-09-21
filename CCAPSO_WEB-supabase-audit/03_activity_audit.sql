-- CCAPSO fundraiser: activity log and audit trail
-- Run this once in Supabase SQL Editor after 01_schema.sql.

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index activity_logs_actor_id_idx on public.activity_logs(actor_id);

alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from anon, authenticated;
grant select on public.activity_logs to authenticated;

create policy "committee can read activity logs"
on public.activity_logs for select to authenticated
using (public.is_committee_member());

create or replace function public.record_activity(
  p_action text,
  p_entity_type text default 'system',
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.activity_logs (
    actor_id, actor_email, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(), u.email, p_action, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  from auth.users u
  where u.id = auth.uid();
end;
$$;

grant execute on function public.record_activity(text, text, uuid, jsonb) to authenticated;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_id uuid;
  old_record jsonb;
  new_record jsonb;
begin
  if tg_op = 'DELETE' then
    changed_id := old.id;
    old_record := to_jsonb(old);
    new_record := null;
  elsif tg_op = 'INSERT' then
    changed_id := new.id;
    old_record := null;
    new_record := to_jsonb(new);
  else
    changed_id := new.id;
    old_record := to_jsonb(old);
    new_record := to_jsonb(new);
  end if;

  insert into public.activity_logs (
    actor_id, actor_email, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(), u.email, lower(tg_op), tg_table_name, changed_id,
    jsonb_build_object('old', old_record, 'new', new_record)
  from auth.users u
  where u.id = auth.uid();

  return coalesce(new, old);
end;
$$;

create trigger events_activity_audit
after insert or update or delete on public.events
for each row execute function public.audit_row_change();

create trigger attendees_activity_audit
after insert or update or delete on public.attendees
for each row execute function public.audit_row_change();

create trigger payment_methods_activity_audit
after insert or update or delete on public.payment_methods
for each row execute function public.audit_row_change();

select id, action, entity_type, actor_email, created_at
from public.activity_logs
order by created_at desc
limit 20;
