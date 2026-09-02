"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { assignEventTransportAction } from "@/lib/actions/day-brief";
import { createPackingItemAction } from "@/lib/actions/packing";
import type { DaySignal } from "@/lib/context/family-day";
import { cn } from "@/lib/utils";

export function DaySignals({
  alerts,
  parents,
  canEditCalendar,
  canEditPacking,
  canEditCustody,
}: {
  alerts: DaySignal[];
  parents: Array<{ id: string; label: string }>;
  canEditCalendar: boolean;
  canEditPacking: boolean;
  canEditCustody: boolean;
}) {
  if (!alerts.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="famli-section-title">Let even op</h2>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={cn(
              "rounded-2xl px-4 py-3",
              alert.priority === "important"
                ? "bg-[color:var(--famli-danger)]/8"
                : alert.priority === "attention"
                  ? "bg-[color:var(--famli-warning)]/12"
                  : "bg-[color:var(--famli-info)]/10",
            )}
          >
            <p className="text-[0.95rem] leading-snug text-[color:var(--famli-ink)]">{alert.title}</p>
            {alert.body ? <p className="mt-1 text-sm text-[color:var(--famli-muted)]">{alert.body}</p> : null}
            <SignalActions
              alert={alert}
              parents={parents}
              canEditCalendar={canEditCalendar}
              canEditPacking={canEditPacking}
              canEditCustody={canEditCustody}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignalActions({
  alert,
  parents,
  canEditCalendar,
  canEditPacking,
  canEditCustody,
}: {
  alert: DaySignal;
  parents: Array<{ id: string; label: string }>;
  canEditCalendar: boolean;
  canEditPacking: boolean;
  canEditCustody: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const action = alert.action;

  if (action?.kind === "assign_transport" && canEditCalendar) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {parents.map((parent) => (
          <button
            key={parent.id}
            type="button"
            disabled={pending}
            className="famli-btn famli-btn-secondary min-h-11 px-3"
            onClick={() => {
              const formData = new FormData();
              formData.set("eventId", action.eventId);
              formData.set("role", action.role);
              formData.set("memberId", parent.id);
              startTransition(async () => {
                try {
                  await assignEventTransportAction(formData);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
                }
              });
            }}
          >
            {parent.label}
          </button>
        ))}
        {alert.href ? (
          <Link href={alert.href} className="famli-btn famli-btn-secondary min-h-11 px-3">
            Iemand anders
          </Link>
        ) : null}
      </div>
    );
  }

  if (action?.kind === "add_packing" && canEditPacking) {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled={pending}
          className="famli-btn famli-btn-secondary min-h-11 px-3"
          onClick={() => {
            const formData = new FormData();
            formData.set("childId", action.childId);
            formData.set("label", action.label);
            formData.set("context", action.context);
            if (action.eventId) formData.set("eventId", action.eventId);
            if (action.handoverId) formData.set("handoverId", action.handoverId);
            formData.set("dueOn", action.dueOn);
            startTransition(async () => {
              try {
                await createPackingItemAction(formData);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Toevoegen mislukt");
              }
            });
          }}
        >
          + Op meeneemlijst
        </button>
      </div>
    );
  }

  if (action?.kind === "set_schedule" && canEditCustody) {
    return (
      <div className="mt-3">
        <Link href="/jaaroverzicht" className="famli-btn famli-btn-secondary min-h-11 px-3">
          Schema instellen
        </Link>
      </div>
    );
  }

  if (alert.href) {
    return (
      <div className="mt-3">
        <Link href={alert.href} className="text-sm font-medium text-[color:var(--famli-brand)]">
          Bekijken →
        </Link>
      </div>
    );
  }
  return null;
}
