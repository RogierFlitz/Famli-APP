-- Famli RLS hardening (P0 + P1): onboarding, invites, capabilities, storage, guest tokens

-- ---------------------------------------------------------------------------
-- P0: families INSERT — owner must be creator
-- ---------------------------------------------------------------------------

drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (
    created_by = auth.uid()
    and owner_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- P0: first family member on onboarding (before user is a member)
-- ---------------------------------------------------------------------------

drop policy if exists "members_bootstrap_insert" on public.family_members;
create policy "members_bootstrap_insert" on public.family_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and exists (
      select 1
      from public.families f
      where f.id = family_id
        and f.created_by = auth.uid()
        and f.owner_id = auth.uid()
    )
    and not exists (
      select 1
      from public.family_members fm
      where fm.family_id = family_members.family_id
    )
  );

-- ---------------------------------------------------------------------------
-- P0: invite acceptance (invitee is not yet an active member)
-- ---------------------------------------------------------------------------

drop policy if exists "invites_accept_update" on public.invites;
create policy "invites_accept_update" on public.invites
  for update using (
    email = (select email from public.profiles where id = auth.uid())
    and revoked_at is null
    and accepted_at is null
    and expires_at > now()
  )
  with check (accepted_at is not null);

drop policy if exists "members_accept_invite_update" on public.family_members;
create policy "members_accept_invite_update" on public.family_members
  for update using (
    invited_email = (select email from public.profiles where id = auth.uid())
    and status = 'invited'
    and user_id is null
  )
  with check (
    user_id = auth.uid()
    and status = 'active'
  );

-- ---------------------------------------------------------------------------
-- P0: activity log — prevent actor_id spoofing
-- ---------------------------------------------------------------------------

drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert" on public.activity_log
  for insert with check (
    public.is_family_member(family_id)
    and actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- P1: storage — exclude receipts path from document policies (OR-leak fix)
-- ---------------------------------------------------------------------------

drop policy if exists "storage_family_read" on storage.objects;
drop policy if exists "storage_family_insert" on storage.objects;
drop policy if exists "storage_family_update" on storage.objects;
drop policy if exists "storage_family_delete" on storage.objects;

create policy "storage_family_read"
on storage.objects for select
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'view_documents')
);

create policy "storage_family_insert"
on storage.objects for insert
with check (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_update"
on storage.objects for update
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

create policy "storage_family_delete"
on storage.objects for delete
using (
  bucket_id = 'family-documents'
  and (storage.foldername(name))[2] is distinct from 'receipts'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
  and public.has_family_role((storage.foldername(name))[1]::uuid, array['owner', 'parent'])
  and public.member_capability((storage.foldername(name))[1]::uuid, 'upload_documents')
);

-- ---------------------------------------------------------------------------
-- P1: guest_link_tokens — store hash only, never expose plaintext via RLS
-- ---------------------------------------------------------------------------

alter table public.guest_link_tokens
  add column if not exists token_hash text;

update public.guest_link_tokens
set token_hash = encode(digest(token, 'sha256'), 'hex')
where token_hash is null
  and token is not null;

alter table public.guest_link_tokens
  alter column token_hash set not null;

drop index if exists idx_guest_link_tokens_token;

create unique index if not exists idx_guest_link_tokens_token_hash
  on public.guest_link_tokens (token_hash);

alter table public.guest_link_tokens
  drop column if exists token;

drop policy if exists "guest_link_tokens_select" on public.guest_link_tokens;
create policy "guest_link_tokens_select" on public.guest_link_tokens
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

-- ---------------------------------------------------------------------------
-- P1: capability policies for remaining 0001 tables
-- ---------------------------------------------------------------------------

-- events
drop policy if exists "events_member" on public.events;
drop policy if exists "events_write" on public.events;
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "events_select" on public.events
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_calendar')
  );

create policy "events_insert" on public.events
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "events_update" on public.events
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_calendar')
  );

create policy "events_delete" on public.events
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_calendar')
  );

-- event_participants
drop policy if exists "event_participants_member" on public.event_participants;
drop policy if exists "event_participants_write" on public.event_participants;
drop policy if exists "event_participants_select" on public.event_participants;
drop policy if exists "event_participants_insert" on public.event_participants;
drop policy if exists "event_participants_update" on public.event_participants;
drop policy if exists "event_participants_delete" on public.event_participants;

create policy "event_participants_select" on public.event_participants
  for select using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'view_calendar')
    )
  );

create policy "event_participants_insert" on public.event_participants
  for insert with check (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

create policy "event_participants_update" on public.event_participants
  for update using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

create policy "event_participants_delete" on public.event_participants
  for delete using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and public.has_family_role(e.family_id, array['owner', 'parent'])
        and public.member_capability(e.family_id, 'edit_calendar')
    )
  );

-- handovers
drop policy if exists "handovers_member" on public.handovers;
drop policy if exists "handovers_write" on public.handovers;
drop policy if exists "handovers_select" on public.handovers;
drop policy if exists "handovers_insert" on public.handovers;
drop policy if exists "handovers_update" on public.handovers;
drop policy if exists "handovers_delete" on public.handovers;

create policy "handovers_select" on public.handovers
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "handovers_insert" on public.handovers
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "handovers_update" on public.handovers
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "handovers_delete" on public.handovers
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_custody')
  );

-- handover_children
drop policy if exists "handover_children_member" on public.handover_children;
drop policy if exists "handover_children_write" on public.handover_children;
drop policy if exists "handover_children_select" on public.handover_children;
drop policy if exists "handover_children_insert" on public.handover_children;
drop policy if exists "handover_children_update" on public.handover_children;
drop policy if exists "handover_children_delete" on public.handover_children;

create policy "handover_children_select" on public.handover_children
  for select using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'view_custody')
    )
  );

create policy "handover_children_insert" on public.handover_children
  for insert with check (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

create policy "handover_children_update" on public.handover_children
  for update using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.is_family_member(h.family_id)
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

create policy "handover_children_delete" on public.handover_children
  for delete using (
    exists (
      select 1
      from public.handovers h
      where h.id = handover_id
        and public.has_family_role(h.family_id, array['owner', 'parent'])
        and public.member_capability(h.family_id, 'edit_custody')
    )
  );

-- change_requests
drop policy if exists "change_requests_member" on public.change_requests;
drop policy if exists "change_requests_write" on public.change_requests;
drop policy if exists "change_requests_select" on public.change_requests;
drop policy if exists "change_requests_insert" on public.change_requests;
drop policy if exists "change_requests_update" on public.change_requests;
drop policy if exists "change_requests_delete" on public.change_requests;

create policy "change_requests_select" on public.change_requests
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_custody')
  );

create policy "change_requests_insert" on public.change_requests
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "change_requests_update" on public.change_requests
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_custody')
  );

create policy "change_requests_delete" on public.change_requests
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_custody')
  );

-- tasks
drop policy if exists "tasks_member" on public.tasks;
drop policy if exists "tasks_write" on public.tasks;
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_tasks')
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "tasks_update" on public.tasks
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_tasks')
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_tasks')
  );

-- expense_splits
drop policy if exists "splits_member" on public.expense_splits;
drop policy if exists "splits_write" on public.expense_splits;
drop policy if exists "splits_select" on public.expense_splits;
drop policy if exists "splits_insert" on public.expense_splits;
drop policy if exists "splits_update" on public.expense_splits;
drop policy if exists "splits_delete" on public.expense_splits;

create policy "splits_select" on public.expense_splits
  for select using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'view_expenses')
    )
  );

create policy "splits_insert" on public.expense_splits
  for insert with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

create policy "splits_update" on public.expense_splits
  for update using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.is_family_member(e.family_id)
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

create policy "splits_delete" on public.expense_splits
  for delete using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and public.has_family_role(e.family_id, array['owner', 'parent'])
        and public.member_capability(e.family_id, 'edit_expenses')
    )
  );

-- recurring_expenses
drop policy if exists "recurring_member" on public.recurring_expenses;
drop policy if exists "recurring_write" on public.recurring_expenses;
drop policy if exists "recurring_select" on public.recurring_expenses;
drop policy if exists "recurring_insert" on public.recurring_expenses;
drop policy if exists "recurring_update" on public.recurring_expenses;
drop policy if exists "recurring_delete" on public.recurring_expenses;

create policy "recurring_select" on public.recurring_expenses
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_expenses')
  );

create policy "recurring_insert" on public.recurring_expenses
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "recurring_update" on public.recurring_expenses
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_expenses')
  );

create policy "recurring_delete" on public.recurring_expenses
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_expenses')
  );

-- vacations
drop policy if exists "vacations_member" on public.vacations;
drop policy if exists "vacations_write" on public.vacations;
drop policy if exists "vacations_select" on public.vacations;
drop policy if exists "vacations_insert" on public.vacations;
drop policy if exists "vacations_update" on public.vacations;
drop policy if exists "vacations_delete" on public.vacations;

create policy "vacations_select" on public.vacations
  for select using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'view_travel')
  );

create policy "vacations_insert" on public.vacations
  for insert with check (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "vacations_update" on public.vacations
  for update using (
    public.is_family_member(family_id)
    and public.member_capability(family_id, 'edit_travel')
  );

create policy "vacations_delete" on public.vacations
  for delete using (
    public.has_family_role(family_id, array['owner', 'parent'])
    and public.member_capability(family_id, 'edit_travel')
  );

-- notifications INSERT — target must be an active family member
drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (
    public.is_family_member(family_id)
    and user_id in (
      select fm.user_id
      from public.family_members fm
      where fm.family_id = notifications.family_id
        and fm.user_id is not null
        and fm.status = 'active'
    )
  );
