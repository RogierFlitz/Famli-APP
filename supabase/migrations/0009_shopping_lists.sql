-- Famli P1: shared family shopping lists

-- ---------------------------------------------------------------------------
-- Shopping lists
-- ---------------------------------------------------------------------------

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_lists_family on public.shopping_lists (family_id);
create unique index if not exists idx_shopping_lists_one_default
  on public.shopping_lists (family_id)
  where is_default = true;

create trigger shopping_lists_set_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shopping items
-- ---------------------------------------------------------------------------

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  category text not null default 'overig' check (category in (
    'groente_fruit', 'brood', 'zuivel', 'vlees_vis_vega', 'beleg', 'dranken',
    'snacks', 'diepvries', 'huishouden', 'verzorging', 'overig'
  )),
  note text,
  completed boolean not null default false,
  completed_by uuid references public.profiles (id),
  completed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_items_family on public.shopping_items (family_id);
create index if not exists idx_shopping_items_list on public.shopping_items (list_id, completed, created_at desc);

create trigger shopping_items_set_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

create policy "shopping_lists_select" on public.shopping_lists
  for select using (public.is_family_member(family_id));

create policy "shopping_lists_insert" on public.shopping_lists
  for insert with check (public.is_family_member(family_id));

create policy "shopping_lists_update" on public.shopping_lists
  for update using (public.is_family_member(family_id));

create policy "shopping_lists_delete" on public.shopping_lists
  for delete using (public.is_family_member(family_id));

create policy "shopping_items_select" on public.shopping_items
  for select using (public.is_family_member(family_id));

create policy "shopping_items_insert" on public.shopping_items
  for insert with check (public.is_family_member(family_id));

create policy "shopping_items_update" on public.shopping_items
  for update using (public.is_family_member(family_id));

create policy "shopping_items_delete" on public.shopping_items
  for delete using (public.is_family_member(family_id));
