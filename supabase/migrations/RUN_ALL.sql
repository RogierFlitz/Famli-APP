-- Famli: run all migrations in order (Supabase SQL Editor)
-- Generated: 2026-08-26 13:59
--
-- ORDER: 0001 → 0006 (apply + test P0 Week 1), then 0007 separately after sign-off.
-- Section 0007 is included below but must NOT run until 0006 is tested.
-- See docs/security-advisor-0007-testplan.md

-- =============================================================================
-- SECTION: 0001_init.sql
-- =============================================================================

-- Nestly family / co-parenting schema
-- Run in the Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  phone text,
  locale text not null default 'nl-NL',
  timezone text not null default 'Europe/Amsterdam',
  notification_prefs jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id),
  plan text not null default 'free' check (plan in ('free', 'plus', 'family')),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  trial_end timestamptz,
  feature_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid references public.profiles (id),
  role text not null check (role in ('owner', 'parent', 'guardian', 'viewer')),
  parent_label text not null,
  display_color text not null default '#3B82F6',
  invited_email text,
  status text not null default 'active' check (status in ('active', 'invited', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_family_role(fid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
      and status = 'active'
      and role = any (roles)
  );
$$;

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  date_of_birth date,
  photo_url text,
  school text,
  class_name text,
  doctor text,
  dentist text,
  daycare text,
  sports jsonb not null default '[]'::jsonb,
  clothing_size text,
  shoe_size text,
  emergency_contacts jsonb not null default '[]'::jsonb,
  notes text,
  color text not null default '#FBBF24',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.child_guardians (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  relationship text not null default '',
  is_primary boolean not null default true,
  unique (child_id, member_id)
);

create table public.custody_schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  pattern_type text not null
    check (pattern_type in ('week_on_week_off', 'two_two_three', 'fixed_weekdays', 'custom')),
  config jsonb not null,
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.custody_occurrences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  schedule_id uuid references public.custody_schedules (id),
  child_id uuid references public.children (id),
  date date not null,
  custodian_member_id uuid not null references public.family_members (id),
  is_override boolean not null default false,
  source text not null default 'schedule'
    check (source in ('schedule', 'change_request', 'manual')),
  original_custodian_member_id uuid references public.family_members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index custody_occurrences_family_date_child
  on public.custody_occurrences (family_id, date, (coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid)));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in (
    'verblijf', 'overdracht', 'school', 'sport', 'medisch', 'opvang',
    'vakantie', 'verjaardag', 'activiteit', 'overig'
  )),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  notes text,
  packing_list jsonb not null default '[]'::jsonb,
  handover_id uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  member_id uuid references public.family_members (id) on delete cascade
);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  event_id uuid references public.events (id),
  date date not null,
  time time not null,
  from_member_id uuid not null references public.family_members (id),
  to_member_id uuid not null references public.family_members (id),
  location text,
  pickup_member_id uuid references public.family_members (id),
  dropoff_member_id uuid references public.family_members (id),
  notes text,
  packing_list jsonb not null default '[]'::jsonb,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.handover_children (
  handover_id uuid not null references public.handovers (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  primary key (handover_id, child_id)
);

alter table public.events
  add constraint events_handover_fk
  foreign key (handover_id) references public.handovers (id);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  type text not null check (type in ('swap_day', 'extra_day', 'pickup', 'pickup_time', 'location', 'vacation', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'alternative_proposed', 'cancelled')),
  requested_by_member_id uuid not null references public.family_members (id),
  target_date date not null,
  payload jsonb not null default '{}'::jsonb,
  message text not null default '',
  response_message text,
  alternative_payload jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  child_id uuid references public.children (id),
  assignee_member_id uuid references public.family_members (id),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  date date not null,
  child_id uuid references public.children (id),
  category text not null check (category in (
    'school', 'kleding', 'sport', 'medisch', 'opvang', 'activiteit', 'zakgeld', 'overig'
  )),
  paid_by_member_id uuid not null references public.family_members (id),
  receipt_url text,
  notes text,
  recurring_expense_id uuid,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete restrict,
  member_id uuid not null references public.family_members (id),
  share_cents integer not null,
  share_percent numeric(5, 2) not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived'))
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  description text not null,
  amount_cents integer not null,
  currency text not null default 'EUR',
  category text not null,
  interval text not null check (interval in ('monthly', 'quarterly', 'yearly', 'custom')),
  interval_config jsonb not null default '{}'::jsonb,
  next_due_date date not null,
  paid_by_member_id uuid not null references public.family_members (id),
  split_percents jsonb not null default '{}'::jsonb,
  child_id uuid references public.children (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

alter table public.expenses
  add constraint expenses_recurring_fk
  foreign key (recurring_expense_id) references public.recurring_expenses (id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.children (id),
  title text not null,
  category text not null check (category in (
    'identiteit', 'school', 'medisch', 'verzekering', 'overeenkomst', 'sport', 'overig'
  )),
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  type text not null,
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'push')),
  created_at timestamptz not null default now()
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'apple_ics')),
  privacy_mode text not null default 'busy' check (privacy_mode in ('full', 'busy', 'hidden')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'pending', 'connected', 'error')),
  sync_outbound boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null,
  role text not null default 'parent',
  parent_label text not null,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vacations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('school', 'holiday', 'own', 'with_parent')),
  with_member_id uuid references public.family_members (id),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned'
    check (status in ('planned', 'requested', 'accepted', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create index idx_family_members_user on public.family_members (user_id);
create index idx_family_members_family on public.family_members (family_id);
create index idx_children_family on public.children (family_id);
create index idx_events_family_starts on public.events (family_id, starts_at);
create index idx_occurrences_family_date on public.custody_occurrences (family_id, date);
create index idx_handovers_family_date on public.handovers (family_id, date);
create index idx_change_requests_family_status on public.change_requests (family_id, status);
create index idx_tasks_family_status on public.tasks (family_id, status);
create index idx_expenses_family_date on public.expenses (family_id, date);
create index idx_notifications_user on public.notifications (user_id, read_at);
create index idx_activity_log_family on public.activity_log (family_id, created_at desc);
create index idx_documents_family on public.documents (family_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'families', 'family_members', 'children', 'custody_schedules',
    'custody_occurrences', 'events', 'handovers', 'change_requests', 'tasks',
    'expenses', 'recurring_expenses', 'documents', 'calendar_connections', 'vacations'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.child_guardians enable row level security;
alter table public.custody_schedules enable row level security;
alter table public.custody_occurrences enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.handovers enable row level security;
alter table public.handover_children enable row level security;
alter table public.change_requests enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.activity_log enable row level security;
alter table public.invites enable row level security;
alter table public.vacations enable row level security;

create policy "profiles_self" on public.profiles
  for select using (id = auth.uid() or id in (
    select fm.user_id from public.family_members fm
    where fm.family_id in (select family_id from public.family_members where user_id = auth.uid() and status = 'active')
      and fm.user_id is not null
  ));

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

create policy "families_member_read" on public.families
  for select using (public.is_family_member(id));

create policy "families_owner_update" on public.families
  for update using (public.has_family_role(id, array['owner']));

create policy "families_insert" on public.families
  for insert with check (created_by = auth.uid());

create policy "members_read" on public.family_members
  for select using (public.is_family_member(family_id));

create policy "members_write" on public.family_members
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "children_member" on public.children
  for select using (public.is_family_member(family_id));

create policy "children_write" on public.children
  for all using (public.has_family_role(family_id, array['owner', 'parent', 'guardian']));

create policy "guardians_read" on public.child_guardians
  for select using (
    exists (
      select 1 from public.children c
      where c.id = child_id and public.is_family_member(c.family_id)
    )
  );

create policy "guardians_write" on public.child_guardians
  for all using (
    exists (
      select 1 from public.children c
      where c.id = child_id and public.has_family_role(c.family_id, array['owner', 'parent'])
    )
  );

create policy "schedules_member" on public.custody_schedules
  for select using (public.is_family_member(family_id));
create policy "schedules_write" on public.custody_schedules
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "occurrences_member" on public.custody_occurrences
  for select using (public.is_family_member(family_id));
create policy "occurrences_write" on public.custody_occurrences
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "events_member" on public.events
  for select using (public.is_family_member(family_id));
create policy "events_write" on public.events
  for all using (public.has_family_role(family_id, array['owner', 'parent', 'guardian']));

create policy "event_participants_member" on public.event_participants
  for select using (
    exists (select 1 from public.events e where e.id = event_id and public.is_family_member(e.family_id))
  );
create policy "event_participants_write" on public.event_participants
  for all using (
    exists (select 1 from public.events e where e.id = event_id and public.has_family_role(e.family_id, array['owner', 'parent', 'guardian']))
  );

create policy "handovers_member" on public.handovers
  for select using (public.is_family_member(family_id));
create policy "handovers_write" on public.handovers
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "handover_children_member" on public.handover_children
  for select using (
    exists (select 1 from public.handovers h where h.id = handover_id and public.is_family_member(h.family_id))
  );
create policy "handover_children_write" on public.handover_children
  for all using (
    exists (select 1 from public.handovers h where h.id = handover_id and public.has_family_role(h.family_id, array['owner', 'parent']))
  );

create policy "change_requests_member" on public.change_requests
  for select using (public.is_family_member(family_id));
create policy "change_requests_write" on public.change_requests
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "tasks_member" on public.tasks
  for select using (public.is_family_member(family_id));
create policy "tasks_write" on public.tasks
  for all using (public.has_family_role(family_id, array['owner', 'parent', 'guardian']));

create policy "expenses_member" on public.expenses
  for select using (public.is_family_member(family_id));
create policy "expenses_write" on public.expenses
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "splits_member" on public.expense_splits
  for select using (
    exists (select 1 from public.expenses e where e.id = expense_id and public.is_family_member(e.family_id))
  );
create policy "splits_write" on public.expense_splits
  for all using (
    exists (select 1 from public.expenses e where e.id = expense_id and public.has_family_role(e.family_id, array['owner', 'parent']))
  );

create policy "recurring_member" on public.recurring_expenses
  for select using (public.is_family_member(family_id));
create policy "recurring_write" on public.recurring_expenses
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "documents_member" on public.documents
  for select using (public.is_family_member(family_id));
create policy "documents_write" on public.documents
  for all using (public.has_family_role(family_id, array['owner', 'parent', 'guardian']));

create policy "notifications_self" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications_insert_member" on public.notifications
  for insert with check (public.is_family_member(family_id));

create policy "calendar_self" on public.calendar_connections
  for all using (user_id = auth.uid());

create policy "activity_member" on public.activity_log
  for select using (public.is_family_member(family_id));
create policy "activity_insert" on public.activity_log
  for insert with check (public.is_family_member(family_id));

create policy "invites_member" on public.invites
  for select using (public.is_family_member(family_id));
create policy "invites_write" on public.invites
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

create policy "vacations_member" on public.vacations
  for select using (public.is_family_member(family_id));
create policy "vacations_write" on public.vacations
  for all using (public.has_family_role(family_id, array['owner', 'parent']));

insert into storage.buckets (id, name, public)
values ('family-documents', 'family-documents', false)
on conflict (id) do nothing;

create policy "storage_family_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
);

create policy "storage_family_write"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and public.has_family_role((storage.foldername(name))[1]::uuid, array['owner', 'parent', 'guardian'])
);


-- =============================================================================
-- SECTION: 0002_security_foundation.sql
-- =============================================================================

-- Famli security foundation: permissions, child access, audit log, hardened RLS

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------

alter table public.family_members
  add column if not exists relation_type text not null default 'ouder'
    check (relation_type in ('ouder', 'partner', 'bonusouder', 'opa_oma', 'verzorger', 'oppas', 'anders')),
  add column if not exists permission_preset text not null default 'custom'
    check (permission_preset in ('practical', 'involved', 'custom')),
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists household_id uuid,
  add column if not exists contact_only boolean not null default false,
  add column if not exists linked_parent_member_id uuid references public.family_members (id),
  add column if not exists phone text;

alter table public.families
  add column if not exists is_demo boolean not null default false;

create table if not exists public.child_member_access (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (member_id, child_id)
);

create index if not exists idx_child_member_access_family on public.child_member_access (family_id);
create index if not exists idx_child_member_access_member on public.child_member_access (member_id);
create index if not exists idx_child_member_access_child on public.child_member_access (child_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  actor_user_id uuid not null references public.profiles (id),
  action text not null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_family_created on public.audit_log (family_id, created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_user_id, created_at desc);

alter table public.invites
  add column if not exists revoked_at timestamptz,
  add column if not exists invited_by_member_id uuid references public.family_members (id),
  add column if not exists member_id uuid references public.family_members (id),
  add column if not exists relation_type text default 'partner',
  add column if not exists permission_preset text default 'involved',
  add column if not exists token_hash text;

-- Replace UUID token default with secure random when inserting via app
comment on column public.invites.token is 'Legacy UUID token; prefer token_hash for new invites';

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.current_member_id(fid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.family_members
  where family_id = fid
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_parent_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
      and status = 'active'
      and (role in ('owner', 'parent') or relation_type = 'ouder')
      and contact_only = false
  );
$$;

create or replace function public.member_capability(fid uuid, cap text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_parent_member(fid) then true
    else coalesce(
      (select (permissions ->> cap)::boolean
       from public.family_members
       where family_id = fid
         and user_id = auth.uid()
         and status = 'active'
         and contact_only = false
       limit 1),
      false
    )
  end;
$$;

create or replace function public.can_view_child(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    where c.id = cid
      and public.is_family_member(c.family_id)
      and (
        public.is_parent_member(c.family_id)
        or exists (
          select 1
          from public.child_member_access cma
          join public.family_members fm on fm.id = cma.member_id
          where cma.child_id = cid
            and fm.user_id = auth.uid()
            and fm.status = 'active'
            and cma.can_view = true
        )
      )
  );
$$;

create or replace function public.can_edit_child(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    where c.id = cid
      and public.is_family_member(c.family_id)
      and (
        public.is_parent_member(c.family_id)
        or exists (
          select 1
          from public.child_member_access cma
          join public.family_members fm on fm.id = cma.member_id
          where cma.child_id = cid
            and fm.user_id = auth.uid()
            and fm.status = 'active'
            and cma.can_edit = true
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: child_member_access & audit_log
-- ---------------------------------------------------------------------------

alter table public.child_member_access enable row level security;

drop policy if exists "child_access_select" on public.child_member_access;
create policy "child_access_select" on public.child_member_access
  for select using (public.is_family_member(family_id));

drop policy if exists "child_access_write" on public.child_member_access;
create policy "child_access_write" on public.child_member_access
  for all using (
    public.has_family_role(family_id, array['owner', 'parent'])
    or public.member_capability(family_id, 'manage_family_members')
  );

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log
  for select using (public.is_family_member(family_id));

drop policy if exists "audit_log_insert" on public.audit_log;
create policy "audit_log_insert" on public.audit_log
  for insert with check (
    public.is_family_member(family_id)
    and actor_user_id = auth.uid()
  );

-- Audit log is append-only for normal users (no update/delete policies)

-- ---------------------------------------------------------------------------
-- Hardened policies: replace overly broad role checks where needed
-- ---------------------------------------------------------------------------

drop policy if exists "children_member" on public.children;
drop policy if exists "children_write" on public.children;
drop policy if exists "children_select" on public.children;
drop policy if exists "children_insert" on public.children;
drop policy if exists "children_update" on public.children;
drop policy if exists "children_delete" on public.children;

create policy "children_select" on public.children
  for select using (public.can_view_child(id));

create policy "children_insert" on public.children
  for insert with check (
    public.is_family_member(family_id)
    and public.is_parent_member(family_id)
  );

create policy "children_update" on public.children
  for update using (public.can_edit_child(id));

create policy "children_delete" on public.children
  for delete using (public.has_family_role(family_id, array['owner']));

drop policy if exists "expenses_member" on public.expenses;
drop policy if exists "expenses_write" on public.expenses;
drop policy if exists "expenses_select" on public.expenses;
drop policy if exists "expenses_insert" on public.expenses;
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;

create policy "expenses_select" on public.expenses
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_expenses')
  );

create policy "expenses_insert" on public.expenses
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "expenses_update" on public.expenses
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "expenses_delete" on public.expenses
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_expenses')
  );

drop policy if exists "documents_member" on public.documents;
drop policy if exists "documents_write" on public.documents;
drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;
drop policy if exists "documents_delete" on public.documents;

create policy "documents_select" on public.documents
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_documents')
    and (child_id is null or public.can_view_child(child_id))
  );

create policy "documents_insert" on public.documents
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'upload_documents')
  );

create policy "documents_update" on public.documents
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'upload_documents')
  );

create policy "documents_delete" on public.documents
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'upload_documents')
  );

drop policy if exists "schedules_member" on public.custody_schedules;
drop policy if exists "schedules_write" on public.custody_schedules;
drop policy if exists "schedules_select" on public.custody_schedules;

create policy "schedules_select" on public.custody_schedules
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "schedules_write" on public.custody_schedules
  for all using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

drop policy if exists "occurrences_member" on public.custody_occurrences;
drop policy if exists "occurrences_write" on public.custody_occurrences;
drop policy if exists "occurrences_select" on public.custody_occurrences;

create policy "occurrences_select" on public.custody_occurrences
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "occurrences_write" on public.custody_occurrences
  for all using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

drop policy if exists "invites_member" on public.invites;
drop policy if exists "invites_write" on public.invites;
drop policy if exists "invites_select" on public.invites;
drop policy if exists "invites_insert" on public.invites;
drop policy if exists "invites_update" on public.invites;

create policy "invites_select" on public.invites
  for select using (
    public.is_family_member(family_id)
    or (
      email = (select email from public.profiles where id = auth.uid())
      and revoked_at is null
      and accepted_at is null
      and expires_at > now()
    )
  );

create policy "invites_insert" on public.invites
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'manage_family_members')
  );

create policy "invites_update" on public.invites
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'manage_family_members')
  );

-- ---------------------------------------------------------------------------
-- Storage: add update/delete, tighten paths
-- ---------------------------------------------------------------------------

drop policy if exists "storage_family_read" on storage.objects;
drop policy if exists "storage_family_write" on storage.objects;
drop policy if exists "storage_family_insert" on storage.objects;
drop policy if exists "storage_family_update" on storage.objects;
drop policy if exists "storage_family_delete" on storage.objects;

create policy "storage_family_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'view_documents')
);

create policy "storage_family_insert"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_update"
on storage.objects for update
using (
  bucket_id = 'family-documents'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_delete"
on storage.objects for delete
using (
  bucket_id = 'family-documents'
  and public.has_family_role((storage.foldername(name))[1]::uuid, array['owner', 'parent'])
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);


-- =============================================================================
-- SECTION: 0003_expense_receipt_metadata.sql
-- =============================================================================

-- Expense receipt metadata (receipt_url stores private storage path)
alter table public.expenses
  add column if not exists receipt_filename text,
  add column if not exists receipt_uploaded_at timestamptz,
  add column if not exists receipt_mime_type text;

-- Storage: expense receipts under {family_id}/receipts/ use expense capabilities
create policy "storage_receipts_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'view_expenses')
);

create policy "storage_receipts_insert"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);

create policy "storage_receipts_update"
on storage.objects for update
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);

create policy "storage_receipts_delete"
on storage.objects for delete
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] = 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'edit_expenses')
);


-- =============================================================================
-- SECTION: 0004_production_features.sql
-- =============================================================================

-- Production features: context messages, guest links, handover check-ins, import jobs

-- ---------------------------------------------------------------------------
-- context_messages
-- ---------------------------------------------------------------------------

create table if not exists public.context_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  kind text not null check (kind in ('update', 'confirmation')),
  body text not null,
  author_member_id uuid not null references public.family_members (id),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  read_by_member_id uuid references public.family_members (id),
  status text not null default 'sent'
    check (status in ('sent', 'read', 'confirmed', 'declined')),
  response_body text,
  responded_at timestamptz,
  responded_by_member_id uuid references public.family_members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_context_messages_family
  on public.context_messages (family_id);
create index if not exists idx_context_messages_resource
  on public.context_messages (family_id, resource_type, resource_id);

create trigger context_messages_set_updated_at
  before update on public.context_messages
  for each row execute function public.set_updated_at();

alter table public.context_messages enable row level security;

create policy "context_messages_select" on public.context_messages
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "context_messages_insert" on public.context_messages
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
    and author_member_id = public.current_member_id(family_id)
  );

create policy "context_messages_update" on public.context_messages
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

-- ---------------------------------------------------------------------------
-- guest_link_tokens (public access via service role only â€” no anon policy)
-- ---------------------------------------------------------------------------

create table if not exists public.guest_link_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  label text not null,
  token text not null unique,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  change_request_id uuid references public.change_requests (id) on delete set null,
  created_by_member_id uuid not null references public.family_members (id),
  created_at timestamptz not null default now(),
  response text check (response in ('accepted', 'declined')),
  responded_at timestamptz,
  responded_by_name text
);

create index if not exists idx_guest_link_tokens_family
  on public.guest_link_tokens (family_id);
create index if not exists idx_guest_link_tokens_token
  on public.guest_link_tokens (token);

alter table public.guest_link_tokens enable row level security;

create policy "guest_link_tokens_select" on public.guest_link_tokens
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "guest_link_tokens_insert" on public.guest_link_tokens
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
    and created_by_member_id = public.current_member_id(family_id)
  );

-- ---------------------------------------------------------------------------
-- handover_check_ins
-- ---------------------------------------------------------------------------

create table if not exists public.handover_check_ins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  handover_id uuid not null references public.handovers (id) on delete cascade,
  member_id uuid not null references public.family_members (id),
  checked_in_at timestamptz not null default now(),
  unique (handover_id)
);

create index if not exists idx_handover_check_ins_family
  on public.handover_check_ins (family_id);

alter table public.handover_check_ins enable row level security;

create policy "handover_check_ins_select" on public.handover_check_ins
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "handover_check_ins_insert" on public.handover_check_ins
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
    and member_id = public.current_member_id(family_id)
  );

-- ---------------------------------------------------------------------------
-- import_jobs (placeholder â€” no parser yet)
-- ---------------------------------------------------------------------------

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  source text not null check (source in ('photo', 'pdf', 'email')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_jobs_family
  on public.import_jobs (family_id);

alter table public.import_jobs enable row level security;

create policy "import_jobs_select" on public.import_jobs
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "import_jobs_insert" on public.import_jobs
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );


-- =============================================================================
-- SECTION: 0005_rls_hardening.sql
-- =============================================================================

-- Famli RLS hardening (P0 + P1): onboarding, invites, capabilities, storage, guest tokens

-- ---------------------------------------------------------------------------
-- P0: families INSERT â€” owner must be creator
-- ---------------------------------------------------------------------------

drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (
    created_by = auth.uid()
    and owner_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- P0: first family member on onboarding (before user is a member)
-- ---------------------------------------------------------------------------

drop policy if exists "members_bootstrap_insert" on public.family_members;
create policy "members_bootstrap_insert" on public.family_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = auth.uid()
        and f.owner_id = auth.uid()
    )
    and not exists (
      select 1
      from public.family_members fm
      where fm.family_id = family_members.family_id
    )
  );

-- ---------------------------------------------------------------------------
-- P0: invite acceptance (invitee is not yet an active member)
-- ---------------------------------------------------------------------------

drop policy if exists "invites_accept_update" on public.invites;
create policy "invites_accept_update" on public.invites
  for update using (
    email = (select email from public.profiles where id = auth.uid())
    and revoked_at is null
    and accepted_at is null
    and expires_at > now()
  )
  with check (accepted_at is not null);

drop policy if exists "members_accept_invite_update" on public.family_members;
create policy "members_accept_invite_update" on public.family_members
  for update using (
    invited_email = (select email from public.profiles where id = auth.uid())
    and status = 'invited'
    and user_id is null
  )
  with check (
    user_id = auth.uid()
    and status = 'active'
  );

-- ---------------------------------------------------------------------------
-- P0: activity log â€” prevent actor_id spoofing
-- ---------------------------------------------------------------------------

drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert" on public.activity_log
  for insert with check (
    public.is_family_member(family_id)
    and actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- P1: storage â€” exclude receipts path from document policies (OR-leak fix)
-- ---------------------------------------------------------------------------

drop policy if exists "storage_family_read" on storage.objects;
drop policy if exists "storage_family_insert" on storage.objects;
drop policy if exists "storage_family_update" on storage.objects;
drop policy if exists "storage_family_delete" on storage.objects;

create policy "storage_family_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'view_documents')
);

create policy "storage_family_insert"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_update"
on storage.objects for update
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_delete"
on storage.objects for delete
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.has_family_role((storage.foldername(name))[1]::uuid, array['owner', 'parent'])
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

-- ---------------------------------------------------------------------------
-- P1: guest_link_tokens â€” store hash only, never expose plaintext via RLS
-- ---------------------------------------------------------------------------

alter table public.guest_link_tokens
  add column if not exists token_hash text;

update public.guest_link_tokens
set token_hash = encode(digest(token, 'sha256'), 'hex')
where token_hash is null
  and token is not null;

alter table public.guest_link_tokens
  alter column token_hash set not null;

drop index if exists idx_guest_link_tokens_token;

create unique index if not exists idx_guest_link_tokens_token_hash
  on public.guest_link_tokens (token_hash);

alter table public.guest_link_tokens
  drop column if exists token;

drop policy if exists "guest_link_tokens_select" on public.guest_link_tokens;
create policy "guest_link_tokens_select" on public.guest_link_tokens
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

-- ---------------------------------------------------------------------------
-- P1: capability policies for remaining 0001 tables
-- ---------------------------------------------------------------------------

-- events
drop policy if exists "events_member" on public.events;
drop policy if exists "events_write" on public.events;
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "events_select" on public.events
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "events_insert" on public.events
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "events_update" on public.events
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "events_delete" on public.events
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_calendar')
  );

-- event_participants
drop policy if exists "event_participants_member" on public.event_participants;
drop policy if exists "event_participants_write" on public.event_participants;
drop policy if exists "event_participants_select" on public.event_participants;
drop policy if exists "event_participants_insert" on public.event_participants;
drop policy if exists "event_participants_update" on public.event_participants;
drop policy if exists "event_participants_delete" on public.event_participants;

create policy "event_participants_select" on public.event_participants
  for select using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'view_calendar')
    )
  );

create policy "event_participants_insert" on public.event_participants
  for insert with check (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

create policy "event_participants_update" on public.event_participants
  for update using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

create policy "event_participants_delete" on public.event_participants
  for delete using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.has_family_role(e.family_id, array['owner', 'parent'])
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

-- handovers
drop policy if exists "handovers_member" on public.handovers;
drop policy if exists "handovers_write" on public.handovers;
drop policy if exists "handovers_select" on public.handovers;
drop policy if exists "handovers_insert" on public.handovers;
drop policy if exists "handovers_update" on public.handovers;
drop policy if exists "handovers_delete" on public.handovers;

create policy "handovers_select" on public.handovers
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "handovers_insert" on public.handovers
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "handovers_update" on public.handovers
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "handovers_delete" on public.handovers
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_custody')
  );

-- handover_children
drop policy if exists "handover_children_member" on public.handover_children;
drop policy if exists "handover_children_write" on public.handover_children;
drop policy if exists "handover_children_select" on public.handover_children;
drop policy if exists "handover_children_insert" on public.handover_children;
drop policy if exists "handover_children_update" on public.handover_children;
drop policy if exists "handover_children_delete" on public.handover_children;

create policy "handover_children_select" on public.handover_children
  for select using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'view_custody')
    )
  );

create policy "handover_children_insert" on public.handover_children
  for insert with check (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

create policy "handover_children_update" on public.handover_children
  for update using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

create policy "handover_children_delete" on public.handover_children
  for delete using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.has_family_role(h.family_id, array['owner', 'parent'])
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

-- change_requests
drop policy if exists "change_requests_member" on public.change_requests;
drop policy if exists "change_requests_write" on public.change_requests;
drop policy if exists "change_requests_select" on public.change_requests;
drop policy if exists "change_requests_insert" on public.change_requests;
drop policy if exists "change_requests_update" on public.change_requests;
drop policy if exists "change_requests_delete" on public.change_requests;

create policy "change_requests_select" on public.change_requests
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "change_requests_insert" on public.change_requests
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "change_requests_update" on public.change_requests
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "change_requests_delete" on public.change_requests
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_custody')
  );

-- tasks
drop policy if exists "tasks_member" on public.tasks;
drop policy if exists "tasks_write" on public.tasks;
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_tasks')
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "tasks_update" on public.tasks
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_tasks')
  );

-- expense_splits
drop policy if exists "splits_member" on public.expense_splits;
drop policy if exists "splits_write" on public.expense_splits;
drop policy if exists "splits_select" on public.expense_splits;
drop policy if exists "splits_insert" on public.expense_splits;
drop policy if exists "splits_update" on public.expense_splits;
drop policy if exists "splits_delete" on public.expense_splits;

create policy "splits_select" on public.expense_splits
  for select using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'view_expenses')
    )
  );

create policy "splits_insert" on public.expense_splits
  for insert with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

create policy "splits_update" on public.expense_splits
  for update using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

create policy "splits_delete" on public.expense_splits
  for delete using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.has_family_role(e.family_id, array['owner', 'parent'])
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

-- recurring_expenses
drop policy if exists "recurring_member" on public.recurring_expenses;
drop policy if exists "recurring_write" on public.recurring_expenses;
drop policy if exists "recurring_select" on public.recurring_expenses;
drop policy if exists "recurring_insert" on public.recurring_expenses;
drop policy if exists "recurring_update" on public.recurring_expenses;
drop policy if exists "recurring_delete" on public.recurring_expenses;

create policy "recurring_select" on public.recurring_expenses
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_expenses')
  );

create policy "recurring_insert" on public.recurring_expenses
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "recurring_update" on public.recurring_expenses
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "recurring_delete" on public.recurring_expenses
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_expenses')
  );

-- vacations
drop policy if exists "vacations_member" on public.vacations;
drop policy if exists "vacations_write" on public.vacations;
drop policy if exists "vacations_select" on public.vacations;
drop policy if exists "vacations_insert" on public.vacations;
drop policy if exists "vacations_update" on public.vacations;
drop policy if exists "vacations_delete" on public.vacations;

create policy "vacations_select" on public.vacations
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_travel')
  );

create policy "vacations_insert" on public.vacations
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "vacations_update" on public.vacations
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "vacations_delete" on public.vacations
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_travel')
  );

-- notifications INSERT â€” target must be an active family member
drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (
    public.is_family_member(family_id)
    and user_id in (
      select fm.user_id
      from public.family_members fm
      where fm.family_id = notifications.family_id
        and fm.user_id is not null
        and fm.status = 'active'
    )
  );


-- =============================================================================
-- SECTION: 0006_life_domain.sql
-- =============================================================================

-- Famli P0 Week 1: life domain tables, task extensions, feestje category

-- ---------------------------------------------------------------------------
-- Extend tasks for routines / care
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists kind text not null default 'one_off'
    check (kind in ('one_off', 'routine', 'care')),
  add column if not exists weekdays integer[] default null,
  add column if not exists times text[] default null,
  add column if not exists assign_mode text default 'stay'
    check (assign_mode is null or assign_mode in ('fixed', 'stay')),
  add column if not exists care_label text,
  add column if not exists care_instructions text,
  add column if not exists packing_items jsonb not null default '[]'::jsonb,
  add column if not exists active boolean not null default true;

-- ---------------------------------------------------------------------------
-- Events: allow feestje category
-- ---------------------------------------------------------------------------

alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check check (category in (
  'verblijf', 'overdracht', 'school', 'sport', 'medisch', 'opvang',
  'vakantie', 'verjaardag', 'feestje', 'activiteit', 'overig'
));

-- ---------------------------------------------------------------------------
-- Child sizes
-- ---------------------------------------------------------------------------

create table if not exists public.child_sizes (
  child_id uuid primary key references public.children (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  clothing text,
  shoes text,
  jacket text,
  trousers text,
  sport text,
  helmet text,
  other text,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles (id)
);

create index if not exists idx_child_sizes_family on public.child_sizes (family_id);

create table if not exists public.size_history (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  field text not null,
  from_value text,
  to_value text,
  changed_at timestamptz not null default now(),
  changed_by uuid not null references public.profiles (id)
);

create index if not exists idx_size_history_family on public.size_history (family_id);
create index if not exists idx_size_history_child on public.size_history (child_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- Needed items
-- ---------------------------------------------------------------------------

create table if not exists public.needed_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null,
  category text not null check (category in (
    'kleding', 'schoenen', 'school', 'sport', 'verzorging', 'cadeau', 'reizen', 'overig'
  )),
  size text,
  due_on date,
  assignee_member_id uuid references public.family_members (id),
  location text check (location is null or location in (
    'bij_papa', 'bij_mama', 'op_school', 'bij_sportclub', 'bij_oma', 'bij_kind',
    'onderweg', 'onbekend', 'custom'
  )),
  location_custom text,
  budget_cents integer check (budget_cents is null or budget_cents >= 0),
  status text not null default 'nodig' check (status in (
    'nodig', 'wordt_geregeld', 'gekocht', 'niet_meer_nodig'
  )),
  notes text,
  photo_url text,
  hidden_from_child boolean not null default false,
  purchased_at timestamptz,
  purchased_by_member_id uuid references public.family_members (id),
  price_cents integer check (price_cents is null or price_cents >= 0),
  receipt_url text,
  expense_id uuid references public.expenses (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create index if not exists idx_needed_items_family on public.needed_items (family_id);
create index if not exists idx_needed_items_child on public.needed_items (child_id);

-- ---------------------------------------------------------------------------
-- Travel plans & segments
-- ---------------------------------------------------------------------------

create table if not exists public.travel_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  destination text not null,
  starts_on date not null,
  ends_on date not null,
  with_member_id uuid not null references public.family_members (id),
  transport text,
  stay_name text,
  stay_address text,
  stay_contact text,
  booking_ref text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id)
);

create index if not exists idx_travel_plans_family on public.travel_plans (family_id);

create table if not exists public.travel_plan_children (
  travel_plan_id uuid not null references public.travel_plans (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  primary key (travel_plan_id, child_id)
);

create table if not exists public.travel_segments (
  id uuid primary key default gen_random_uuid(),
  travel_plan_id uuid not null references public.travel_plans (id) on delete cascade,
  kind text not null check (kind in ('outbound', 'return', 'other')),
  carrier text,
  number text,
  from_place text,
  to_place text,
  departs_at timestamptz,
  arrives_at timestamptz
);

create index if not exists idx_travel_segments_plan on public.travel_segments (travel_plan_id);

-- ---------------------------------------------------------------------------
-- Child updates
-- ---------------------------------------------------------------------------

create table if not exists public.child_updates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  body text not null,
  category text,
  author_member_id uuid not null references public.family_members (id),
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_child_updates_family on public.child_updates (family_id);
create index if not exists idx_child_updates_child on public.child_updates (child_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Routine occurrences (persisted completions / overrides)
-- ---------------------------------------------------------------------------

create table if not exists public.routine_occurrences (
  id text primary key,
  routine_id uuid not null references public.tasks (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  date date not null,
  time time not null,
  assignee_member_id uuid references public.family_members (id),
  status text not null default 'pending' check (status in ('pending', 'done', 'unregistered')),
  completed_at timestamptz,
  completed_by_member_id uuid references public.family_members (id),
  notes text,
  unique (routine_id, date, time)
);

create index if not exists idx_routine_occurrences_family on public.routine_occurrences (family_id);
create index if not exists idx_routine_occurrences_routine on public.routine_occurrences (routine_id, date);

-- ---------------------------------------------------------------------------
-- Parties (feestje events)
-- ---------------------------------------------------------------------------

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  for_child_id uuid not null references public.children (id) on delete cascade,
  host_name text not null,
  address text,
  contact text,
  rsvp text not null default 'pending' check (rsvp in ('pending', 'accepted', 'declined')),
  gift_needed_item_id uuid references public.needed_items (id) on delete set null,
  gift_budget_cents integer check (gift_budget_cents is null or gift_budget_cents >= 0),
  notes text
);

create index if not exists idx_parties_family on public.parties (family_id);
create index if not exists idx_parties_event on public.parties (event_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.child_sizes enable row level security;
alter table public.size_history enable row level security;
alter table public.needed_items enable row level security;
alter table public.travel_plans enable row level security;
alter table public.travel_plan_children enable row level security;
alter table public.travel_segments enable row level security;
alter table public.child_updates enable row level security;
alter table public.routine_occurrences enable row level security;
alter table public.parties enable row level security;

-- child_sizes
drop policy if exists "child_sizes_select" on public.child_sizes;
drop policy if exists "child_sizes_insert" on public.child_sizes;
drop policy if exists "child_sizes_update" on public.child_sizes;
drop policy if exists "child_sizes_delete" on public.child_sizes;

create policy "child_sizes_select" on public.child_sizes
  for select using (public.can_view_child(child_id));

create policy "child_sizes_insert" on public.child_sizes
  for insert with check (public.can_edit_child(child_id));

create policy "child_sizes_update" on public.child_sizes
  for update using (public.can_edit_child(child_id));

create policy "child_sizes_delete" on public.child_sizes
  for delete using (
    public.can_edit_child(child_id)
    and public.has_family_role(family_id, array['owner', 'parent'])
  );

-- size_history
drop policy if exists "size_history_select" on public.size_history;
drop policy if exists "size_history_insert" on public.size_history;

create policy "size_history_select" on public.size_history
  for select using (public.can_view_child(child_id));

create policy "size_history_insert" on public.size_history
  for insert with check (public.can_edit_child(child_id));

-- needed_items
drop policy if exists "needed_items_select" on public.needed_items;
drop policy if exists "needed_items_insert" on public.needed_items;
drop policy if exists "needed_items_update" on public.needed_items;
drop policy if exists "needed_items_delete" on public.needed_items;

create policy "needed_items_select" on public.needed_items
  for select using (
    public.is_family_member(family_id)
    and public.can_view_child(child_id)
  );

create policy "needed_items_insert" on public.needed_items
  for insert with check (
    public.is_family_member(family_id)
    and public.can_edit_child(child_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "needed_items_update" on public.needed_items
  for update using (
    public.is_family_member(family_id)
    and public.can_view_child(child_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "needed_items_delete" on public.needed_items
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.can_edit_child(child_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

-- travel_plans
drop policy if exists "travel_plans_select" on public.travel_plans;
drop policy if exists "travel_plans_insert" on public.travel_plans;
drop policy if exists "travel_plans_update" on public.travel_plans;
drop policy if exists "travel_plans_delete" on public.travel_plans;

create policy "travel_plans_select" on public.travel_plans
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_travel')
  );

create policy "travel_plans_insert" on public.travel_plans
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "travel_plans_update" on public.travel_plans
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "travel_plans_delete" on public.travel_plans
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_travel')
  );

-- travel_plan_children
drop policy if exists "travel_plan_children_select" on public.travel_plan_children;
drop policy if exists "travel_plan_children_insert" on public.travel_plan_children;
drop policy if exists "travel_plan_children_delete" on public.travel_plan_children;

create policy "travel_plan_children_select" on public.travel_plan_children
  for select using (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.is_family_member(tp.family_id)
        and public.member_capability(tp.family_id, 'view_travel')
    )
  );

create policy "travel_plan_children_insert" on public.travel_plan_children
  for insert with check (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.is_family_member(tp.family_id)
        and public.member_capability(tp.family_id, 'edit_travel')
    )
  );

create policy "travel_plan_children_delete" on public.travel_plan_children
  for delete using (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.has_family_role(tp.family_id, array['owner', 'parent'])
        and public.member_capability(tp.family_id, 'edit_travel')
    )
  );

-- travel_segments
drop policy if exists "travel_segments_select" on public.travel_segments;
drop policy if exists "travel_segments_insert" on public.travel_segments;
drop policy if exists "travel_segments_update" on public.travel_segments;
drop policy if exists "travel_segments_delete" on public.travel_segments;

create policy "travel_segments_select" on public.travel_segments
  for select using (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.is_family_member(tp.family_id)
        and public.member_capability(tp.family_id, 'view_travel')
    )
  );

create policy "travel_segments_insert" on public.travel_segments
  for insert with check (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.is_family_member(tp.family_id)
        and public.member_capability(tp.family_id, 'edit_travel')
    )
  );

create policy "travel_segments_update" on public.travel_segments
  for update using (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.is_family_member(tp.family_id)
        and public.member_capability(tp.family_id, 'edit_travel')
    )
  );

create policy "travel_segments_delete" on public.travel_segments
  for delete using (
    exists (
      select 1
      from public.travel_plans tp
      where tp.id = travel_plan_id
        and public.has_family_role(tp.family_id, array['owner', 'parent'])
        and public.member_capability(tp.family_id, 'edit_travel')
    )
  );

-- child_updates
drop policy if exists "child_updates_select" on public.child_updates;
drop policy if exists "child_updates_insert" on public.child_updates;
drop policy if exists "child_updates_delete" on public.child_updates;

create policy "child_updates_select" on public.child_updates
  for select using (
    public.is_family_member(family_id)
    and public.can_view_child(child_id)
  );

create policy "child_updates_insert" on public.child_updates
  for insert with check (
    public.is_family_member(family_id)
    and public.can_edit_child(child_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "child_updates_delete" on public.child_updates
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.can_edit_child(child_id)
  );

-- routine_occurrences
drop policy if exists "routine_occurrences_select" on public.routine_occurrences;
drop policy if exists "routine_occurrences_insert" on public.routine_occurrences;
drop policy if exists "routine_occurrences_update" on public.routine_occurrences;
drop policy if exists "routine_occurrences_delete" on public.routine_occurrences;

create policy "routine_occurrences_select" on public.routine_occurrences
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_tasks')
  );

create policy "routine_occurrences_insert" on public.routine_occurrences
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "routine_occurrences_update" on public.routine_occurrences
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "routine_occurrences_delete" on public.routine_occurrences
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_tasks')
  );

-- parties
drop policy if exists "parties_select" on public.parties;
drop policy if exists "parties_insert" on public.parties;
drop policy if exists "parties_update" on public.parties;
drop policy if exists "parties_delete" on public.parties;

create policy "parties_select" on public.parties
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "parties_insert" on public.parties
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "parties_update" on public.parties
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "parties_delete" on public.parties
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_calendar')
  );

-- ---------------------------------------------------------------------------
-- handover_children: ensure write path for per-child handovers (documented)
-- Policies from 0005 remain; no schema change required.
-- ---------------------------------------------------------------------------


-- =============================================================================
-- SECTION: 0007_security_advisor.sql
-- =============================================================================
-- STOP: Run 0001–0006 first and test P0 Week 1 (0006) before applying this section.
-- See docs/security-advisor-0007-testplan.md for verification steps.
-- =============================================================================

-- Famli migration 0007: Security Advisor fixes
-- Fixes Supabase Security Advisor findings: function search_path + EXECUTE grants
--
-- VOORWAARDE / PREREQUISITE:
--   Run ONLY after 0006_life_domain.sql is applied AND manually tested in Supabase.
--   Do NOT run before P0 Week 1 (0006) verification is complete.
--
-- Idempotent: safe to re-run (REVOKE/GRANT/ALTER FUNCTION are no-ops when already applied).

-- =============================================================================
-- 1. search_path hardening (all 9 helper/trigger functions)
--    Prevents search_path injection on SECURITY DEFINER functions.
-- =============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.is_family_member(uuid) set search_path = public;
alter function public.has_family_role(uuid, text[]) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.current_member_id(uuid) set search_path = public;
alter function public.is_parent_member(uuid) set search_path = public;
alter function public.member_capability(uuid, text) set search_path = public;
alter function public.can_view_child(uuid) set search_path = public;
alter function public.can_edit_child(uuid) set search_path = public;

-- =============================================================================
-- 2. EXECUTE hardening — RLS helpers + set_updated_at
--    Revoke from PUBLIC and anon only; keep authenticated + service_role.
-- =============================================================================

-- set_updated_at() — used by updated_at triggers
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to service_role;

-- is_family_member(uuid)
revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.is_family_member(uuid) from anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_member(uuid) to service_role;

-- has_family_role(uuid, text[])
revoke all on function public.has_family_role(uuid, text[]) from public;
revoke all on function public.has_family_role(uuid, text[]) from anon;
grant execute on function public.has_family_role(uuid, text[]) to authenticated;
grant execute on function public.has_family_role(uuid, text[]) to service_role;

-- current_member_id(uuid)
revoke all on function public.current_member_id(uuid) from public;
revoke all on function public.current_member_id(uuid) from anon;
grant execute on function public.current_member_id(uuid) to authenticated;
grant execute on function public.current_member_id(uuid) to service_role;

-- is_parent_member(uuid)
revoke all on function public.is_parent_member(uuid) from public;
revoke all on function public.is_parent_member(uuid) from anon;
grant execute on function public.is_parent_member(uuid) to authenticated;
grant execute on function public.is_parent_member(uuid) to service_role;

-- member_capability(uuid, text)
revoke all on function public.member_capability(uuid, text) from public;
revoke all on function public.member_capability(uuid, text) from anon;
grant execute on function public.member_capability(uuid, text) to authenticated;
grant execute on function public.member_capability(uuid, text) to service_role;

-- can_view_child(uuid)
revoke all on function public.can_view_child(uuid) from public;
revoke all on function public.can_view_child(uuid) from anon;
grant execute on function public.can_view_child(uuid) to authenticated;
grant execute on function public.can_view_child(uuid) to service_role;

-- can_edit_child(uuid)
revoke all on function public.can_edit_child(uuid) from public;
revoke all on function public.can_edit_child(uuid) from anon;
grant execute on function public.can_edit_child(uuid) to authenticated;
grant execute on function public.can_edit_child(uuid) to service_role;

-- =============================================================================
-- 3. handle_new_user() — auth trigger only (supabase_auth_admin)
--    Not callable by app users; invoked by auth.users INSERT trigger.
-- =============================================================================

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

