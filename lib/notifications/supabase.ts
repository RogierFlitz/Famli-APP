import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification } from "@/lib/domain/types";
import type { CreateNotificationInput, NotifyFamilyInput } from "@/lib/notifications/types";
import { allowsInAppNotification } from "@/lib/notifications/prefs";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    userId: String(row.user_id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    type: String(row.type),
    title: String(row.title),
    body: String(row.body ?? ""),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.read_at ? String(row.read_at) : null,
    channel: (row.channel as AppNotification["channel"]) ?? "in_app",
    createdAt: String(row.created_at),
  };
}

async function isDuplicate(
  supabase: SupabaseClient,
  input: Pick<CreateNotificationInput, "userId" | "type" | "entityType" | "entityId">,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", input.userId)
    .eq("type", input.type)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .gte("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput,
): Promise<AppNotification | null> {
  if (input.userId === input.actorId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", input.userId)
    .maybeSingle();
  if (!allowsInAppNotification(profile?.notification_prefs, input.type)) return null;
  if (await isDuplicate(supabase, input)) return null;

  const payload = {
    entityType: input.entityType,
    entityId: input.entityId,
    ...input.payload,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      family_id: input.familyId,
      user_id: input.userId,
      actor_id: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload,
      channel: "in_app",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function notifyFamilyMembers(
  supabase: SupabaseClient,
  input: NotifyFamilyInput,
): Promise<void> {
  const recipients = [...new Set(input.recipientUserIds)].filter((id) => id !== input.actorId);
  await Promise.all(
    recipients.map((userId) => createNotification(supabase, { ...input, userId })),
  );
}

export async function fetchActiveMemberUserIds(
  supabase: SupabaseClient,
  familyId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("status", "active")
    .not("user_id", "is", null);
  return (data ?? [])
    .map((row) => row.user_id as string)
    .filter((id) => !excludeUserId || id !== excludeUserId);
}

export async function fetchMemberUserId(
  supabase: SupabaseClient,
  memberId: string | null | undefined,
): Promise<string | null> {
  if (!memberId) return null;
  const { data } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("id", memberId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export { mapRow as mapNotificationRow };
