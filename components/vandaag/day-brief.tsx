import Link from "next/link";
import { DayToggle } from "@/components/vandaag/day-toggle";
import { DaySignals } from "@/components/vandaag/day-signals";
import { PackingSuggestionToggle, PackingToggle } from "@/components/packing/packing-toggle";
import type { FamilyDayContext } from "@/lib/context/family-day";
import type { FamilySnapshot } from "@/lib/domain/types";
import { parentName } from "@/lib/queries/family-view";
import { hasCapability, hasChildCapability } from "@/lib/security/capabilities";

export function DayBrief({
  snapshot,
  ctx,
}: {
  snapshot: FamilySnapshot;
  ctx: FamilyDayContext;
}) {
  const canEditCalendar = hasCapability(snapshot, "edit_calendar");
  const canEditCustody = hasCapability(snapshot, "edit_custody");
  const canEditPacking = snapshot.children.some((child) => hasChildCapability(snapshot, child.id, "edit_tasks"));
  const parents = snapshot.members
    .filter((member) => member.status === "active" && member.relationType === "ouder")
    .map((member) => ({ id: member.id, label: parentName(snapshot, member.id) }));
  const openPacking = ctx.packing.filter((item) => !item.checked);
  const checkedPacking = ctx.packing.filter((item) => item.checked);
  const active = ctx.kind === "today" ? "today" : "tomorrow";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[1.45rem] font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-3xl">
            {ctx.heading}
          </h2>
          <p className="mt-1.5 text-sm text-[color:var(--famli-muted)]">{ctx.intro}</p>
        </div>
        <DayToggle active={active} />
      </div>

      {ctx.quiet ? (
        <p className="text-base text-[color:var(--famli-ink)]">
          {ctx.kind === "tomorrow" ? "Morgen is rustig." : "Vandaag is rustig."}
        </p>
      ) : null}

      {ctx.ready && !ctx.quiet ? (
        <p className="text-base font-medium text-[color:var(--famli-success)]">
          {ctx.kind === "tomorrow" ? "Morgen staat klaar ✓" : "Vandaag staat klaar ✓"}
        </p>
      ) : null}

      {!ctx.quiet
        ? ctx.children.map((child) => (
            <section key={child.childId} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--famli-muted)]">
                  {child.childName}
                </h3>
                {child.handover ? (
                  <Link href={child.handover.href} className="text-sm text-[color:var(--famli-muted)]">
                    {child.handover.label}
                  </Link>
                ) : null}
              </div>
              <p className="text-base text-[color:var(--famli-ink)]">{child.stayLabel}</p>
              {child.stayUnknown && canEditCustody ? (
                <Link href="/jaaroverzicht" className="famli-btn famli-btn-secondary mt-1 min-h-11 px-3">
                  Schema instellen
                </Link>
              ) : null}
              <ul className="divide-y divide-[color:var(--famli-border)]">
                {child.timeline.map((entry) => (
                  <li key={entry.id} className="flex gap-3 py-2.5">
                    <span className="w-12 shrink-0 tabular-nums text-sm text-[color:var(--famli-muted)]">
                      {entry.time ?? "—"}
                    </span>
                    <div className="min-w-0">
                      <Link href={entry.href} className="font-medium text-[color:var(--famli-ink)]">
                        {entry.title}
                      </Link>
                      {entry.subtitle ? (
                        <p className="text-sm text-[color:var(--famli-muted)]">{entry.subtitle}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        : null}

      {openPacking.length || checkedPacking.length ? (
        <section className="space-y-2">
          <h2 className="famli-section-title">Wat moet mee</h2>
          <ul>
            {openPacking.map((item) => (
              <li key={item.key}>
                {item.itemId ? (
                  <PackingToggle
                    itemId={item.itemId}
                    checked={item.checked}
                    label={item.label}
                    disabled={!canEditPacking}
                  />
                ) : (
                  <PackingSuggestionToggle
                    childId={item.childId}
                    label={item.label}
                    context={item.context}
                    eventId={item.eventId}
                    handoverId={item.handoverId}
                    dueOn={item.dueOn}
                    disabled={!canEditPacking}
                  />
                )}
              </li>
            ))}
            {checkedPacking.map((item) =>
              item.itemId ? (
                <li key={item.key}>
                  <PackingToggle
                    itemId={item.itemId}
                    checked
                    label={item.label}
                    disabled={!canEditPacking}
                  />
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      {ctx.tasks.length ? (
        <section className="space-y-2">
          <h2 className="famli-section-title">Nog regelen</h2>
          <ul className="space-y-1">
            {ctx.tasks.map((task) => (
              <li key={task.id}>
                <Link href={task.href} className="flex min-h-11 items-center text-base text-[color:var(--famli-ink)]">
                  ☐ {task.title}
                  {task.childName ? (
                    <span className="ml-2 text-sm text-[color:var(--famli-muted)]">{task.childName}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DaySignals
        alerts={ctx.alerts}
        parents={parents}
        canEditCalendar={canEditCalendar}
        canEditPacking={canEditPacking}
        canEditCustody={canEditCustody}
      />
    </div>
  );
}
