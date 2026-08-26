# Production readiness — Famli

Step-by-step guide to deploy Famli on **Vercel + Supabase**. For security details see [SECURITY.md](../SECURITY.md) and [security-checklist.md](./security-checklist.md).

## Mode switch

| Condition | Mode | Store |
|-----------|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` unset | Demo | In-memory (`memory-store`) |
| Both set | Production | Supabase (`supabase-store`) + Supabase Auth |

Demo login buttons are hidden when Supabase is configured. Server-side `startDemo()` is blocked in production.

---

## Pre-deploy checklist

### 1. Code quality

```bash
npx tsc --noEmit
npm run test:security
npm run build
```

All three must pass before deploying.

### 2. Uncommitted audit work

Check `git status` — recent audit features (context messages, guest links, handover check-ins, export/import shell) may exist as local changes. Include them in the deployment commit.

### 3. Secrets

- [ ] `.env*` is gitignored (except `.env.example`)
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in client bundles
- [ ] After build: search `.next/` for `service_role` — must be empty

---

## Supabase setup

### Create project

1. [supabase.com](https://supabase.com) → New project
2. Note **Project URL** and **anon key** (Settings → API)
3. Copy **service_role key** (keep secret — Vercel Production env only)

### Run migrations (in order)

Execute in **SQL Editor** or via Supabase CLI (`supabase db push`):

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/migrations/0001_init.sql` | Core schema |
| 2 | `supabase/migrations/0002_security_foundation.sql` | RLS, permissions, audit log |
| 3 | `supabase/migrations/0003_expense_receipt_metadata.sql` | Receipt metadata + storage policies |
| 4 | `supabase/migrations/0004_production_features.sql` | Context messages, guest links, check-ins, import jobs |

Verify RLS:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All public tables should have `rowsecurity = true`.

### Storage

1. Dashboard → Storage → confirm bucket **`family-documents`** exists (private)
2. Migration `0001_init` creates it; `0003` adds receipt policies

### Authentication

1. **Email provider**: Authentication → Providers → Email → Enable
2. **Confirm email**: enable for production (recommended)
3. **Site URL**: Authentication → URL Configuration
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: add `https://your-domain.vercel.app/**` and `http://localhost:3000/**`
4. **Password policy**: Authentication → Policies
5. **MFA (recommended)**: Authentication → MFA → Enable TOTP

### Auth hook (profiles)

Ensure a trigger creates `profiles` rows on signup (check `0001_init.sql` for `handle_new_user` if present). New users land on `/onboarding`.

---

## Vercel setup

### Link repository

1. Import `https://github.com/RogierFlitz/Famli-APP.git`
2. Framework: Next.js (auto-detected)
3. `vercel.json` exists with `"framework": "nextjs"`

### Environment variables

Set for **Production** (and Preview if testing Supabase there):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production domain, no trailing slash |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Required for guest links (`/invite/guest/*`) |

\* Guest links return 404 without service role key.

Security headers are applied via `next.config.ts` and `proxy.ts` — no extra Vercel config needed.

### Domain

1. Vercel → Project → Settings → Domains
2. Update Supabase Auth Site URL to match custom domain

---

## Post-deploy verification (smoke tests)

### Health

```bash
curl https://your-domain.vercel.app/api/health
# → {"ok":true,"mode":"supabase"}
```

### Auth

- [ ] Signup → onboarding → `/vandaag`
- [ ] Login / logout
- [ ] Password reset email (if enabled)
- [ ] Demo buttons **not** visible on `/login`
- [ ] Direct POST to demo action blocked

### Core flows (MVP)

- [ ] **Vandaag**: snapshot loads, handover visible
- [ ] **Regelen**: change request create/respond
- [ ] **Kosten**: expense create, split mark paid, receipt upload/view
- [ ] **Context message**: send + read on linked resource
- [ ] **Handover check-in**: "Ik ben er" persists after refresh
- [ ] **Guest link**: create from regelen → open `/invite/guest/[token]` in incognito → accept/decline

### Security

- [ ] Unauthenticated `/vandaag` redirects to `/login`
- [ ] Response headers include CSP, HSTS (production)
- [ ] Partner account cannot edit custody or expenses (manual test)

---

## Rollback plan

1. **Vercel**: Deployments → previous deployment → **Promote to Production**
2. **Database**: Supabase migrations are forward-only; rollback = restore from backup (Dashboard → Database → Backups) or write compensating SQL
3. **Secrets**: If service role leaked → rotate in Supabase → update Vercel env → redeploy

---

## Known limitations (post-MVP)

These `supabase-store` methods still throw "volgt later in Supabase":

- Needed items (`createNeededItem`, `claimNeededItem`, …)
- Child updates, travel plans, routines
- Extended member invite (`inviteMember`)
- Child sizes update

Demo mode supports all of these locally. Production users hitting these flows will see errors until implemented.

Import jobs are stored but **not processed** (architecture stub only).

---

## Monitoring

- Vercel → Logs / Analytics
- Supabase → Logs Explorer, Auth users
- Review `audit_log` for anomalies after launch

---

## Quick reference

```bash
# Local demo (no Supabase)
npm run dev

# Local with Supabase
cp .env.example .env.local
# fill in Supabase vars
npm run dev

# Verify before deploy
npx tsc --noEmit && npm run test:security && npm run build
```
