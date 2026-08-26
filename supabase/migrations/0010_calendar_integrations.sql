-- Calendar integrations: OAuth tokens, external events, sanitized family view

alter table public.calendar_connections
  add column if not exists provider_account_id text,
  add column if not exists provider_account_email text,
  add column if not exists access_token_encrypted text,
  add column if not exists refresh_token_encrypted text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists scopes text[] not null default '{}',
  add column if not exists selected_calendars jsonb not null default '[]'::jsonb,
  add column if not exists ics_url_encrypted text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_error text;

comment on column public.calendar_connections.access_token_encrypted is 'Server-only AES-256-GCM; never expose to clients.';
comment on column public.calendar_connections.refresh_token_encrypted is 'Server-only AES-256-GCM; never expose to clients.';
comment on column public.calendar_connections.ics_url_encrypted is 'Server-only encrypted ICS subscription URL (Apple Calendar).';

create table if not exists public.calendar_external_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_connections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  provider_event_id text not null,
  calendar_id text,
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_event_id)
);

create index if not exists idx_calendar_external_events_family_starts
  on public.calendar_external_events (family_id, starts_at);
create index if not exists idx_calendar_external_events_user
  on public.calendar_external_events (user_id, starts_at);
create index if not exists idx_calendar_connections_family
  on public.calendar_connections (family_id, status);

do $$
declare
  t text;
begin
  foreach t in array array['calendar_external_events']
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  exception when duplicate_object then null;
  end loop;
end $$;

alter table public.calendar_external_events enable row level security;

-- Owner full read/write on own external events
create policy "calendar_external_events_owner"
  on public.calendar_external_events
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sanitized read for family members (no raw title/location for others when privacy restricts)
create or replace function public.get_family_external_calendar_events(p_family_id uuid)
returns table (
  id uuid,
  user_id uuid,
  provider text,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  location text,
  all_day boolean,
  is_busy_only boolean,
  is_own boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null or not public.is_family_member(p_family_id) then
    return;
  end if;

  return query
  select
    e.id,
    e.user_id,
    c.provider,
    e.starts_at,
    e.ends_at,
    case
      when e.user_id = v_viewer then e.title
      when c.privacy_mode = 'busy' then 'Bezet'
      when c.privacy_mode = 'full' then e.title
      else null
    end as title,
    case
      when e.user_id = v_viewer then e.location
      when c.privacy_mode = 'full' then e.location
      else null
    end as location,
    e.all_day,
    (e.user_id <> v_viewer and c.privacy_mode = 'busy') as is_busy_only,
    (e.user_id = v_viewer) as is_own
  from public.calendar_external_events e
  join public.calendar_connections c on c.id = e.connection_id
  where e.family_id = p_family_id
    and c.status = 'connected'
    and (
      e.user_id = v_viewer
      or c.privacy_mode <> 'hidden'
    )
    and e.starts_at >= (now() - interval '90 days')
    and e.starts_at <= (now() + interval '365 days');
end;
$$;

revoke all on function public.get_family_external_calendar_events(uuid) from public;
grant execute on function public.get_family_external_calendar_events(uuid) to authenticated;
