export const ADMIN_SESSION_COOKIE = "famli_admin_session";

export const DEMO_ADMINS = [
  {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    email: "super@famli.internal",
    name: "Isa Super",
    role: "super_admin" as const,
  },
  {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    email: "support@famli.internal",
    name: "Lars Support",
    role: "support_admin" as const,
  },
  {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    email: "readonly@famli.internal",
    name: "Noor Inzicht",
    role: "readonly_admin" as const,
  },
] as const;

export type AccountStatus = "active" | "blocked";

export interface AdminActor {
  userId: string;
  email: string;
  name: string;
  role: "super_admin" | "support_admin" | "readonly_admin";
}

export interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastActivityAt: string | null;
  onboardingCompleted: boolean;
  accountStatus: AccountStatus;
  familyId: string | null;
  familyName: string | null;
  familyRole: string | null;
  googleConnected: boolean;
  microsoftConnected: boolean;
  appleIcs: boolean;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
}

export interface AdminFamilyRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  memberCount: number;
  childCount: number;
  createdAt: string;
  lastActivityAt: string | null;
  onboardingCompletedCount: number;
  googleCount: number;
  microsoftCount: number;
  appleCount: number;
  plan: string;
  subscriptionStatus: string;
}

export interface AdminSupportNote {
  id: string;
  targetUserId: string | null;
  familyId: string | null;
  authorAdminId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  adminUserId: string;
  adminName: string;
  action: string;
  targetUserId: string | null;
  familyId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDashboardStats {
  userCount: number;
  familyCount: number;
  childCount: number;
  active7d: number;
  active30d: number;
  registrationsToday: number;
  registrationsWeek: number;
  pendingInvites: number;
  connectedCalendars: number;
  onboardingCompletedPct: number;
  payingCount: number;
  freeCount: number;
}

export type UserFilter =
  | "all"
  | "active"
  | "blocked"
  | "onboarding_open"
  | "recent"
  | "microsoft"
  | "google"
  | "no_family"
  | "pending_invite";
