import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { consumeOAuthState } from "@/lib/calendar/oauth-state";
import { exchangeMicrosoftCode } from "@/lib/calendar/providers/microsoft";
import { saveOAuthConnection, syncCalendarConnection } from "@/lib/calendar/sync";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  if (error) redirect(`/instellingen?calendar=microsoft&error=${encodeURIComponent(error)}`);
  if (!code || !state) redirect("/instellingen?calendar=microsoft&error=missing_code");

  const payload = await consumeOAuthState(state);
  if (!payload || payload.provider !== "microsoft") {
    redirect("/instellingen?calendar=microsoft&error=invalid_state");
  }

  try {
    const tokens = await exchangeMicrosoftCode(code, payload.codeVerifier);
    const connectionId = await saveOAuthConnection({
      userId: payload.userId,
      familyId: payload.familyId,
      provider: "microsoft",
      tokens,
    });

    try {
      await syncCalendarConnection(connectionId);
    } catch {
      // manual retry available
    }

    redirect("/instellingen?calendar=microsoft&connected=1");
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "callback_failed";
    redirect(`/instellingen?calendar=microsoft&error=${encodeURIComponent(message)}`);
  }
}
