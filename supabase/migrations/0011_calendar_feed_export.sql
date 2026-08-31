-- Secret ICS subscription tokens (Famli → Google / Apple / Outlook).
-- Plaintext token is shown once; only the SHA-256 hash is stored.
-- Public feed lookup uses the service role (no anon policy on token_hash).

create table if not exists public.calendar_feed_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists idx_calendar_feed_tokens_hash
  on public.calendar_feed_tokens (token_hash);

create unique index if not exists idx_calendar_feed_tokens_active_user
  on public.calendar_feed_tokens (user_id)
  where revoked_at is null;

create index if not exists idx_calendar_feed_tokens_family
  on public.calendar_feed_tokens (family_id);

comment on table public.calendar_feed_tokens is
  'Hashed ICS export feed tokens. Service role reads by hash for unauthenticated calendar clients.';

alter table public.calendar_feed_tokens enable row level security;

drop policy if exists "calendar_feed_tokens_select_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_select_own"
  on public.calendar_feed_tokens
  for select
  using (
    user_id = auth.uid()
    and public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

drop policy if exists "calendar_feed_tokens_insert_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_insert_own"
  on public.calendar_feed_tokens
  for insert
  with check (
    user_id = auth.uid()
    and public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

drop policy if exists "calendar_feed_tokens_update_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_update_own"
  on public.calendar_feed_tokens
  for update
  using (
    user_id = auth.uid()
    and public.is_family_member(family_id)
  )
  with check (
    user_id = auth.uid()
    and public.is_family_member(family_id)
  );
