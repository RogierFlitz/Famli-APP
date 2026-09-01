"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { requireSession } from "@/lib/auth/session";
import { toISODate } from "@/lib/dates";
import type { CustodyPattern } from "@/lib/domain/types";
import { existingChildRecord } from "@/lib/family/unique";
import { canManageMembers, isParentMember } from "@/lib/members/permissions";

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
    if (!isParentMember(snapshot.currentMember) && !canManageMembers(snapshot)) {
      return { ok: false, error: "Je mag geen kinderen toevoegen." };
    }
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? snapshot.currentProfile.lastName);
    const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
    if (!firstName || !dateOfBirth) return { ok: false, error: "Voornaam en geboortedatum zijn verplicht." };
    const existing = existingChildRecord(snapshot.children, firstName, dateOfBirth);
    if (!existing) {
      await repo.addChild({
        familyId: snapshot.family.id,
        createdBy: session.userId,
        firstName,
        lastName,
        dateOfBirth,
      });
    }
    revalidatePath("/onboarding");
    revalidatePath("/kinderen");
    if (String(formData.get("from") ?? "") === "kinderen") redirect("/kinderen");
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

function parseMemberIdArray(raw: FormDataEntryValue | null): string[] | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return undefined;
  }
}

export async function saveScheduleAction(formData: FormData): Promise<OnboardingActionResult> {
  try {
    const session = await requireSession();
    const repo = getRepository();
    const snapshot = await repo.getSnapshot(session.userId);
    if (!snapshot) return { ok: false, error: "Maak eerst je gezin aan." };
    const parents = snapshot.members.filter((member) => member.role !== "viewer");
    const parentAMemberId = parents[0]?.id ?? snapshot.currentMember.id;
    const parentBMemberId = parents[1]?.id ?? parentAMemberId;
    const patternType = String(formData.get("patternType") ?? "two_two_three") as CustodyPattern;
    const dayCycle = parseMemberIdArray(formData.get("dayCycle"));
    const weekdayMemberIds = parseMemberIdArray(formData.get("weekdayMemberIds"));

    if (patternType === "custom" && (!dayCycle || dayCycle.length < 1)) {
      return { ok: false, error: "Stel minimaal één dag in voor het aangepaste schema." };
    }
    if (patternType === "fixed_weekdays" && weekdayMemberIds?.length !== 7) {
      return { ok: false, error: "Wijs alle weekdagen toe aan een ouder." };
    }

    const allowedParentIds = new Set([parentAMemberId, parentBMemberId]);
    if (
      patternType === "custom" &&
      dayCycle?.some((memberId) => !allowedParentIds.has(memberId))
    ) {
      return { ok: false, error: "Elke dag moet aan een van de ouders worden toegewezen." };
    }
    if (
      patternType === "fixed_weekdays" &&
      weekdayMemberIds?.some((memberId) => !allowedParentIds.has(memberId))
    ) {
      return { ok: false, error: "Elke weekdag moet aan een van de ouders worden toegewezen." };
    }

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
        parentAMemberId,
        parentBMemberId,
        ...(patternType === "custom" && dayCycle ? { dayCycle } : {}),
        ...(patternType === "fixed_weekdays" && weekdayMemberIds
          ? { weekdayMemberIds }
          : {}),
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
