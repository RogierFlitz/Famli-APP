# Famli Security Architecture

This document describes the security model for Famli — a co-parenting app handling sensitive family, medical, financial, and travel data.

## Principles

1. **Zero trust between families** — every query is scoped by `family_id`; cross-tenant IDOR must fail at the database (RLS) and application layers.
2. **Backend enforcement** — the React frontend never determines access. Server actions call `requireAuthorizedMutation()` before mutations.
3. **Least privilege for partners** — partners never automatically receive custody edit, finance edit, document access, member management, or security settings.
4. **Child-scoped access** — partners may access only children listed in `child_member_access`.
5. **Demo isolation** — demo mode uses an in-memory store with a fixed demo family; no RLS bypass and no production data.

## Tenant model

| Entity | Tenant key | Notes |
|--------|-----------|-------|
| `families` | `id` | Root tenant |
| `family_members` | `family_id` | Membership + role + permissions |
| `children` | `family_id` | Child profiles |
| `child_member_access` | `family_id` | Per-child partner access |
| All domain tables | `family_id` | Events, tasks, expenses, documents, etc. |

Indexes exist on `family_id` for all major tables (see `supabase/migrations/`).

## Permissions (capabilities)

Canonical capabilities (see `lib/security/capabilities.ts`):

- `view_child_basic`, `view_child_sensitive`
- `view_calendar`, `edit_calendar`
- `view_custody`, `edit_custody`
- `view_tasks`, `edit_tasks`
- `view_expenses`, `edit_expenses`
- `view_travel`, `edit_travel`
- `view_documents`, `upload_documents`
- `view_care_routines`, `edit_care_routines`
- `manage_family_members`

Parents (`ouder` / `owner` / `parent` role) receive all capabilities. Partners receive presets (`practical`, `involved`, `custom`) mapped in `lib/members/permissions.ts`.

## Row Level Security (RLS)

RLS is enabled on all Supabase-accessible tables. Policies use:

- `is_family_member(family_id)` — active membership check
- `has_family_role(family_id, roles[])` — role check
- `member_capability(family_id, cap)` — JSONB permissions on `family_members`
- `can_view_child(child_id)` / `can_edit_child(child_id)` — child-level access

**Never** use wildcard `auth.role() = 'authenticated'` alone.

Migration: `supabase/migrations/0002_security_foundation.sql`

## Server action flow

Every mutation follows:

1. Authenticate (`requireSnapshot`)
2. Rate limit (where applicable)
3. Verify family membership (implicit in snapshot)
4. Check capability (+ child access if scoped)
5. Validate input (Zod/whitelists — extend per action)
6. Execute via repository (RLS applies for Supabase)
7. Write audit log

## Storage

- Bucket: `family-documents` (private)
- Path: `{family_id}/{random_filename.ext}`
- Allowed types: PDF, JPG, PNG, WEBP (max 10 MB)
- Signed URLs: 10-minute TTL (configure in upload flow)
- RLS on `storage.objects` checks family membership + document capabilities

## Invites

- Crypto-safe tokens (`randomBytes(32)`)
- 24–72 hour expiry
- Single use (`accepted_at`)
- Email must match accepting user
- Revocable (`revoked_at`)
- Rate limited per family

## Audit log

Table: `audit_log` — append-only for normal users.

Fields: `family_id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `created_at`.

## Authentication

- **Production**: Supabase Auth (email/password, session cookies via `@supabase/ssr`)
- **Demo/local**: HTTP-only `nestly_session` cookie with fixed demo user IDs
- Email verification, password reset via Supabase Auth
- Open redirect protection: `safeRedirectPath()` whitelist

## MFA (preparation)

TOTP via Supabase Auth MFA (AAL2):

1. Enable MFA in Supabase Dashboard → Authentication → MFA
2. Enroll users via `supabase.auth.mfa.enroll()`
3. Require AAL2 for sensitive actions (custody changes, member invites, document uploads) — implement when enabling MFA in production

Settings placeholder: `/instellingen/beveiliging`

## Service role key

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** (`lib/supabase/env.ts`). Never expose via `NEXT_PUBLIC_*` or client bundles.

## Rate limiting

In-memory limits (demo/dev). For production, use Vercel Firewall or Upstash Redis.

| Scope | Limit |
|-------|-------|
| login | 10 / 15 min |
| password_reset | 5 / hour |
| invite | 20 / hour |
| upload | 30 / hour |
| mutation | 120 / min |
| sensitive | 10 / min |

## Security headers

Applied via `next.config.ts` and `proxy.ts`:

- CSP, HSTS, X-Content-Type-Options, X-Frame-Options
- Referrer-Policy, Permissions-Policy, frame-ancestors

## Incident response

1. Rotate `SUPABASE_SERVICE_ROLE_KEY` and anon key if compromised
2. Review `audit_log` for affected `family_id`
3. Revoke sessions via Supabase Dashboard → Authentication → Users
4. Notify affected families within 72 hours (GDPR)

## Vulnerability reporting

Report security issues privately to the project maintainer. Do not open public GitHub issues for vulnerabilities.
