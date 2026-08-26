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
