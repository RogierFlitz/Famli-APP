-- Packing checklists + persistente overdracht-gereedheid.
-- Additive. Safe for existing production data. No destructive changes.

-- ---------------------------------------------------------------------------
-- Handovers: readiness (OPEN / IN_PROGRESS / READY / COMPLETED)
-- ---------------------------------------------------------------------------
alter table public.handovers
  add column if not exists ready_status text not null default 'open'
    check (ready_status in ('open', 'in_progress', 'ready', 'completed')),
  add column if not exists ready_at timestamptz,
  add column if not exists ready_by uuid references auth.users (id) on delete set null;

create index if not exists handovers_ready_status_idx
  on public.handovers (family_id, ready_status);

-- ---------------------------------------------------------------------------
-- packing_items: persistent checkboxes for events, handovers, and ad-hoc
-- ---------------------------------------------------------------------------
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  label text not null,
  context text not null default 'other'
    check (context in (
      'hockey', 'gym', 'zwemles', 'school', 'handover', 'event', 'other'
    )),
  event_id text,
  handover_id text,
  due_on date,
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists packing_items_family_due_idx
  on public.packing_items (family_id, due_on);

create index if not exists packing_items_child_due_idx
  on public.packing_items (child_id, due_on);

create index if not exists packing_items_handover_idx
  on public.packing_items (handover_id)
  where handover_id is not null;

create index if not exists packing_items_event_idx
  on public.packing_items (family_id, event_id)
  where event_id is not null;

alter table public.packing_items enable row level security;

drop policy if exists packing_items_select_members on public.packing_items;
create policy packing_items_select_members
  on public.packing_items
  for select
  to authenticated
  using (public.is_family_member(family_id));

drop policy if exists packing_items_insert_members on public.packing_items;
create policy packing_items_insert_members
  on public.packing_items
  for insert
  to authenticated
  with check (public.is_family_member(family_id));

drop policy if exists packing_items_update_members on public.packing_items;
create policy packing_items_update_members
  on public.packing_items
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists packing_items_delete_members on public.packing_items;
create policy packing_items_delete_members
  on public.packing_items
  for delete
  to authenticated
  using (public.is_family_member(family_id));

grant select, insert, update, delete on public.packing_items to authenticated;

comment on table public.packing_items is
  'Wat moet mee? Persistent packing checklist per kind, event of overdracht.';
comment on column public.packing_items.event_id is
  'Optional event id (text so demo and uuid event ids both work).';
