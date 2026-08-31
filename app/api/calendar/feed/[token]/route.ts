import { getRepository } from "@/lib/data";
import {
  buildCalendarIcs,
  collectFamliExportEvents,
  normalizeFeedToken,
} from "@/lib/calendar/ics-export";

export const dynamic = "force-dynamic";

function icsHeaders(familyName: string): HeadersInit {
  const safeName = familyName.replace(/[^\w.-]+/g, "-") || "famli";
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="${safeName}.ics"`,
    "Cache-Control": "private, max-age=300",
  };
}

async function icsResponse(rawToken: string): Promise<Response> {
  const token = normalizeFeedToken(rawToken);
  if (token.length < 16) {
    return new Response("Not found", { status: 404 });
  }

  const resolved = await getRepository().getCalendarFeedByToken(token);
  if (!resolved) {
    return new Response("Not found", { status: 404 });
  }

  void getRepository()
    .touchCalendarFeedAccess(token)
    .catch(() => undefined);

  const events = collectFamliExportEvents(resolved.snapshot);
  const body = buildCalendarIcs(resolved.snapshot.family.name, events);
  return new Response(body, { headers: icsHeaders(resolved.snapshot.family.name) });
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return icsResponse(token);
}

export async function HEAD(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const response = await icsResponse(token);
  return new Response(null, { status: response.status, headers: response.headers });
}
