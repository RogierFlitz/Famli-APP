-- Minimal admin bootstrap. Safe to paste as one script in the Supabase SQL editor.
-- Does not touch families/calendar policies (those roll back the whole run if missing).

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Tabel public.profiles ontbreekt. De gezins-migraties zijn nog niet gedraaid.';
  end if;
end $$;

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
  family_id uuid,
  author_admin_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  action text not null,
  target_user_id uuid references public.profiles (id),
  family_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.staff_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_staff where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_staff where user_id = auth.uid());
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
    where user_id = auth.uid() and role in ('super_admin', 'support_admin')
  );
$$;

create or replace function public.claim_first_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.admin_staff) then
    return exists (select 1 from public.admin_staff where user_id = auth.uid());
  end if;
  insert into public.admin_staff (user_id, role)
  values (auth.uid(), 'super_admin')
  on conflict (user_id) do nothing;
  return exists (
    select 1 from public.admin_staff
    where user_id = auth.uid() and role = 'super_admin'
  );
end;
$$;

revoke all on function public.staff_admin_role() from public, anon;
revoke all on function public.is_staff_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.is_write_admin() from public, anon;
revoke all on function public.claim_first_super_admin() from public, anon;
grant execute on function public.staff_admin_role() to authenticated, service_role;
grant execute on function public.is_staff_admin() to authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function public.is_write_admin() to authenticated, service_role;
grant execute on function public.claim_first_super_admin() to authenticated, service_role;

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

-- Ensure the founder has a profile + super_admin row.
insert into public.profiles (id, email, first_name, last_name)
select
  u.id,
  coalesce(u.email, 'rogier@flitz-events.nl'),
  coalesce(u.raw_user_meta_data ->> 'first_name', 'Rogier'),
  coalesce(u.raw_user_meta_data ->> 'last_name', '')
from auth.users u
where lower(u.email) = lower('rogier@flitz-events.nl')
on conflict (id) do nothing;

insert into public.admin_staff (user_id, role)
select p.id, 'super_admin'
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('rogier@flitz-events.nl')
on conflict (user_id) do update set role = excluded.role, updated_at = now();

select u.email, s.role
from public.admin_staff s
join auth.users u on u.id = s.user_id
where lower(u.email) = lower('rogier@flitz-events.nl');
