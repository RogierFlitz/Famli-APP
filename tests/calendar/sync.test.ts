import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseIcsEvents } from "@/lib/calendar/providers/apple-ics";
import type { ProviderFetchedEvent } from "@/lib/calendar/types";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-100
SUMMARY:Doktersafspraak
LOCATION:Utrecht
DTSTART:20260826T140000Z
DTEND:20260826T150000Z
END:VEVENT
BEGIN:VEVENT
UID:evt-200
SUMMARY:Oud event
DTSTART:20260101T100000Z
DTEND:20260101T110000Z
END:VEVENT
END:VCALENDAR`;

describe("calendar sync dedup helpers", () => {
  it("parses ICS events with stable provider ids", () => {
    const events = parseIcsEvents(SAMPLE_ICS);
    assert.equal(events.length, 2);
    assert.equal(events[0]?.providerEventId, "evt-100");
    assert.equal(events[0]?.title, "Doktersafspraak");
    assert.equal(events[0]?.location, "Utrecht");
  });

  it("simulates upsert dedup by provider_event_id", () => {
    const incoming: ProviderFetchedEvent[] = [
      {
        providerEventId: "a",
        title: "A",
        location: null,
        startsAt: "2026-08-26T10:00:00.000Z",
        endsAt: "2026-08-26T11:00:00.000Z",
        allDay: false,
      },
      {
        providerEventId: "b",
        title: "B",
        location: null,
        startsAt: "2026-08-26T12:00:00.000Z",
        endsAt: "2026-08-26T13:00:00.000Z",
        allDay: false,
      },
    ];

    const existing = new Map([
      ["a", { title: "Old A" }],
      ["c", { title: "Removed" }],
    ]);

    const providerIds = new Set(incoming.map((event) => event.providerEventId));
    const deleted = [...existing.keys()].filter((id) => !providerIds.has(id));
    assert.deepEqual(deleted, ["c"]);
    for (const id of deleted) existing.delete(id);

    for (const event of incoming) {
      existing.set(event.providerEventId, { title: event.title });
    }
    assert.equal(existing.get("a")?.title, "A");
    assert.equal(existing.get("b")?.title, "B");
    assert.equal(existing.has("c"), false);
  });
});
