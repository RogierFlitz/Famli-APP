import { randomUUID } from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FamilySnapshot } from "@/lib/domain/types";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view_sensitive"
  | "invite"
  | "accept_invite"
  | "revoke_invite"
  | "upload"
  | "login"
  | "logout"
  | "permission_denied";

export interface AuditEntry {
  familyId: string;
  actorUserId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

const memoryAuditLog: AuditEntry[] = [];

export async function writeAuditLog(
  snapshot: FamilySnapshot,
  entry: Omit<AuditEntry, "familyId" | "actorUserId">,
): Promise<void> {
  const full: AuditEntry = {
    familyId: snapshot.family.id,
    actorUserId: snapshot.currentProfile.id,
    ...entry,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("audit_log").insert({
        id: randomUUID(),
        family_id: full.familyId,
        actor_user_id: full.actorUserId,
        action: full.action,
        resource_type: full.resourceType,
        resource_id: full.resourceId,
        metadata: full.metadata ?? {},
      });
    } catch {
      // Audit must not block mutations; log failure silently in production.
    }
    return;
  }

  memoryAuditLog.unshift(full);
  if (memoryAuditLog.length > 500) memoryAuditLog.pop();
}

/** Test helper */
export function getMemoryAuditLog(): readonly AuditEntry[] {
  return memoryAuditLog;
}

export function clearMemoryAuditLogForTests(): void {
  memoryAuditLog.length = 0;
}
