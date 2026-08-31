-- Famli family hub: kosten (vakantie), verrekenen, activiteiten, contacten, school, verzoeken.

alter table public.change_requests drop constraint if exists change_requests_type_check;
alter table public.change_requests add constraint change_requests_type_check
  check (type in (
    'swap_day', 'extra_day', 'pickup', 'pickup_time', 'location', 'vacation', 'other',
    'dropoff', 'babysit', 'task_takeover'
  ));

-- ---------------------------------------------------------------------------
-- Expenses: additive category
-- ---------------------------------------------------------------------------
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in (
    'school', 'kleding', 'sport', 'medisch', 'opvang', 'activiteit', 'zakgeld', 'vakantie', 'overig'
  ));

alter table public.recurring_expenses drop constraint if exists recurring_expenses_category_check;
alter table public.recurring_expenses add constraint recurring_expenses_category_check
  check (category in (
    'school', 'kleding', 'sport', 'medisch', 'opvang', 'activiteit', 'zakgeld', 'vakantie', 'overig'
  ));

-- ---------------------------------------------------------------------------
-- Settlements (bulk "kosten verrekenen")
-- ---------------------------------------------------------------------------
create table if not exists public.expense_settlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  from_member_id uuid not null references public.family_members (id),
  to_member_id uuid not null references public.family_members (id),
  amount_cents integer not null check (amount_cents >= 0),
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expense_settlements_family on public.expense_settlements (family_id, created_at desc);

alter table public.expense_settlements enable row level security;

create policy "expense_settlements_select" on public.expense_settlements
  for select using (public.is_family_member(family_id));

create policy "expense_settlements_insert" on public.expense_settlements
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

-- ---------------------------------------------------------------------------
-- Child activities (recurring bring/haal)
-- ---------------------------------------------------------------------------
create table if not exists public.child_activities (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null,
  kind text not null default 'overig' check (kind in (
    'voetbal', 'zwemles', 'hockey', 'muziekles', 'school', 'opvang', 'overig'
  )),
  location text,
  weekday smallint not null check (weekday between 1 and 7),
  start_time text not null,
  end_time text,
  bring_member_id uuid references public.family_members (id),
  pickup_member_id uuid references public.family_members (id),
  stay_member_id uuid references public.family_members (id),
  contact_name text,
  notes text,
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_child_activities_family on public.child_activities (family_id, child_id);

create trigger child_activities_set_updated_at
  before update on public.child_activities
  for each row execute function public.set_updated_at();

alter table public.child_activities enable row level security;

create policy "child_activities_select" on public.child_activities
  for select using (public.is_family_member(family_id) and public.can_view_child(child_id));

create policy "child_activities_write" on public.child_activities
  for all using (
    public.is_family_member(family_id)
    and public.can_edit_child(child_id)
  );

-- ---------------------------------------------------------------------------
-- Child contacts
-- ---------------------------------------------------------------------------
create table if not exists public.child_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  category text not null check (category in (
    'school', 'huisarts', 'tandarts', 'sportclub', 'kinderopvang', 'oppas', 'familie', 'overig'
  )),
  name text not null,
  organization text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_child_contacts_child on public.child_contacts (child_id);

create trigger child_contacts_set_updated_at
  before update on public.child_contacts
  for each row execute function public.set_updated_at();

alter table public.child_contacts enable row level security;

create policy "child_contacts_select" on public.child_contacts
  for select using (public.is_family_member(family_id) and public.can_view_child(child_id));

create policy "child_contacts_write" on public.child_contacts
  for all using (
    public.is_family_member(family_id)
    and public.can_edit_child(child_id)
  );

-- ---------------------------------------------------------------------------
-- Child school card (one row per child)
-- ---------------------------------------------------------------------------
create table if not exists public.child_schools (
  child_id uuid primary key references public.children (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null default '',
  class_name text not null default '',
  teacher text,
  contact text,
  hours text,
  gym_days text,
  updated_at timestamptz not null default now()
);

alter table public.child_schools enable row level security;

create policy "child_schools_select" on public.child_schools
  for select using (public.is_family_member(family_id) and public.can_view_child(child_id));

create policy "child_schools_write" on public.child_schools
  for all using (
    public.is_family_member(family_id)
    and public.can_edit_child(child_id)
  );

-- Family files already use storage_family_* policies on {family_id}/files/
-- (see 0005_rls_hardening.sql). Receipts stay under {family_id}/receipts/.
