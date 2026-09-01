import { DEMO_ADMINS, type AccountStatus, type AdminActor } from "@/lib/admin/types";
import type { AdminRole } from "@/lib/admin/roles";

type Flag = {
  status: AccountStatus;
  blockedAt: string | null;
  blockedReason: string | null;
  blockedBy: string | null;
};

type Note = {
  id: string;
  targetUserId: string | null;
  familyId: string | null;
  authorAdminId: string;
  body: string;
  createdAt: string;
};

type Audit = {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  familyId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type StaffOverride = { userId: string; role: AdminRole };

type AdminMemory = {
  flags: Map<string, Flag>;
  notes: Note[];
  audit: Audit[];
  staff: StaffOverride[];
};

const globalForAdmin = globalThis as unknown as { famliAdminMemoryV1?: AdminMemory };

function store(): AdminMemory {
  if (!globalForAdmin.famliAdminMemoryV1) {
    globalForAdmin.famliAdminMemoryV1 = {
      flags: new Map(),
      notes: [],
      audit: [],
      staff: [],
    };
  }
  return globalForAdmin.famliAdminMemoryV1;
}

export function demoAdminByEmail(email: string): (typeof DEMO_ADMINS)[number] | undefined {
  return DEMO_ADMINS.find((item) => item.email === email.trim().toLowerCase());
}

export function demoAdminById(userId: string): AdminActor | undefined {
  const extra = store().staff.find((item) => item.userId === userId);
  const base = DEMO_ADMINS.find((item) => item.userId === userId);
  if (!base) return undefined;
  return {
    userId: base.userId,
    email: base.email,
    name: base.name,
    role: extra?.role ?? base.role,
  };
}

export function getAccountFlag(userId: string): Flag {
  return (
    store().flags.get(userId) ?? {
      status: "active",
      blockedAt: null,
      blockedReason: null,
      blockedBy: null,
    }
  );
}

export function setAccountFlag(userId: string, flag: Flag): void {
  store().flags.set(userId, flag);
}

export function addSupportNote(note: Note): void {
  store().notes.unshift(note);
}

export function listSupportNotes(filter?: { targetUserId?: string; familyId?: string }): Note[] {
  return store().notes.filter((note) => {
    if (filter?.targetUserId && note.targetUserId !== filter.targetUserId) return false;
    if (filter?.familyId && note.familyId !== filter.familyId) return false;
    return true;
  });
}

export function addAudit(entry: Audit): void {
  store().audit.unshift(entry);
}

export function listAudit(): Audit[] {
  return [...store().audit];
}

export function actorName(actor: AdminActor | undefined, userId: string): string {
  if (actor) return actor.name;
  return demoAdminById(userId)?.name ?? "Admin";
}

export function setStaffRole(userId: string, role: AdminRole): void {
  const next = store().staff.filter((item) => item.userId !== userId);
  next.push({ userId, role });
  store().staff = next;
}

export function listDemoStaff(): AdminActor[] {
  return DEMO_ADMINS.map((item) => demoAdminById(item.userId)).filter((item): item is AdminActor => Boolean(item));
}

export function resetAdminMemoryForTests(): void {
  globalForAdmin.famliAdminMemoryV1 = {
    flags: new Map(),
    notes: [],
    audit: [],
    staff: [],
  };
}
