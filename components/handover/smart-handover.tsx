"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Check } from "lucide-react";
import { handoverCheckInAction } from "@/lib/actions/messages";
import { markHandoverReadyAction } from "@/lib/actions/packing";
import { formatDayLong, toISODate } from "@/lib/dates";
import { addDays } from "date-fns";
import { assembleHandoverChecklist, handoverSummaryLine } from "@/lib/queries/handover";
import {
  handoverPackingSuggestions,
  handoverProgress,
  packingItemsForHandover,
} from "@/lib/queries/packing";
import { handoverReadyLabel } from "@/lib/packing/progress";
import { childNames, parentName } from "@/lib/queries/family-view";
import { hasChildCapability } from "@/lib/security/capabilities";
import type { FamilySnapshot, Handover } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ContextMessages } from "@/components/messages/context-messages";
import { PackingAddRow, PackingSuggestionToggle, PackingToggle } from "@/components/packing/packing-toggle";

export function SmartHandover({
  snapshot,
  handover,
  compact = false,
}: {
  snapshot: FamilySnapshot;
  handover: Handover;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const checklist = assembleHandoverChecklist(snapshot, handover);
  const packing = packingItemsForHandover(snapshot, handover);
  const suggestions = handoverPackingSuggestions(snapshot, handover);
  const progress = handoverProgress(snapshot, handover);
  const checkIn = snapshot.handoverCheckIns.find((item) => item.handoverId === handover.id);
  const canEdit = handover.childIds.some((childId) => hasChildCapability(snapshot, childId, "edit_tasks"));
  const today = toISODate(new Date());
  const tomorrow = toISODate(addDays(new Date(`${today}T12:00:00`), 1));
  const when = handover.date === today ? "Vandaag" : handover.date === tomorrow ? "Morgen" : formatDayLong(handover.date);
  const heading = `${when} naar ${parentName(snapshot, handover.toMemberId)}`;
  const ready = handover.readyStatus === "ready" || handover.readyStatus === "completed";
  const statusLine = ready
    ? handover.readyStatus === "completed"
      ? "Overdracht afgerond"
      : "Alles gereed ✓"
    : handoverReadyLabel(handover, progress.remaining);

  function checkInHere() {
    const formData = new FormData();
    formData.set("handoverId", handover.id);
    startTransition(async () => {
      try {
        await handoverCheckInAction(formData);
        toast.success("Check-in geregistreerd");
      } catch {
        toast.error("Check-in mislukt");
      }
    });
  }

  function markReady() {
    const formData = new FormData();
    formData.set("handoverId", handover.id);
    startTransition(async () => {
      try {
        await markHandoverReadyAction(formData);
        toast.success("Overdracht op gereed gezet");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
      }
    });
  }

  const packingByChild = handover.childIds.map((childId) => ({
    childId,
    name: snapshot.children.find((child) => child.id === childId)?.firstName ?? "Kind",
    items: packing.filter((item) => item.childId === childId),
    suggestions: suggestions.filter((item) => item.childId === childId),
  }));

  return (
    <section
      className={cn(
        "rounded-3xl border border-[color:var(--famli-important)]/25 bg-[color:var(--famli-important)]/8",
        compact ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      <div className="flex items-start gap-3">
        <ArrowLeftRight className="mt-0.5 size-5 shrink-0 text-[color:var(--famli-important)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
            Overdracht
          </p>
          <h2 className="text-lg font-semibold">{heading}</h2>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {childNames(snapshot, handover.childIds)}
          </p>
          {!compact ? (
            <p className="mt-1 text-sm">
              {handover.time}
              {handover.location ? ` · ophalen bij ${handover.location.toLowerCase()}` : ""}
            </p>
          ) : (
            <p className="text-sm text-[color:var(--famli-muted)]">{handoverSummaryLine(snapshot, handover)}</p>
          )}
          <p className="mt-2 text-sm font-medium">{statusLine}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {packingByChild.map((group) => (
          <div key={group.childId}>
            {packingByChild.length > 1 ? (
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
                {group.name}
              </p>
            ) : (
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">Mee</p>
            )}
            {group.items.length || group.suggestions.length ? (
              <ul className="mt-1">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <PackingToggle
                      itemId={item.id}
                      checked={item.checked}
                      label={item.label}
                      disabled={!canEdit}
                    />
                  </li>
                ))}
                {group.suggestions.map((item) => (
                  <li key={item.key}>
                    <PackingSuggestionToggle
                      childId={item.childId}
                      label={item.label}
                      context={item.context}
                      eventId={item.eventId}
                      handoverId={item.handoverId}
                      dueOn={item.dueOn}
                      disabled={!canEdit}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--famli-muted)]">Nog niets toegevoegd</p>
            )}
            {canEdit ? (
              <PackingAddRow
                childId={group.childId}
                context="handover"
                handoverId={handover.id}
                dueOn={handover.date}
              />
            ) : null}
          </div>
        ))}

        {checklist.belangrijk.length ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
              Nog regelen
            </p>
            <ul className="mt-2 space-y-1.5">
              {checklist.belangrijk.map((item) => (
                <li key={item.id} className="rounded-xl bg-[color:var(--famli-card)] px-3 py-2 text-sm">
                  <p className="font-medium">{item.label}</p>
                  {item.detail ? <p className="text-[color:var(--famli-muted)]">{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : packing.length && packing.every((item) => item.checked) ? (
          <p className="text-sm font-medium">Alles geregeld ✓</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {checkIn ? (
          <p className="text-sm text-[color:var(--famli-muted)]">
            {parentName(snapshot, checkIn.memberId)} is er ·{" "}
            {new Date(checkIn.checkedInAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={checkInHere}
            className="famli-btn famli-btn-secondary h-11 px-4 text-sm"
          >
            Ik ben er
          </button>
        )}
        <button
          type="button"
          disabled={pending || !canEdit || ready}
          onClick={markReady}
          className={cn("famli-btn h-11 px-4 text-sm", ready ? "famli-btn-secondary" : "famli-btn-primary")}
        >
          {ready ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Alles gereed
            </span>
          ) : (
            "Alles gereed"
          )}
        </button>
      </div>

      {!compact ? (
        <div className="mt-4 border-t border-[color:var(--famli-important)]/15 pt-4">
          <ContextMessages snapshot={snapshot} resourceType="handover" resourceId={handover.id} />
        </div>
      ) : null}
    </section>
  );
}
