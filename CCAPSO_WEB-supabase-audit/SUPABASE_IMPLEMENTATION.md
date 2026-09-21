# Supabase implementation for the fundraiser tracker

## Target architecture

The browser uses the Supabase JavaScript client with the public project URL and publishable key. Supabase Auth manages committee login. PostgreSQL stores events, attendees, payments, committee membership, and audit records. Row Level Security (RLS) decides what an anonymous visitor and an authenticated committee member can do.

```text
Public visitor
    |  read-only public data
    v
Supabase Data API + RLS  <--- committee user session
    |                              |
    v                              v
Postgres tables              Auth users
    |
    +-- payment transactions
    +-- audit log

Browser exports the rows as CSV and JSON.
```

The browser key is allowed to be public. The `service_role` key must never be placed in HTML, CSS, JavaScript, GitHub, or a public hosting environment.

## 1. Create the Supabase project

Create a project at [Supabase](https://supabase.com/). In **Project Settings → API**, copy:

- The Project URL.
- The Publishable key. Older projects may label this the `anon` key.

In **Authentication → Providers**, enable Email. For a small committee, it is safer to create committee accounts yourself or invite them than to leave unrestricted public sign-up enabled.

In **Authentication → URL Configuration**, add the exact URL where the fundraiser will be hosted. Add your local development URL as well, such as `http://localhost:5500`.

## 2. Create the database schema

Open **SQL Editor** and run the following migration. This is designed for one fundraiser project with one committee. Add an `event_members` table later if the same database will host many independent committees.

```sql
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

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text,
  reference text,
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table public.committee_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index attendees_event_id_idx on public.attendees(event_id);
create index payment_transactions_attendee_id_idx on public.payment_transactions(attendee_id);
create index audit_logs_changed_at_idx on public.audit_logs(changed_at desc);
```

The current `attendees.amount_paid` column keeps the existing UI simple. The `payment_transactions` table gives you a proper history. In the next iteration, record every contribution in `payment_transactions` and update `amount_paid` from the transaction total, preferably through a database function rather than allowing arbitrary direct edits.

## 3. Add timestamps and audit logging

Run this after the schema:

```sql
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

create or replace function public.write_audit_log()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.audit_logs (
    table_name, record_id, operation, old_data, new_data, changed_by
  ) values (
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create trigger attendees_audit
after insert or update or delete on public.attendees
for each row execute function public.write_audit_log();

create trigger transactions_audit
after insert or update or delete on public.payment_transactions
for each row execute function public.write_audit_log();
```

Do not allow committee users to edit `audit_logs`. The trigger writes it automatically. An audit log is useful only if normal users cannot rewrite or delete it.

## 4. Add the first committee user

First create the user in **Authentication → Users → Add user**. Copy that user's UUID. Then run:

```sql
insert into public.committee_members (user_id, role)
values ('PASTE_AUTH_USER_UUID_HERE', 'admin');
```

Do not put a shared PIN in the frontend. Each committee member should have an individual account. This makes the audit log identify who changed a payment.

## 5. Enable RLS and create policies

Run this SQL after the tables exist. The public visitor can read only rows belonging to public events. Only committee members can modify data. Payment transactions and audit logs remain private.

```sql
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
alter table public.payment_transactions enable row level security;
alter table public.committee_members enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.events, public.attendees,
  public.payment_transactions, public.committee_members,
  public.audit_logs from anon, authenticated;

grant select on public.events to anon, authenticated;
grant select on public.attendees to anon, authenticated;
grant select, insert, update, delete on public.events, public.attendees to authenticated;
grant select, insert, update, delete on public.payment_transactions to authenticated;
grant select on public.audit_logs to authenticated;
```

The actual policies are:

```sql
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

create policy "committee can manage payment transactions"
on public.payment_transactions for all to authenticated
using (public.is_committee_member())
with check (public.is_committee_member());

create policy "committee can read its member list"
on public.committee_members for select to authenticated
using (public.is_committee_member());

create policy "committee can read audit logs"
on public.audit_logs for select to authenticated
using (public.is_committee_member());
```

For a production app, also revoke direct delete access and replace destructive deletes with a soft-delete column such as `deleted_at`.

## 6. Connect the vanilla frontend

Add the Supabase CDN script before `app.js` in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="data.js"></script>
<script src="supabase-config.js"></script>
<script src="app.js"></script>
```

Create `supabase-config.js`:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_PUBLISHABLE_KEY";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
```

The publishable key is designed to be used in the browser. Never substitute the `service_role` key here.

## 7. Implement committee login

Add a login form with email and password fields. The core JavaScript is:

```js
async function signInCommittee(email, password) {
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data.user;
}

async function signOutCommittee() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

db.auth.onAuthStateChange((_event, session) => {
  const loggedIn = Boolean(session?.user);
  document.body.classList.toggle('committee-mode', loggedIn);
  render();
});
```

After login, do not assume that a valid Auth user is a committee member. RLS checks `committee_members`, so an authenticated but unapproved account will still have no write access.

## 8. Load the shared data

Replace the local-only initialization with database reads:

```js
const EVENT_ID = "PASTE_EVENT_UUID_HERE";

async function loadSharedState() {
  const [{ data: event, error: eventError }, { data: attendees, error: attendeeError }] =
    await Promise.all([
      db.from('events').select('*').eq('id', EVENT_ID).single(),
      db.from('attendees').select('*').eq('event_id', EVENT_ID).order('name')
    ]);

  if (eventError) throw eventError;
  if (attendeeError) throw attendeeError;

  state = {
    eventTitle: event.title,
    deadline: event.deadline,
    dates: event.conference_dates,
    venue: event.venue,
    fee: Number(event.fee),
    regFee: event.registration_fee || '',
    attendees: attendees.map(row => ({
      id: row.id,
      name: row.name,
      paid: Number(row.amount_paid)
    }))
  };

  render();
}
```

Keep `localStorage` as a cache only. When a save succeeds, update the cache. When the database is unavailable, clearly tell the user that the change has not been shared.

## 9. Save attendees safely

For the existing simple UI, update the attendee summary:

```js
async function saveAttendee(attendee) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please sign in first.');

  const payload = {
    event_id: EVENT_ID,
    name: attendee.name.trim(),
    amount_paid: Number(attendee.paid || 0),
    updated_by: user.id
  };

  const query = attendee.id
    ? db.from('attendees').update(payload).eq('id', attendee.id)
    : db.from('attendees').insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
```

For the proper payment-history version, do not overwrite `amount_paid` when someone pays. Insert a transaction instead:

```js
async function recordPayment({ attendeeId, amount, method, reference, note }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please sign in first.');

  const { data, error } = await db
    .from('payment_transactions')
    .insert({
      attendee_id: attendeeId,
      amount: Number(amount),
      method: method?.trim() || null,
      reference: reference?.trim() || null,
      note: note?.trim() || null,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

The next database migration should calculate an attendee's total from `payment_transactions`. Until then, either keep `amount_paid` synchronized in one server-side function or treat direct amount edits as an administrative correction that is recorded in the audit log.

## 10. Add CSV export

Fetch only the rows the current user is allowed to see, then generate a CSV in the browser:

```js
function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(rows, filename) {
  const headers = ['Name', 'Fee', 'Amount Paid', 'Balance', 'Status'];
  const lines = [headers.map(csvCell).join(',')];

  for (const row of rows) {
    const balance = Math.max(Number(state.fee) - Number(row.paid || 0), 0);
    const status = balance === 0 ? 'Paid in full' : row.paid > 0 ? 'Partial' : 'Not paid';
    lines.push([
      row.name,
      state.fee,
      row.paid,
      balance,
      status
    ].map(csvCell).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

For an administrator export, query `payment_transactions` after login and include payment date, method, reference, recorder, and amount. Do not expose those fields to anonymous visitors.

## 11. Add JSON backup and restore

A JSON backup can contain the current event, attendees, transactions, and an export timestamp. For restore, validate every field before sending changes to Supabase. Do not replace the database in one unvalidated bulk operation.

```js
function downloadJson(value, filename) {
  const blob = new Blob(
    [JSON.stringify(value, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

## Recommended implementation order

First, create the project, schema, first committee user, RLS policies, and event row. Second, connect the existing page and replace `localStorage` reads with `loadSharedState()`. Third, replace the PIN modal with email/password login. Fourth, add CSV export. Fifth, add payment transactions and the audit-log screen. Finally, add JSON restore after validation and testing.

Before publishing, test these cases with two different accounts:

1. A signed-out visitor can read public event and attendee data.
2. A signed-out visitor cannot insert, update, or delete anything.
3. A signed-in non-committee user cannot modify anything.
4. A committee editor can add and update attendees.
5. A committee editor can record a payment transaction.
6. A committee user can read audit logs but cannot modify or delete them.
7. A deleted or disabled Auth user loses write access.

## References

[1]: https://supabase.com/docs/reference/javascript/installing "Supabase JavaScript installation and browser client"
[2]: https://supabase.com/docs/guides/auth/passwords "Supabase password-based authentication"
[3]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[4]: https://supabase.com/docs/reference/javascript/select "Supabase JavaScript database query reference"
