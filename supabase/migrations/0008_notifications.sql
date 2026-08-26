-- Extend notifications for actor/entity tracking, dedup, delete, and optional realtime.

alter table public.notifications
  add column if not exists actor_id uuid references public.profiles (id) on delete set null,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

comment on column public.notifications.body is 'Notification message (shown in UI).';
comment on column public.notifications.actor_id is 'User who triggered the notification.';
comment on column public.notifications.entity_type is 'Linked entity kind for navigation.';
comment on column public.notifications.entity_id is 'Linked entity id for navigation.';

create index if not exists idx_notifications_entity_dedup
  on public.notifications (user_id, type, entity_type, entity_id, created_at desc);

create index if not exists idx_notifications_family_created
  on public.notifications (family_id, created_at desc);

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self" on public.notifications
  for delete using (user_id = auth.uid());

-- Backfill entity columns from payload when present (idempotent).
update public.notifications n
set
  entity_type = coalesce(n.entity_type, n.payload->>'entityType', n.type),
  entity_id = coalesce(
    n.entity_id,
    nullif(n.payload->>'entityId', '')::uuid,
    nullif(n.payload->>'changeRequestId', '')::uuid,
    nullif(n.payload->>'taskId', '')::uuid,
    nullif(n.payload->>'expenseId', '')::uuid,
    nullif(n.payload->>'handoverId', '')::uuid,
    nullif(n.payload->>'neededItemId', '')::uuid,
    nullif(n.payload->>'childId', '')::uuid,
    nullif(n.payload->>'documentId', '')::uuid
  )
where n.entity_type is null or n.entity_id is null;
