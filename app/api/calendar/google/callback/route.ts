import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { consumeOAuthState } from "@/lib/calendar/oauth-state";
import { exchangeGoogleCode, listGoogleCalendars } from "@/lib/calendar/providers/google";
import { saveOAuthConnection, syncCalendarConnection } from "@/lib/calendar/sync";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  if (error) redirect(`/instellingen?calendar=google&error=${encodeURIComponent(error)}`);
  if (!code || !state) redirect("/instellingen?calendar=google&error=missing_code");

  const payload = await consumeOAuthState(state);
  if (!payload || payload.provider !== "google") {
    redirect("/instellingen?calendar=google&error=invalid_state");
  }

  try {
    const tokens = await exchangeGoogleCode(code, payload.codeVerifier);
    let selectedCalendars: Array<{ id: string; name: string; primary?: boolean }> = [];
    try {
      selectedCalendars = await listGoogleCalendars(tokens.accessToken);
      selectedCalendars = selectedCalendars.filter((item) => item.primary).slice(0, 1);
      if (!selectedCalendars.length) selectedCalendars = (await listGoogleCalendars(tokens.accessToken)).slice(0, 1);
    } catch {
      selectedCalendars = [];
    }

    const connectionId = await saveOAuthConnection({
      userId: payload.userId,
      familyId: payload.familyId,
      provider: "google",
      tokens,
      selectedCalendars,
    });

    try {
      await syncCalendarConnection(connectionId);
    } catch {
      // Connection saved; sync can be retried manually
    }

    redirect("/instellingen?calendar=google&connected=1");
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "callback_failed";
    redirect(`/instellingen?calendar=google&error=${encodeURIComponent(message)}`);
  }
}
