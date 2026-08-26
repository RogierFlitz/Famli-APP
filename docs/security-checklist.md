# Pre-production security checklist

Use this checklist before launching Famli to production.

## Supabase

- [ ] Run migrations in order: `0001_init.sql`, `0002_security_foundation.sql`, `0003_expense_receipt_metadata.sql`, `0004_production_features.sql`
- [ ] Confirm RLS enabled on all tables (`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)
- [ ] Verify no policy uses `auth.role() = 'authenticated'` alone
- [ ] Create private bucket `family-documents` (migration handles this)
- [ ] Enable email confirmation: Dashboard → Authentication → Providers → Email → Confirm email
- [ ] Configure password requirements: Authentication → Policies
- [ ] Set site URL and redirect URLs: Authentication → URL Configuration
- [ ] Enable MFA (TOTP): Authentication → MFA → Enable
- [ ] Review JWT expiry (default 3600s; refresh via SSR proxy)

## Environment (Vercel)

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (Production env — required for guest links)
- [ ] Confirm `.env*` is gitignored; no secrets in repo
- [ ] Run `grep -r "service_role" .next/` after build — must be empty

## Application

- [ ] All server actions use `requireAuthorizedMutation()` or equivalent
- [ ] Partners tested: cannot edit custody, expenses, or invite members
- [ ] Child access tested: partner sees only assigned children
- [ ] Demo mode uses separate in-memory family (no Supabase when unconfigured)
- [ ] Security headers present (check response in browser DevTools → Network)
- [ ] CSP allows Supabase connect-src for your project URL
- [ ] File uploads validate MIME, size, extension server-side
- [ ] Audit log writes on sensitive mutations

## Auth flows

- [ ] Login works (Supabase + demo)
- [ ] Signup sends confirmation email (if enabled)
- [ ] Password reset email works
- [ ] Logout clears session cookie
- [ ] Open redirect blocked (`?next=https://evil.com` → safe fallback)
- [ ] Rate limiting triggers on repeated login failures

## Monitoring

- [ ] Enable Supabase log drain or Vercel log monitoring
- [ ] Set up alerts for auth anomaly spikes
- [ ] Document incident response (see SECURITY.md)

## Tests

```bash
npm run test:security
npx tsc --noEmit
```

## Post-launch

- [ ] Rotate keys if any exposure suspected
- [ ] Review audit_log weekly for `permission_denied` spikes
- [ ] Re-run checklist after major feature releases
