import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccountFlag } from "@/lib/admin/memory";
import { getRepository } from "@/lib/data";
import { IDS } from "@/lib/data/ids";
import { SESSION_COOKIE, type FamilySnapshot, type SessionPayload } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSession(): Promise<SessionPayload | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) return { userId: data.user.id, source: "supabase" };
    return null;
  }

  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSupabaseConfigured() && getAccountFlag(session.userId).status === "blocked") {
    redirect("/login?error=Dit%20account%20is%20geblokkeerd.");
  }
  return session;
}

export async function requireSnapshot(): Promise<FamilySnapshot> {
  const session = await requireSession();
  const snapshot = await getRepository().getSnapshot(session.userId);
  if (!snapshot) redirect("/onboarding");
  if (!snapshot.currentProfile.onboardingCompletedAt) redirect("/onboarding");
  return snapshot;
}

export async function getOptionalSnapshot(): Promise<FamilySnapshot | null> {
  const session = await getSession();
  if (!session) return null;
  return getRepository().getSnapshot(session.userId);
}

export const DEMO_USERS = [
  { userId: IDS.emmaUser, label: "Emma (mama)", description: "Family owner" },
  { userId: IDS.rogierUser, label: "Rogier (papa)", description: "Ouder" },
  { userId: IDS.sanneUser, label: "Sanne (partner)", description: "Partner van Rogier" },
] as const;
