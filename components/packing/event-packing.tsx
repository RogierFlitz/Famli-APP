"use client";

import { packingItemsForEvent } from "@/lib/queries/packing";
import { inferPackingContext } from "@/lib/packing/templates";
import { packingProgressLabel } from "@/lib/packing/progress";
import { hasChildCapability } from "@/lib/security/capabilities";
import { PackingAddRow, PackingSuggestionToggle, PackingToggle } from "@/components/packing/packing-toggle";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";

export function EventPacking({
  snapshot,
  event,
}: {
  snapshot: FamilySnapshot;
  event: CalendarEvent;
}) {
  const items = packingItemsForEvent(snapshot, event.id);
  const covered = new Set(items.map((item) => `${item.childId}|${item.label.trim().toLowerCase()}`));
  const childIds = event.childIds.length ? event.childIds : snapshot.children.map((child) => child.id);
  const canEdit = childIds.some((childId) => hasChildCapability(snapshot, childId, "edit_tasks"));
  const dueOn = event.startsAt.slice(0, 10);
  const context = inferPackingContext(event.title, event.category);
  const suggestions = (event.packingList ?? []).flatMap((label) =>
    childIds
      .filter((childId) => !covered.has(`${childId}|${label.trim().toLowerCase()}`))
      .map((childId) => ({ childId, label })),
  );
  if (!items.length && !suggestions.length && !canEdit) return null;

  return (
    <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">Wat moet mee?</p>
      <p className="mt-1 text-sm font-medium">{packingProgressLabel(items.filter((item) => item.checked).length, items.length)}</p>
      <ul className="mt-1">
        {items.map((item) => (
          <li key={item.id}>
            <PackingToggle itemId={item.id} checked={item.checked} label={item.label} disabled={!canEdit} />
          </li>
        ))}
        {suggestions.map((row) => (
          <li key={`${row.childId}-${row.label}`}>
            <PackingSuggestionToggle
              childId={row.childId}
              label={row.label}
              context={context}
              eventId={event.id}
              handoverId={event.handoverId}
              dueOn={dueOn}
              disabled={!canEdit}
            />
          </li>
        ))}
      </ul>
      {canEdit && childIds[0] ? (
        <PackingAddRow childId={childIds[0]} context={context} eventId={event.id} dueOn={dueOn} />
      ) : null}
    </div>
  );
}
