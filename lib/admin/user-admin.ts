import { randomUUID } from "crypto";
import { getRepository } from "@/lib/data";
import { addAudit } from "@/lib/admin/memory";
import type { AdminActor } from "@/lib/admin/types";
import { hasServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MIN_PASSWORD = 8;

export function validateAdminUserPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return "Gebruik minstens 8 tekens.";
  if (password !== confirm) return "De wachtwoorden komen niet overeen.";
  return null;
}

export function validateAdminNewUser(input: {
  firstName: string;
  email: string;
  password: string;
  confirm: string;
}): string | null {
  if (!input.firstName || !input.email) return "Vul voornaam en e-mailadres in.";
  if (!input.email.includes("@")) return "Ongeldig e-mailadres.";
  return validateAdminUserPassword(input.password, input.confirm);
}

async function writeAudit(
  actor: AdminActor,
  input: { action: string; targetUserId?: string | null; reason?: string | null; metadata?: Record<string, unknown> },
) {
  const entry = {
    id: randomUUID(),
    adminUserId: actor.userId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    familyId: null,
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

export async function createAdminManagedUser(
  actor: AdminActor,
  input: { firstName: string; lastName: string; email: string; password: string },
): Promise<{ userId: string } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!isSupabaseConfigured()) {
    const { userId } = await getRepository().createLocalUser({ firstName, lastName, email });
    await writeAudit(actor, {
      action: "user.created",
      targetUserId: userId,
      metadata: { source: "demo", email },
    });
    return { userId };
  }

  if (!hasServiceRoleKey()) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Zonder die key kan beheer geen accounts aanmaken." };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error || !data.user) {
    const message = error?.message ?? "Aanmaken mislukt.";
    if (message.toLowerCase().includes("already") || message.toLowerCase().includes("registered")) {
      return { error: "Dit e-mailadres bestaat al." };
    }
    return { error: message };
  }

  await admin.from("profiles").update({ first_name: firstName, last_name: lastName, email }).eq("id", data.user.id);
  await writeAudit(actor, {
    action: "user.created",
    targetUserId: data.user.id,
    metadata: { email },
  });
  return { userId: data.user.id };
}

export async function setAdminManagedPassword(
  actor: AdminActor,
  input: { userId: string; password: string; reason: string },
): Promise<{ ok: true } | { error: string }> {
  if (!isSupabaseConfigured()) {
    await writeAudit(actor, {
      action: "user.password_set",
      targetUserId: input.userId,
      reason: input.reason,
      metadata: { source: "demo" },
    });
    return { ok: true };
  }

  if (!hasServiceRoleKey()) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Zonder die key kan beheer geen wachtwoord zetten." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(input.userId, { password: input.password });
  if (error) return { error: error.message };

  await writeAudit(actor, {
    action: "user.password_set",
    targetUserId: input.userId,
    reason: input.reason,
  });
  return { ok: true };
}
