import { redirect } from "next/navigation";
import { getOptionalSnapshot, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await requireSession();
  const snapshot = await getOptionalSnapshot();
  if (snapshot?.currentProfile.onboardingCompletedAt) redirect("/vandaag");
  const profile = snapshot?.currentProfile ?? (await getRepository().getProfile(session.userId));

  return (
    <OnboardingWizard
      userId={session.userId}
      firstName={profile?.firstName ?? ""}
      lastName={profile?.lastName ?? ""}
      email={profile?.email ?? ""}
      familyName={snapshot?.family.name ?? ""}
      children={snapshot?.children.map((child) => child.firstName) ?? []}
      invited={snapshot?.invites.map((invite) => invite.email) ?? []}
      hasSchedule={Boolean(snapshot?.schedule)}
    />
  );
}
