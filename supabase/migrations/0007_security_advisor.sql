-- Famli migration 0007: Security Advisor fixes
-- Fixes Supabase Security Advisor findings: function search_path + EXECUTE grants
--
-- VOORWAARDE / PREREQUISITE:
--   Run ONLY after 0006_life_domain.sql is applied AND manually tested in Supabase.
--   Do NOT run before P0 Week 1 (0006) verification is complete.
--
-- Idempotent: safe to re-run (REVOKE/GRANT/ALTER FUNCTION are no-ops when already applied).

-- =============================================================================
-- 1. search_path hardening (all 9 helper/trigger functions)
--    Prevents search_path injection on SECURITY DEFINER functions.
-- =============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.is_family_member(uuid) set search_path = public;
alter function public.has_family_role(uuid, text[]) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.current_member_id(uuid) set search_path = public;
alter function public.is_parent_member(uuid) set search_path = public;
alter function public.member_capability(uuid, text) set search_path = public;
alter function public.can_view_child(uuid) set search_path = public;
alter function public.can_edit_child(uuid) set search_path = public;

-- =============================================================================
-- 2. EXECUTE hardening — RLS helpers + set_updated_at
--    Revoke from PUBLIC and anon only; keep authenticated + service_role.
-- =============================================================================

-- set_updated_at() — used by updated_at triggers
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to service_role;

-- is_family_member(uuid)
revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.is_family_member(uuid) from anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_member(uuid) to service_role;

-- has_family_role(uuid, text[])
revoke all on function public.has_family_role(uuid, text[]) from public;
revoke all on function public.has_family_role(uuid, text[]) from anon;
grant execute on function public.has_family_role(uuid, text[]) to authenticated;
grant execute on function public.has_family_role(uuid, text[]) to service_role;

-- current_member_id(uuid)
revoke all on function public.current_member_id(uuid) from public;
revoke all on function public.current_member_id(uuid) from anon;
grant execute on function public.current_member_id(uuid) to authenticated;
grant execute on function public.current_member_id(uuid) to service_role;

-- is_parent_member(uuid)
revoke all on function public.is_parent_member(uuid) from public;
revoke all on function public.is_parent_member(uuid) from anon;
grant execute on function public.is_parent_member(uuid) to authenticated;
grant execute on function public.is_parent_member(uuid) to service_role;

-- member_capability(uuid, text)
revoke all on function public.member_capability(uuid, text) from public;
revoke all on function public.member_capability(uuid, text) from anon;
grant execute on function public.member_capability(uuid, text) to authenticated;
grant execute on function public.member_capability(uuid, text) to service_role;

-- can_view_child(uuid)
revoke all on function public.can_view_child(uuid) from public;
revoke all on function public.can_view_child(uuid) from anon;
grant execute on function public.can_view_child(uuid) to authenticated;
grant execute on function public.can_view_child(uuid) to service_role;

-- can_edit_child(uuid)
revoke all on function public.can_edit_child(uuid) from public;
revoke all on function public.can_edit_child(uuid) from anon;
grant execute on function public.can_edit_child(uuid) to authenticated;
grant execute on function public.can_edit_child(uuid) to service_role;

-- =============================================================================
-- 3. handle_new_user() — auth trigger only (supabase_auth_admin)
--    Not callable by app users; invoked by auth.users INSERT trigger.
-- =============================================================================

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
