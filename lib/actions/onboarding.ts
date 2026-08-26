"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { requireSession } from "@/lib/auth/session";
import { toISODate } from "@/lib/dates";
import type { CustodyPattern } from "@/lib/domain/types";

export type OnboardingActionResult = { ok: true } | { ok: false; error: string };

function actionError(error: unknown): OnboardingActionResult {
  if (error instanceof Error) return { ok: false, error: error.message };
  if (typeof error === "object" && error !== null && "message" in error) {
    return { ok: false, error: String((error as { message: unknown }).message) };
  }
  return { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };
}

export async function createFamilyAction(formData: FormData): Promise<OnboardingActionResult> {
  try {
    const session = await requireSession();
    const familyName = String(formData.get("familyName") ?? "").trim();
    const parentLabel = String(formData.get("parentLabel") ?? "Mama").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    await getRepository().createFamily({
      userId: session.userId,
      familyName: familyName || `Gezin ${lastName || firstName}`,
      parentLabel,
      firstName,
      lastName,
      email,
    });
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function addChildAction(formData: FormData): Promise<OnboardingActionResult> {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const snapshot = await repo.getSnapshot(session.userId);
    if (!snapshot) return { ok: false, error: "Maak eerst je gezin aan." };
    await repo.addChild({
      familyId: snapshot.family.id,
      createdBy: session.userId,
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? snapshot.currentProfile.lastName),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    });
    revalidatePath("/onboarding");
    revalidatePath("/kinderen");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function inviteParentAction(formData: FormData): Promise<OnboardingActionResult> {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const snapshot = await repo.getSnapshot(session.userId);
    if (!snapshot) return { ok: false, error: "Maak eerst je gezin aan." };
    await repo.inviteParent({
      familyId: snapshot.family.id,
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      parentLabel: String(formData.get("parentLabel") ?? "Papa").trim(),
    });
    revalidatePath("/onboarding");
    revalidatePath("/instellingen");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveScheduleAction(formData: FormData): Promise<OnboardingActionResult> {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const snapshot = await repo.getSnapshot(session.userId);
    if (!snapshot) return { ok: false, error: "Maak eerst je gezin aan." };
    const parents = snapshot.members.filter((member) => member.role !== "viewer");
    const patternType = String(formData.get("patternType") ?? "two_two_three") as CustodyPattern;
    await repo.saveSchedule({
      familyId: snapshot.family.id,
      createdBy: session.userId,
      name:
        patternType === "week_on_week_off"
          ? "Week-op-week-af"
          : patternType === "two_two_three"
            ? "2-2-3 schema"
            : patternType === "fixed_weekdays"
              ? "Vaste weekdagen"
              : "Aangepast schema",
      patternType,
      startsOn: String(formData.get("startsOn") ?? toISODate(new Date())),
      config: {
        parentAMemberId: parents[0]?.id ?? snapshot.currentMember.id,
        parentBMemberId: parents[1]?.id ?? snapshot.currentMember.id,
        handoverTime: "17:00",
        handoverLocation: "School",
      },
    });
    revalidatePath("/onboarding");
    revalidatePath("/agenda");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function completeOnboardingAction() {
  const session = await requireSession();
  await getRepository().completeOnboarding(session.userId);
  redirect("/vandaag");
}
