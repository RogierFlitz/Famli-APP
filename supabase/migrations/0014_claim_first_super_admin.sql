-- Let the first authenticated /admin login become super_admin when staff is empty.

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
    return exists (
      select 1 from public.admin_staff
      where user_id = auth.uid()
    );
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

revoke all on function public.claim_first_super_admin() from public;
revoke all on function public.claim_first_super_admin() from anon;
grant execute on function public.claim_first_super_admin() to authenticated;
grant execute on function public.claim_first_super_admin() to service_role;
