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

create policy "child_access_select" on public.child_member_access
  for select using (public.is_family_member(family_id));

create policy "child_access_write" on public.child_member_access
  for all using (
    public.has_family_role(family_id, array['owner', 'parent'])
    or public.member_capability(family_id, 'manage_family_members')
  );

alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log
  for select using (public.is_family_member(family_id));

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
