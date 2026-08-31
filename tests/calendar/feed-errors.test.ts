import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CALENDAR_FEED_NOT_ACTIVATED_MESSAGE,
  CalendarFeedNotActivatedError,
  calendarFeedActionError,
  isMissingCalendarFeedTableError,
} from "@/lib/calendar/feed-errors";

describe("calendar feed errors", () => {
  it("detects missing calendar_feed_tokens table", () => {
    assert.equal(
      isMissingCalendarFeedTableError({ code: "PGRST205", message: "Could not find the table public.calendar_feed_tokens in the schema cache" }),
      true,
    );
    assert.equal(
      isMissingCalendarFeedTableError({ code: "42P01", message: 'relation "calendar_feed_tokens" does not exist' }),
      true,
    );
    assert.equal(isMissingCalendarFeedTableError({ message: "unrelated" }), false);
  });

  it("maps production React #441 to the migration hint", () => {
    const hidden = new Error(
      "Minified React error #441; visit https://react.dev/errors/441 for the full message",
    );
    assert.equal(calendarFeedActionError(hidden), CALENDAR_FEED_NOT_ACTIVATED_MESSAGE);
    assert.equal(
      calendarFeedActionError(new CalendarFeedNotActivatedError()),
      CALENDAR_FEED_NOT_ACTIVATED_MESSAGE,
    );
  });
});
