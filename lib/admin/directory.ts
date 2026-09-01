import { getAccountFlag } from "@/lib/admin/memory";
import type {
  AccountStatus,
  AdminDashboardStats,
  AdminFamilyRow,
  AdminUserRow,
  UserFilter,
} from "@/lib/admin/types";
import {
  listMemoryAdminFamilies,
  listMemoryAdminUsers,
} from "@/lib/data/memory-store";
import type { FamilySnapshot, Profile } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function providerFlags(snap: FamilySnapshot | undefined, userId: string) {
  const connections = snap?.calendarConnections.filter((item) => item.userId === userId && item.status === "connected") ?? [];
  const errors = snap?.calendarConnections.filter((item) => item.userId === userId && item.syncError) ?? [];
  const lastSynced = connections
    .map((item) => item.lastSyncedAt)
    .filter((item): item is string => Boolean(item))
    .sort()
    .at(-1) ?? null;
  return {
    googleConnected: connections.some((item) => item.provider === "google"),
    microsoftConnected: connections.some((item) => item.provider === "microsoft"),
    appleIcs: connections.some((item) => item.provider === "apple_ics"),
    lastSyncError: errors[0]?.syncError ?? null,
    lastSyncedAt: lastSynced,
  };
}

function familyForUser(families: FamilySnapshot[], userId: string): FamilySnapshot | undefined {
  return families.find((snap) => snap.members.some((member) => member.userId === userId));
}

function toUserRow(profile: Profile, families: FamilySnapshot[]): AdminUserRow {
  const snap = familyForUser(families, profile.id);
  const member = snap?.members.find((item) => item.userId === profile.id);
  const providers = providerFlags(snap, profile.id);
  const flag = getAccountFlag(profile.id);
  const lastActivity =
    snap?.activityLog
      .filter((item) => item.actorId === profile.id)
      .map((item) => item.createdAt)
      .sort()
      .at(-1) ?? profile.updatedAt;
  const pendingInvite = snap?.invites.some(
    (invite) => !invite.acceptedAt && invite.email.toLowerCase() === profile.email.toLowerCase(),
  );
  const prefs = profile.notificationPrefs;
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    createdAt: profile.createdAt,
    lastActivityAt: lastActivity,
    onboardingCompleted: Boolean(profile.onboardingCompletedAt),
    accountStatus: flag.status,
    familyId: snap?.family.id ?? null,
    familyName: snap?.family.name ?? null,
    familyRole: member?.role ?? null,
    ...providers,
    hasPendingInvite: Boolean(pendingInvite),
    notificationChannels: prefs
      ? {
          inApp: Object.values(prefs).some((item) => item.inApp),
          email: Object.values(prefs).some((item) => item.email),
          push: Object.values(prefs).some((item) => item.push),
        }
      : null,
  };
}

function toFamilyRow(snap: FamilySnapshot, users: Profile[]): AdminFamilyRow {
  const owner = users.find((item) => item.id === snap.family.ownerId);
  const onboardingCompletedCount = snap.members.filter((member) => {
    const profile = member.userId ? snap.profiles[member.userId] : null;
    return Boolean(profile?.onboardingCompletedAt);
  }).length;
  const connections = snap.calendarConnections.filter((item) => item.status === "connected");
  const lastActivity =
    snap.activityLog.map((item) => item.createdAt).sort().at(-1) ?? snap.family.updatedAt;
  return {
    id: snap.family.id,
    name: snap.family.name,
    ownerEmail: owner?.email ?? null,
    memberCount: snap.members.filter((item) => item.status === "active").length,
    childCount: snap.children.length,
    createdAt: snap.family.createdAt,
    lastActivityAt: lastActivity,
    onboardingCompletedCount,
    googleCount: connections.filter((item) => item.provider === "google").length,
    microsoftCount: connections.filter((item) => item.provider === "microsoft").length,
    appleCount: connections.filter((item) => item.provider === "apple_ics").length,
    plan: snap.family.plan,
    subscriptionStatus: snap.family.subscriptionStatus,
  };
}

export function filterUsers(rows: AdminUserRow[], filter: UserFilter, query: string): AdminUserRow[] {
  const q = query.trim().toLowerCase();
  let next = rows;
  const recent = daysAgo(7).toISOString();
  switch (filter) {
    case "active":
      next = next.filter((item) => item.accountStatus === "active");
      break;
    case "blocked":
      next = next.filter((item) => item.accountStatus === "blocked");
      break;
    case "onboarding_open":
      next = next.filter((item) => !item.onboardingCompleted);
      break;
    case "recent":
      next = next.filter((item) => item.createdAt >= recent);
      break;
    case "microsoft":
      next = next.filter((item) => item.microsoftConnected);
      break;
    case "google":
      next = next.filter((item) => item.googleConnected);
      break;
    case "no_family":
      next = next.filter((item) => !item.familyId);
      break;
    case "pending_invite":
      next = next.filter((item) => item.hasPendingInvite);
      break;
    default:
      break;
  }
  if (!q) return next;
  return next.filter(
    (item) =>
      item.email.toLowerCase().includes(q) ||
      `${item.firstName} ${item.lastName}`.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q),
  );
}

export function emptyAdminStats(): AdminDashboardStats {
  return {
    userCount: 0,
    familyCount: 0,
    childCount: 0,
    active7d: 0,
    active30d: 0,
    registrationsToday: 0,
    registrationsWeek: 0,
    pendingInvites: 0,
    connectedCalendars: 0,
    onboardingCompletedPct: 0,
    payingCount: 0,
    freeCount: 0,
    registrationsLast7Days: [0, 0, 0, 0, 0, 0, 0],
    registrationDayLabels: ["ma", "di", "wo", "do", "vr", "za", "zo"],
    onboardedCount: 0,
    openOnboardingCount: 0,
    blockedCount: 0,
    withFamilyCount: 0,
    noFamilyCount: 0,
  };
}

function statsFrom(users: AdminUserRow[], families: AdminFamilyRow[], pendingInvites: number): AdminDashboardStats {
  const now = new Date();
  const today = startOfDay(now).toISOString();
  const week = daysAgo(7).toISOString();
  const d7 = daysAgo(7).toISOString();
  const d30 = daysAgo(30).toISOString();
  const onboarded = users.filter((item) => item.onboardingCompleted).length;
  const paying = families.filter((item) => item.plan !== "free" && item.subscriptionStatus === "active").length;
  const dayStarts = Array.from({ length: 7 }, (_, index) =>
    startOfDay(new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000)),
  );
  const registrationsLast7Days = dayStarts.map((day) => {
    const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    return users.filter((item) => {
      const created = new Date(item.createdAt).getTime();
      return created >= day.getTime() && created < nextDay.getTime();
    }).length;
  });
  const withFamilyCount = users.filter((item) => item.familyId).length;
  return {
    userCount: users.length,
    familyCount: families.length,
    childCount: families.reduce((sum, item) => sum + item.childCount, 0),
    active7d: users.filter((item) => (item.lastActivityAt ?? "") >= d7).length,
    active30d: users.filter((item) => (item.lastActivityAt ?? "") >= d30).length,
    registrationsToday: users.filter((item) => item.createdAt >= today).length,
    registrationsWeek: users.filter((item) => item.createdAt >= week).length,
    pendingInvites,
    connectedCalendars: users.filter((item) => item.googleConnected || item.microsoftConnected || item.appleIcs).length,
    onboardingCompletedPct: users.length ? Math.round((onboarded / users.length) * 100) : 0,
    payingCount: paying,
    freeCount: families.filter((item) => item.plan === "free").length,
    registrationsLast7Days,
    registrationDayLabels: dayStarts.map((day) => day.toLocaleDateString("nl-NL", { weekday: "short" })),
    onboardedCount: onboarded,
    openOnboardingCount: users.length - onboarded,
    blockedCount: users.filter((item) => item.accountStatus === "blocked").length,
    withFamilyCount,
    noFamilyCount: users.length - withFamilyCount,
  };
}

export async function loadAdminDirectory(): Promise<{
  users: AdminUserRow[];
  families: AdminFamilyRow[];
  stats: AdminDashboardStats;
  pendingInviteIds: string[];
}> {
  if (!isSupabaseConfigured()) {
    const familySnaps = listMemoryAdminFamilies();
    const profiles = listMemoryAdminUsers();
    const users = profiles.map((profile) => toUserRow(profile, familySnaps));
    const families = familySnaps.map((snap) => toFamilyRow(snap, profiles));
    const pending = familySnaps.flatMap((snap) =>
      snap.invites.filter((invite) => !invite.acceptedAt).map((invite) => invite.id),
    );
    return {
      users,
      families,
      stats: statsFrom(users, families, pending.length),
      pendingInviteIds: pending,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [
    { data: profileRows },
    { data: familyRows },
    { data: memberRows },
    { data: childRows },
    { data: inviteRows },
    { data: connectionRows },
    { data: flagRows },
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name, created_at, updated_at, onboarding_completed_at"),
    supabase.from("families").select("id, name, owner_id, created_at, updated_at, plan, subscription_status"),
    supabase.from("family_members").select("id, family_id, user_id, role, status"),
    supabase.from("children").select("id, family_id"),
    supabase.from("invites").select("id, family_id, email, accepted_at, expires_at"),
    supabase
      .from("calendar_connections")
      .select("id, user_id, family_id, provider, status, last_synced_at, sync_error"),
    supabase.from("admin_account_flags").select("user_id, status"),
  ]);

  const flags = new Map((flagRows ?? []).map((row) => [row.user_id as string, row.status as AccountStatus]));
  const members = memberRows ?? [];
  const familiesRaw = familyRows ?? [];
  const connections = connectionRows ?? [];
  const children = childRows ?? [];
  const invites = (inviteRows ?? []).filter((row) => !row.accepted_at);

  const users: AdminUserRow[] = (profileRows ?? []).map((row) => {
    const member = members.find((item) => item.user_id === row.id);
    const family = member ? familiesRaw.find((item) => item.id === member.family_id) : undefined;
    const userConnections = connections.filter((item) => item.user_id === row.id && item.status === "connected");
    const error = connections.find((item) => item.user_id === row.id && item.sync_error);
    return {
      id: row.id as string,
      email: row.email as string,
      firstName: (row.first_name as string) ?? "",
      lastName: (row.last_name as string) ?? "",
      createdAt: row.created_at as string,
      lastActivityAt: (row.updated_at as string) ?? null,
      onboardingCompleted: Boolean(row.onboarding_completed_at),
      accountStatus: flags.get(row.id as string) ?? "active",
      familyId: (family?.id as string | undefined) ?? null,
      familyName: (family?.name as string | undefined) ?? null,
      familyRole: (member?.role as string | undefined) ?? null,
      googleConnected: userConnections.some((item) => item.provider === "google"),
      microsoftConnected: userConnections.some((item) => item.provider === "microsoft"),
      appleIcs: userConnections.some((item) => item.provider === "apple_ics" || item.provider === "apple"),
      lastSyncError: (error?.sync_error as string | undefined) ?? null,
      lastSyncedAt: (userConnections.map((item) => item.last_synced_at).filter(Boolean).sort().at(-1) as string | undefined) ?? null,
      hasPendingInvite: invites.some((invite) => (invite.email as string)?.toLowerCase() === (row.email as string).toLowerCase()),
      notificationChannels: null,
    };
  });

  const families: AdminFamilyRow[] = familiesRaw.map((family) => {
    const familyMembers = members.filter((item) => item.family_id === family.id && item.status === "active");
    const familyConnections = connections.filter((item) => item.family_id === family.id && item.status === "connected");
    const owner = users.find((item) => item.id === family.owner_id);
    const onboarded = familyMembers.filter((member) => {
      const profile = users.find((item) => item.id === member.user_id);
      return profile?.onboardingCompleted;
    }).length;
    return {
      id: family.id as string,
      name: family.name as string,
      ownerEmail: owner?.email ?? null,
      memberCount: familyMembers.length,
      childCount: children.filter((item) => item.family_id === family.id).length,
      createdAt: family.created_at as string,
      lastActivityAt: (family.updated_at as string) ?? null,
      onboardingCompletedCount: onboarded,
      googleCount: familyConnections.filter((item) => item.provider === "google").length,
      microsoftCount: familyConnections.filter((item) => item.provider === "microsoft").length,
      appleCount: familyConnections.filter((item) => item.provider === "apple_ics" || item.provider === "apple").length,
      plan: family.plan as string,
      subscriptionStatus: family.subscription_status as string,
    };
  });

  const pendingInviteIds = invites.map((item) => item.id as string);
  return {
    users,
    families,
    stats: statsFrom(users, families, pendingInviteIds.length),
    pendingInviteIds,
  };
}

export async function loadPendingInvites(): Promise<
  Array<{ id: string; familyId: string; email: string; expiresAt: string }>
> {
  if (!isSupabaseConfigured()) {
    return listMemoryAdminFamilies().flatMap((snap) =>
      snap.invites
        .filter((invite) => !invite.acceptedAt)
        .map((invite) => ({
          id: invite.id,
          familyId: invite.familyId,
          email: invite.email,
          expiresAt: invite.expiresAt,
        })),
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("invites").select("id, family_id, email, expires_at, accepted_at");
  return (data ?? [])
    .filter((row) => !row.accepted_at)
    .map((row) => ({
      id: row.id as string,
      familyId: row.family_id as string,
      email: row.email as string,
      expiresAt: row.expires_at as string,
    }));
}
