import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { googleOAuthConfigured } from "@/lib/calendar/config";
import { createPkcePair, storeOAuthState } from "@/lib/calendar/oauth-state";
import { googleAuthorizeUrl } from "@/lib/calendar/providers/google";

export async function GET() {
  const session = await requireSession();
  if (!googleOAuthConfigured()) {
    redirect("/instellingen?calendar=google&error=not_configured");
  }

  const snapshot = await getRepository().getSnapshot(session.userId);
  if (!snapshot) redirect("/onboarding");

  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = await storeOAuthState({
    codeVerifier,
    userId: session.userId,
    familyId: snapshot.family.id,
    provider: "google",
  });

  redirect(googleAuthorizeUrl(state, codeChallenge));
}
