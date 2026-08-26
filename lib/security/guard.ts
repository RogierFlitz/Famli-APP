import { requireSnapshot } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import {
  type Capability,
  hasCapability,
  hasChildCapability,
} from "@/lib/security/capabilities";
import { assertRateLimit, type RateLimitScope } from "@/lib/security/rate-limit";
import type { FamilySnapshot } from "@/lib/domain/types";

export class AuthorizationError extends Error {
  constructor(message = "Geen toegang.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface MutationContext {
  snapshot: FamilySnapshot;
}

function assertSameFamily(snapshot: FamilySnapshot, familyId?: string): void {
  if (familyId && familyId !== snapshot.family.id) {
    throw new AuthorizationError("Gezins-ID komt niet overeen met je sessie.");
  }
}

export async function requireAuthorizedMutation(input: {
  capability: Capability;
  childId?: string | null;
  familyId?: string;
  rateLimit?: RateLimitScope;
  auditOnDeny?: boolean;
}): Promise<MutationContext> {
  const snapshot = await requireSnapshot();

  if (input.rateLimit) {
    assertRateLimit(input.rateLimit, snapshot.currentProfile.id);
  }

  assertSameFamily(snapshot, input.familyId);

  const allowed = input.childId
    ? hasChildCapability(snapshot, input.childId, input.capability)
    : hasCapability(snapshot, input.capability);

  if (!allowed) {
    if (input.auditOnDeny !== false) {
      await writeAuditLog(snapshot, {
        action: "permission_denied",
        resourceType: "capability",
        resourceId: input.capability,
        metadata: { childId: input.childId ?? null },
      });
    }
    throw new AuthorizationError();
  }

  return { snapshot };
}

export function assertResourceInFamily(
  snapshot: FamilySnapshot,
  resourceFamilyId: string,
): void {
  if (resourceFamilyId !== snapshot.family.id) {
    throw new AuthorizationError("Bron behoort niet tot jouw gezin.");
  }
}

export function assertChildInFamily(snapshot: FamilySnapshot, childId: string): void {
  const child = snapshot.children.find((c) => c.id === childId);
  if (!child || child.familyId !== snapshot.family.id) {
    throw new AuthorizationError("Kind niet gevonden in dit gezin.");
  }
}

export function assertMemberInFamily(snapshot: FamilySnapshot, memberId: string): void {
  const member = snapshot.members.find((m) => m.id === memberId);
  if (!member || member.familyId !== snapshot.family.id) {
    throw new AuthorizationError("Gezinslid niet gevonden.");
  }
}

/** Whitelist fields — prevents mass assignment from client payloads. */
export function pickFields<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in source) result[key] = source[key];
  }
  return result;
}
