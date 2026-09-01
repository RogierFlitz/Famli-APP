-- RLS policies so the app can read admin_staff after login.
-- Paste in SQL editor after admin_staff already exists.

create or replace function public.staff_admin_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from public.admin_staff where user_id = auth.uid() limit 1; $$;

create or replace function public.is_staff_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_staff where user_id = auth.uid()); $$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.admin_staff where user_id = auth.uid() and role = 'super_admin'
); $$;

grant execute on function public.staff_admin_role() to authenticated, service_role;
grant execute on function public.is_staff_admin() to authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;

alter table public.admin_staff enable row level security;

drop policy if exists "admin_staff_select" on public.admin_staff;
create policy "admin_staff_select" on public.admin_staff
  for select to authenticated using (public.is_staff_admin());

drop policy if exists "admin_staff_write" on public.admin_staff;
create policy "admin_staff_write" on public.admin_staff
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
