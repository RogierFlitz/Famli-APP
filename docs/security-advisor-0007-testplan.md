# Testplan: migration 0007_security_advisor.sql

Security Advisor fixes for Famli Supabase: `search_path` on helper functions and tightened `EXECUTE` grants.

## Prerequisites

Before running `0007_security_advisor.sql`:

1. **0006 tested** — `0006_life_domain.sql` is applied in Supabase **and** P0 Week 1 flows are manually verified (see checklist below).
2. **Migrations 0001–0006 applied** — in order, on the target project (staging first, then production).
3. **Leaked password protection** — enable in Supabase Dashboard → Authentication → Attack Protection → *Leaked password protection* (this is the remaining Security Advisor item after 0007; not fixable via SQL).
4. **Backup** — note current Security Advisor count (expected ~18 findings before 0007).

### P0 Week 1 smoke (0006) — must pass first

- [ ] Tasks: create routine/care task with weekdays and packing items
- [ ] Events: create event with category `feestje`
- [ ] Child sizes: upsert sizes, verify size_history row on change
- [ ] Needed items: CRUD with status transitions
- [ ] Travel plans: create plan with children and segments
- [ ] Child updates: post update linked to child
- [ ] Routine occurrences: insert/update completion
- [ ] Parties: create party linked to feestje event

---

## How to apply

1. Open Supabase SQL Editor (staging).
2. Paste contents of `supabase/migrations/0007_security_advisor.sql`.
3. Run once. Confirm no errors.
4. Run SQL verification queries below.
5. Run manual app checklist.
6. Re-check Security Advisor (Database → Security Advisor).
7. Repeat on production after staging sign-off.

**Do not** include 0007 in a fresh `RUN_ALL` run until 0006 is tested on that database.

---

## SQL verification queries

Run in SQL Editor (as postgres / service role).

### 1. search_path on all 9 functions

```sql
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  coalesce(
    (select option_value
     from pg_options_to_table(p.proconfig)
     where option_name = 'search_path'),
    '(not set)'
  ) as search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'set_updated_at',
    'is_family_member',
    'has_family_role',
    'handle_new_user',
    'current_member_id',
    'is_parent_member',
    'member_capability',
    'can_view_child',
    'can_edit_child'
  )
order by p.proname, args;
```

**Expected:** every row shows `search_path = public`.

### 2. EXECUTE grants — RLS helpers (authenticated + service_role, not anon/public)

```sql
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  array_agg(distinct acl.grantee::regrole::text order by acl.grantee::regrole::text)
    filter (where acl.privilege_type = 'EXECUTE') as execute_grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join lateral aclexplode(p.proacl) acl on true
where n.nspname = 'public'
  and p.proname in (
    'set_updated_at',
    'is_family_member',
    'has_family_role',
    'current_member_id',
    'is_parent_member',
    'member_capability',
    'can_view_child',
    'can_edit_child'
  )
group by p.proname, p.oid
order by p.proname, args;
```

**Expected:** each function has `authenticated` and `service_role` (and typically `postgres` as owner). Must **not** include `anon` or `PUBLIC`.

### 3. handle_new_user — trigger-only access

```sql
select
  p.proname,
  array_agg(distinct acl.grantee::regrole::text order by acl.grantee::regrole::text)
    filter (where acl.privilege_type = 'EXECUTE') as execute_grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join lateral aclexplode(p.proacl) acl on true
where n.nspname = 'public'
  and p.proname = 'handle_new_user'
group by p.proname, p.oid;
```

**Expected:** includes `supabase_auth_admin`. Must **not** include `authenticated`, `anon`, or `PUBLIC`.

### 4. Quick RLS helper smoke (authenticated context)

As a logged-in user via the app or Supabase client with user JWT:

```sql
-- Replace with a real family_id from your test data
select public.is_family_member('00000000-0000-0000-0000-000000000000'::uuid);
select public.member_capability('00000000-0000-0000-0000-000000000000'::uuid, 'view_tasks');
```

**Expected:** returns boolean without permission error (not "permission denied for function").

---

## Manual app test checklist

### Auth & onboarding

- [ ] **Signup** — new user receives profile row via `handle_new_user` trigger
- [ ] **Onboarding** — create family + owner member (bootstrap policies)
- [ ] **Login / logout** — session persists and clears correctly

### Invites

- [ ] Owner sends invite
- [ ] Invitee accepts invite (policies `invites_accept_update`, `members_accept_invite_update`)
- [ ] Invited user sees family data after acceptance

### RLS reads/writes per domain

| Domain | Read | Write |
|--------|------|-------|
| Calendar / events | List events, feestje category | Create/edit/delete event |
| Custody / handovers | View schedule, handovers | Create handover, check-in |
| Tasks / routines | View tasks, routine occurrences | Create routine, mark done |
| Expenses | View expenses (capability) | Add expense + receipt upload |
| Documents | View/upload in family-documents bucket | Delete (owner/parent) |
| Children | View assigned children | Edit sizes, needed items |
| Travel | View travel plans | Create plan + segments |
| Life domain (0006) | child_updates, parties, needed_items | CRUD as parent |

### Storage

- [ ] Upload document to `{family_id}/...` (not receipts path)
- [ ] Upload expense receipt to `{family_id}/receipts/...`
- [ ] Partner without `view_documents` cannot read documents
- [ ] Partner without `edit_expenses` cannot upload receipts

### Triggers (set_updated_at)

- [ ] Update a row on `profiles`, `families`, or `tasks` — `updated_at` changes
- [ ] Update `context_messages` — `updated_at` changes

---

## Security Advisor — expected outcome

| Before 0007 | After 0007 + leaked password enabled |
|-------------|----------------------------------------|
| ~18 findings | **0–1** findings |

After 0007, remaining findings should be:

- **0** if leaked password protection is enabled in Dashboard, or
- **1** (leaked password) until enabled — not addressable in SQL.

Re-scan: Supabase Dashboard → **Database** → **Security Advisor** → Refresh.

---

## Rollback notes

If something breaks after 0007:

### Symptom: "permission denied for function is_family_member" (or other helpers)

Restore EXECUTE to authenticated (example):

```sql
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_member(uuid) to service_role;
-- Repeat for affected functions from section 2 of 0007
```

### Symptom: signup fails — no profile row

Restore trigger executor access:

```sql
grant execute on function public.handle_new_user() to supabase_auth_admin;
-- If still broken, temporarily (debug only):
-- grant execute on function public.handle_new_user() to authenticated;
```

### Symptom: updated_at not updating

```sql
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to service_role;
```

### Full rollback

Re-run grants from `0001_init.sql` / `0002_security_foundation.sql` function definitions (they default to PUBLIC execute in PostgreSQL). Prefer targeted GRANT fixes above rather than reverting search_path (search_path = public is safe to keep).

Document any rollback in incident notes and re-test Security Advisor count.

---

## Sign-off

| Step | Staging | Production |
|------|---------|------------|
| 0006 P0 Week 1 tested | ☐ | ☐ |
| 0007 applied | ☐ | ☐ |
| SQL verification passed | ☐ | ☐ |
| Manual checklist passed | ☐ | ☐ |
| Security Advisor ≤ 1 | ☐ | ☐ |
| Leaked password enabled | ☐ | ☐ |

**Tester:** _______________ **Date:** _______________
