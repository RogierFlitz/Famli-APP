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
