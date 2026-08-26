import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { microsoftOAuthConfigured } from "@/lib/calendar/config";
import { createPkcePair, storeOAuthState } from "@/lib/calendar/oauth-state";
import { microsoftAuthorizeUrl } from "@/lib/calendar/providers/microsoft";

export async function GET() {
  const session = await requireSession();
  if (!microsoftOAuthConfigured()) {
    redirect("/instellingen?calendar=microsoft&error=not_configured");
  }

  const snapshot = await getRepository().getSnapshot(session.userId);
  if (!snapshot) redirect("/onboarding");

  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = await storeOAuthState({
    codeVerifier,
    userId: session.userId,
    familyId: snapshot.family.id,
    provider: "microsoft",
  });

  redirect(microsoftAuthorizeUrl(state, codeChallenge));
}
