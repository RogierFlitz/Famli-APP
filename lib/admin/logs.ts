import { actorName, listAudit, listSupportNotes } from "@/lib/admin/memory";
import { DEMO_ADMINS, type AdminAuditEntry, type AdminSupportNote } from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function nameFor(userId: string): string {
  return DEMO_ADMINS.find((item) => item.userId === userId)?.name ?? "Admin";
}

export async function loadSupportNotes(filter?: {
  targetUserId?: string;
  familyId?: string;
}): Promise<AdminSupportNote[]> {
  if (!isSupabaseConfigured()) {
    return listSupportNotes(filter).map((note) => ({
      ...note,
      authorName: nameFor(note.authorAdminId),
    }));
  }
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("admin_support_notes")
    .select("id, target_user_id, family_id, author_admin_id, body, created_at")
    .order("created_at", { ascending: false });
  if (filter?.targetUserId) query = query.eq("target_user_id", filter.targetUserId);
  if (filter?.familyId) query = query.eq("family_id", filter.familyId);
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    targetUserId: (row.target_user_id as string) ?? null,
    familyId: (row.family_id as string) ?? null,
    authorAdminId: row.author_admin_id as string,
    authorName: actorName(undefined, row.author_admin_id as string),
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

export async function loadAuditLog(): Promise<AdminAuditEntry[]> {
  if (!isSupabaseConfigured()) {
    return listAudit().map((entry) => ({
      ...entry,
      adminName: nameFor(entry.adminUserId),
    }));
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, admin_user_id, action, target_user_id, family_id, reason, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    adminUserId: row.admin_user_id as string,
    adminName: nameFor(row.admin_user_id as string),
    action: row.action as string,
    targetUserId: (row.target_user_id as string) ?? null,
    familyId: (row.family_id as string) ?? null,
    reason: (row.reason as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}
