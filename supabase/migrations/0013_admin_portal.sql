-- Internal Famli admin console (staff only). Separate from family membership roles.

create table if not exists public.admin_staff (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('super_admin', 'support_admin', 'readonly_admin')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_account_flags (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'blocked')),
  blocked_at timestamptz,
  blocked_reason text,
  blocked_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_support_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references public.profiles (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  author_admin_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  action text not null,
  target_user_id uuid references public.profiles (id),
  family_id uuid references public.families (id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_support_notes_target
  on public.admin_support_notes (target_user_id, created_at desc);
create index if not exists idx_admin_audit_log_created
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_admin
  on public.admin_audit_log (admin_user_id, created_at desc);

create or replace function public.staff_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_staff
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_staff where user_id = auth.uid()
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_staff
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_write_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_staff
    where user_id = auth.uid()
      and role in ('super_admin', 'support_admin')
  );
$$;

revoke all on function public.staff_admin_role() from public;
revoke all on function public.staff_admin_role() from anon;
grant execute on function public.staff_admin_role() to authenticated;
grant execute on function public.staff_admin_role() to service_role;

revoke all on function public.is_staff_admin() from public;
revoke all on function public.is_staff_admin() from anon;
grant execute on function public.is_staff_admin() to authenticated;
grant execute on function public.is_staff_admin() to service_role;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_super_admin() from anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_super_admin() to service_role;

revoke all on function public.is_write_admin() from public;
revoke all on function public.is_write_admin() from anon;
grant execute on function public.is_write_admin() to authenticated;
grant execute on function public.is_write_admin() to service_role;

alter table public.admin_staff enable row level security;
alter table public.admin_account_flags enable row level security;
alter table public.admin_support_notes enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_staff_select" on public.admin_staff;
create policy "admin_staff_select" on public.admin_staff
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_staff_write" on public.admin_staff;
create policy "admin_staff_write" on public.admin_staff
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "admin_flags_select" on public.admin_account_flags;
create policy "admin_flags_select" on public.admin_account_flags
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_flags_write" on public.admin_account_flags;
create policy "admin_flags_write" on public.admin_account_flags
  for all to authenticated
  using (public.is_write_admin())
  with check (public.is_write_admin());

drop policy if exists "admin_notes_select" on public.admin_support_notes;
create policy "admin_notes_select" on public.admin_support_notes
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_notes_insert" on public.admin_support_notes;
create policy "admin_notes_insert" on public.admin_support_notes
  for insert to authenticated
  with check (public.is_write_admin() and author_admin_id = auth.uid());

drop policy if exists "admin_audit_select" on public.admin_audit_log;
create policy "admin_audit_select" on public.admin_audit_log
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_audit_insert" on public.admin_audit_log;
create policy "admin_audit_insert" on public.admin_audit_log
  for insert to authenticated
  with check (public.is_staff_admin() and admin_user_id = auth.uid());

-- Metadata-only access for staff (no private event/document/expense content).
drop policy if exists "admin_read_profiles" on public.profiles;
create policy "admin_read_profiles" on public.profiles
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_read_families" on public.families;
create policy "admin_read_families" on public.families
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_read_members" on public.family_members;
create policy "admin_read_members" on public.family_members
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_read_children_count" on public.children;
create policy "admin_read_children_count" on public.children
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_read_invites" on public.invites;
create policy "admin_read_invites" on public.invites
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_read_calendar_connections" on public.calendar_connections;
create policy "admin_read_calendar_connections" on public.calendar_connections
  for select to authenticated using (public.is_staff_admin());

create or replace function public.admin_reset_onboarding(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_write_admin() then
    raise exception 'not authorized';
  end if;
  update public.profiles
    set onboarding_completed_at = null, updated_at = now()
    where id = target;
end;
$$;

create or replace function public.admin_extend_invite(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_write_admin() then
    raise exception 'not authorized';
  end if;
  update public.invites
    set expires_at = now() + interval '7 days'
    where id = target;
end;
$$;

revoke all on function public.admin_reset_onboarding(uuid) from public;
revoke all on function public.admin_reset_onboarding(uuid) from anon;
grant execute on function public.admin_reset_onboarding(uuid) to authenticated;

revoke all on function public.admin_extend_invite(uuid) from public;
revoke all on function public.admin_extend_invite(uuid) from anon;
grant execute on function public.admin_extend_invite(uuid) to authenticated;

comment on table public.admin_staff is 'Internal staff roles. Never grant via client state.';
comment on table public.admin_audit_log is 'Immutable-style audit of admin actions. No delete policy for authenticated.';

-- Manual bootstrap (run in SQL editor as project owner):
-- insert into public.admin_staff (user_id, role)
-- values ('<auth user uuid>', 'super_admin');
