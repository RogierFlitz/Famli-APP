-- Production features: context messages, guest links, handover check-ins, import jobs

-- ---------------------------------------------------------------------------
-- context_messages
-- ---------------------------------------------------------------------------

create table if not exists public.context_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  kind text not null check (kind in ('update', 'confirmation')),
  body text not null,
  author_member_id uuid not null references public.family_members (id),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  read_by_member_id uuid references public.family_members (id),
  status text not null default 'sent'
    check (status in ('sent', 'read', 'confirmed', 'declined')),
  response_body text,
  responded_at timestamptz,
  responded_by_member_id uuid references public.family_members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_context_messages_family
  on public.context_messages (family_id);
create index if not exists idx_context_messages_resource
  on public.context_messages (family_id, resource_type, resource_id);

create trigger context_messages_set_updated_at
  before update on public.context_messages
  for each row execute function public.set_updated_at();

alter table public.context_messages enable row level security;

create policy "context_messages_select" on public.context_messages
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "context_messages_insert" on public.context_messages
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
    and author_member_id = public.current_member_id(family_id)
  );

create policy "context_messages_update" on public.context_messages
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

-- ---------------------------------------------------------------------------
-- guest_link_tokens (public access via service role only — no anon policy)
-- ---------------------------------------------------------------------------

create table if not exists public.guest_link_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  label text not null,
  token text not null unique,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  change_request_id uuid references public.change_requests (id) on delete set null,
  created_by_member_id uuid not null references public.family_members (id),
  created_at timestamptz not null default now(),
  response text check (response in ('accepted', 'declined')),
  responded_at timestamptz,
  responded_by_name text
);

create index if not exists idx_guest_link_tokens_family
  on public.guest_link_tokens (family_id);
create index if not exists idx_guest_link_tokens_token
  on public.guest_link_tokens (token);

alter table public.guest_link_tokens enable row level security;

create policy "guest_link_tokens_select" on public.guest_link_tokens
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "guest_link_tokens_insert" on public.guest_link_tokens
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
    and created_by_member_id = public.current_member_id(family_id)
  );

-- ---------------------------------------------------------------------------
-- handover_check_ins
-- ---------------------------------------------------------------------------

create table if not exists public.handover_check_ins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  handover_id uuid not null references public.handovers (id) on delete cascade,
  member_id uuid not null references public.family_members (id),
  checked_in_at timestamptz not null default now(),
  unique (handover_id)
);

create index if not exists idx_handover_check_ins_family
  on public.handover_check_ins (family_id);

alter table public.handover_check_ins enable row level security;

create policy "handover_check_ins_select" on public.handover_check_ins
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "handover_check_ins_insert" on public.handover_check_ins
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
    and member_id = public.current_member_id(family_id)
  );

-- ---------------------------------------------------------------------------
-- import_jobs (placeholder — no parser yet)
-- ---------------------------------------------------------------------------

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  source text not null check (source in ('photo', 'pdf', 'email')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_jobs_family
  on public.import_jobs (family_id);

alter table public.import_jobs enable row level security;

create policy "import_jobs_select" on public.import_jobs
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "import_jobs_insert" on public.import_jobs
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );
