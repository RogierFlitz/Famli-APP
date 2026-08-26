"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Check } from "lucide-react";
import { handoverCheckInAction } from "@/lib/actions/messages";
import { formatDayLong } from "@/lib/dates";
import { assembleHandoverChecklist, handoverSummaryLine } from "@/lib/queries/handover";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot, Handover } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMessages } from "@/components/messages/context-messages";

export function SmartHandover({
  snapshot,
  handover,
  compact = false,
}: {
  snapshot: FamilySnapshot;
  handover: Handover;
  compact?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const checklist = assembleHandoverChecklist(snapshot, handover);
  const checkIn = snapshot.handoverCheckIns.find((item) => item.handoverId === handover.id);

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
          <h2 className="text-lg font-semibold">Slimme overdracht</h2>
          <p className="text-sm text-[color:var(--famli-muted)]">{handoverSummaryLine(snapshot, handover)}</p>
          {!compact ? (
            <p className="mt-1 text-sm">
              {formatDayLong(handover.date)} · {handover.time}
              {handover.location ? ` · ${handover.location}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {checklist.meenemen.length ? <ChecklistSection title="Meenemen" items={checklist.meenemen} /> : null}
        {checklist.belangrijk.length ? <ChecklistSection title="Belangrijk" items={checklist.belangrijk} /> : null}
        {checklist.ophalen.length ? <ChecklistSection title="Ophalen" items={checklist.ophalen} /> : null}
        {checklist.childUpdates.length ? (
          <ChecklistSection title="Updates" items={checklist.childUpdates} />
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
            className="famli-btn famli-btn-secondary h-10 px-4 text-sm"
          >
            Ik ben er
          </button>
        )}
        <button
          type="button"
          onClick={() => setReady((value) => !value)}
          className={cn(
            "famli-btn h-10 px-4 text-sm",
            ready ? "famli-btn-secondary" : "famli-btn-primary",
          )}
        >
          {ready ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Overdracht gereed
            </span>
          ) : (
            "Overdracht gereed"
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

function ChecklistSection({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; detail?: string }[];
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-[color:var(--famli-card)] px-3 py-2 text-sm">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={Boolean(checked[item.id])}
                onCheckedChange={(value) =>
                  setChecked((current) => ({ ...current, [item.id]: value === true }))
                }
                aria-label={item.label}
                className="mt-0.5 size-4 shrink-0 rounded-md"
              />
              <span className="min-w-0">
                <p className={cn("font-medium", checked[item.id] ? "line-through opacity-70" : "")}>{item.label}</p>
                {item.detail ? <p className="text-[color:var(--famli-muted)]">{item.detail}</p> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
