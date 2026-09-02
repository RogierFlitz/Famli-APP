"use client";

import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toISODate } from "@/lib/dates";
import { childNames } from "@/lib/queries/family-view";
import { handoverIsSoon } from "@/lib/queries/handover";
import type { CalendarEvent, FamilySnapshot, Handover } from "@/lib/domain/types";
import { HandoverEvent } from "@/components/calendar/handover-event";
import { SmartHandover } from "@/components/handover/smart-handover";
import { EmptyState } from "@/components/empty-state";

export function WisselsView({
  snapshot,
  onOpen,
}: {
  snapshot: FamilySnapshot;
  onOpen: (event: CalendarEvent) => void;
}) {
  const today = toISODate(new Date());
  const handovers = snapshot.handovers
    .filter((item) => !item.cancelledAt && item.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  if (!handovers.length) {
    return (
      <EmptyState
        title="Nog geen wissels gepland"
        body="Wisselmomenten verschijnen hier zodra het verblijfsschema loopt."
      />
    );
  }

  const grouped = groupByDate(handovers);

  return (
    <div className="space-y-8">
      {grouped.map(([date, items]) => (
        <section key={date}>
          <h2 className="mb-3 text-sm font-medium capitalize text-[color:var(--famli-muted)]">
            {format(new Date(`${date}T12:00:00`), "EEEE d MMMM", { locale: nl })}
          </h2>
          <div className="space-y-2 border-l-2 border-[color:var(--famli-border)] pl-4">
            {items.map((handover) => {
              const linked = snapshot.events.find((event) => event.id === handover.eventId);
              const expanded = handoverIsSoon(handover, today);
              return (
                <div key={handover.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-3 size-2 rounded-full bg-[color:var(--famli-important)]" />
                  {expanded ? (
                    <SmartHandover snapshot={snapshot} handover={handover} />
                  ) : (
                    <>
                      <HandoverEvent
                        snapshot={snapshot}
                        handover={handover}
                        onSelect={() => linked && onOpen(linked)}
                      />
                      <p className="mt-1 pl-1 text-xs text-[color:var(--famli-muted)]">
                        {childNames(snapshot, handover.childIds)}
                        {handover.location ? ` · ${handover.location}` : ""}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupByDate(handovers: Handover[]): [string, Handover[]][] {
  const map = new Map<string, Handover[]>();
  for (const handover of handovers) {
    const list = map.get(handover.date) ?? [];
    list.push(handover);
    map.set(handover.date, list);
  }
  return [...map.entries()];
}
