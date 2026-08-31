export const CALENDAR_FEED_NOT_ACTIVATED_MESSAGE =
  "ICS-export is nog niet geactiveerd. Voer in Supabase SQL Editor migratie 0011_calendar_feed_export.sql uit.";

export class CalendarFeedNotActivatedError extends Error {
  constructor(message = CALENDAR_FEED_NOT_ACTIVATED_MESSAGE) {
    super(message);
    this.name = "CalendarFeedNotActivatedError";
  }
}

function feedErrorText(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    return [record.message, record.code, record.details, record.hint]
      .filter((value) => typeof value === "string")
      .join(" ");
  }
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

export function isMissingCalendarFeedTableError(error: unknown): boolean {
  const text = feedErrorText(error);
  if (/PGRST205/i.test(text)) return true;
  if (/42P01/i.test(text)) return true;
  if (/Could not find the table .*calendar_feed_tokens/i.test(text)) return true;
  if (/relation .*calendar_feed_tokens.* does not exist/i.test(text)) return true;
  if (
    /calendar_feed_tokens/i.test(text) &&
    /(schema cache|does not exist|not find|niet gevonden|unknown table|no such table)/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function isCalendarFeedNotActivatedError(error: unknown): boolean {
  if (error instanceof CalendarFeedNotActivatedError) return true;
  if (error instanceof Error && error.name === "CalendarFeedNotActivatedError") return true;
  return isMissingCalendarFeedTableError(error);
}

export function calendarFeedActionError(error: unknown, fallback = "Link maken mislukt"): string {
  if (isCalendarFeedNotActivatedError(error) || isMissingCalendarFeedTableError(error)) {
    return CALENDAR_FEED_NOT_ACTIVATED_MESSAGE;
  }
  const text = feedErrorText(error);
  if (/Minified React error|#441|Server Components render/i.test(text)) {
    return CALENDAR_FEED_NOT_ACTIVATED_MESSAGE;
  }
  if (/row-level security|42501|permission denied/i.test(text)) {
    return "Geen toegang om een agendalink te maken.";
  }
  if (error instanceof Error && error.message && error.message !== "Error") {
    return error.message;
  }
  return fallback;
}
