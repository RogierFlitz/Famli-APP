"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertAdminCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/types";
import {
  addAudit,
  addSupportNote,
  demoAdminByEmail,
  getAccountFlag,
  setAccountFlag,
} from "@/lib/admin/memory";
import { extendMemoryAdminInvite, patchMemoryAdminProfile } from "@/lib/data/memory-store";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function revalidateAdmin(): void {
  revalidatePath("/admin", "layout");
}

async function writeAudit(input: {
  action: string;
  targetUserId?: string | null;
  familyId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const actor = await requireAdmin();
  const entry = {
    id: randomUUID(),
    adminUserId: actor.userId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    familyId: input.familyId ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured()) {
    addAudit(entry);
    return;
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from("admin_audit_log").insert({
    admin_user_id: entry.adminUserId,
    action: entry.action,
    target_user_id: entry.targetUserId,
    family_id: entry.familyId,
    reason: entry.reason,
    metadata: entry.metadata,
  });
}

export async function startDemoAdmin(email: string) {
  if (isSupabaseConfigured()) {
    redirect("/admin?error=Demo-admin%20is%20uitgeschakeld%20met%20Supabase.");
  }
  const demo = demoAdminByEmail(email);
  if (!demo) redirect("/admin?error=Onbekende%20admin.");
  assertRateLimit("login", `admin:${email}`);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, JSON.stringify({ userId: demo.userId }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  addAudit({
    id: randomUUID(),
    adminUserId: demo.userId,
    action: "admin.login",
    targetUserId: null,
    familyId: null,
    reason: null,
    metadata: { source: "demo" },
    createdAt: new Date().toISOString(),
  });
  redirect("/admin/dashboard");
}

export async function startDemoSuperAdmin() {
  await startDemoAdmin("super@famli.internal");
}

export async function startDemoSupportAdmin() {
  await startDemoAdmin("support@famli.internal");
}

export async function startDemoReadonlyAdmin() {
  await startDemoAdmin("readonly@famli.internal");
}

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  assertRateLimit("login", `admin:${email}`);

  if (!isSupabaseConfigured()) {
    const demo = demoAdminByEmail(email);
    if (!demo) redirect("/admin?error=Geen%20adminaccount%20voor%20dit%20e-mailadres.");
    await startDemoAdmin(email);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin?error=Inloggen%20mislukt.");
  const { data: staff } = await supabase.from("admin_staff").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!staff) {
    await supabase.auth.signOut();
    redirect("/admin?error=Dit%20account%20heeft%20geen%20adminrechten.");
  }
  await supabase.from("admin_audit_log").insert({
    admin_user_id: data.user.id,
    action: "admin.login",
    metadata: { source: "supabase" },
  });
  redirect("/admin/dashboard");
}

export async function signOutAdmin() {
  if (isSupabaseConfigured()) {
    const actor = await requireAdmin().catch(() => null);
    if (actor) {
      const supabase = await createSupabaseServerClient();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: actor.userId,
        action: "admin.logout",
        metadata: {},
      });
      await supabase.auth.signOut();
    }
  }
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin");
}

export async function addAdminSupportNote(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "add_support_note");
  assertRateLimit("sensitive", actor.userId);
  const body = String(formData.get("body") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim() || null;
  const familyId = String(formData.get("familyId") ?? "").trim() || null;
  if (!body) throw new Error("Notitie mag niet leeg zijn.");
  const note = {
    id: randomUUID(),
    targetUserId,
    familyId,
    authorAdminId: actor.userId,
    body,
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseConfigured()) {
    addSupportNote(note);
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("admin_support_notes").insert({
      target_user_id: targetUserId,
      family_id: familyId,
      author_admin_id: actor.userId,
      body,
    });
    if (error) throw new Error(error.message);
  }
  await writeAudit({ action: "support.note_added", targetUserId, familyId, metadata: { length: body.length } });
  revalidateAdmin();
}

export async function blockUserAccount(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "block_account");
  assertRateLimit("sensitive", actor.userId);
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reden is verplicht.");
  const now = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    setAccountFlag(userId, {
      status: "blocked",
      blockedAt: now,
      blockedReason: reason,
      blockedBy: actor.userId,
    });
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("admin_account_flags").upsert({
      user_id: userId,
      status: "blocked",
      blocked_at: now,
      blocked_reason: reason,
      blocked_by: actor.userId,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  }
  await writeAudit({ action: "account.blocked", targetUserId: userId, reason });
  revalidateAdmin();
}

export async function unblockUserAccount(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "block_account");
  assertRateLimit("sensitive", actor.userId);
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reden is verplicht.");
  const now = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    setAccountFlag(userId, {
      status: "active",
      blockedAt: null,
      blockedReason: null,
      blockedBy: null,
    });
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("admin_account_flags").upsert({
      user_id: userId,
      status: "active",
      blocked_at: null,
      blocked_reason: reason,
      blocked_by: actor.userId,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  }
  await writeAudit({ action: "account.unblocked", targetUserId: userId, reason });
  revalidateAdmin();
}

export async function resetOnboarding(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "reset_onboarding");
  assertRateLimit("sensitive", actor.userId);
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reden is verplicht.");
  if (!isSupabaseConfigured()) {
    patchMemoryAdminProfile(userId, { onboardingCompletedAt: null });
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_reset_onboarding", { target: userId });
    if (error) throw new Error(error.message);
  }
  await writeAudit({ action: "onboarding.reset", targetUserId: userId, reason });
  revalidateAdmin();
}

export async function resendInvite(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "resend_invite");
  assertRateLimit("invite", actor.userId);
  const inviteId = String(formData.get("inviteId") ?? "");
  const familyId = String(formData.get("familyId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reden is verplicht.");
  if (!isSupabaseConfigured()) {
    extendMemoryAdminInvite(familyId, inviteId);
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_extend_invite", { target: inviteId });
    if (error) throw new Error(error.message);
  }
  await writeAudit({ action: "invite.resent", familyId, reason, metadata: { inviteId } });
  revalidateAdmin();
}

export async function retryCalendarSync(formData: FormData) {
  const actor = await requireAdmin();
  assertAdminCapability(actor.role, "retry_sync");
  assertRateLimit("sensitive", actor.userId);
  const userId = String(formData.get("userId") ?? "");
  const familyId = String(formData.get("familyId") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reden is verplicht.");
  await writeAudit({
    action: "calendar.sync_retry_requested",
    targetUserId: userId,
    familyId,
    reason,
    metadata: { available: false },
  });
  revalidateAdmin();
}

export { getAccountFlag };
