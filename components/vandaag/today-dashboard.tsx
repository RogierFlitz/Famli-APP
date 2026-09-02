import Link from "next/link";
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  CheckCircle2,
  Dumbbell,
  GraduationCap,
  Users,
  Utensils,
} from "lucide-react";
import { formatDayLong } from "@/lib/dates";
import { parentName } from "@/lib/queries/family-view";
import { handoverPackingSuggestions, packingItemsForHandover } from "@/lib/queries/packing";
import { PackingAddRow, PackingSuggestionToggle, PackingToggle } from "@/components/packing/packing-toggle";
import type { NowSoonEvent, WeekLine } from "@/lib/queries/smart-today";
import type { FamilySnapshot, Handover, NeededItem, PackingItem } from "@/lib/domain/types";
import type { PackingGroup, PackingSuggestion } from "@/lib/queries/packing";
import type { DutyItem } from "@/lib/queries/routines";
import { OpenDutyCard } from "@/components/completion/duty-cards";
import { cn } from "@/lib/utils";

export function TodayStatChips({
  childrenCount,
  openTasks,
  packingLeft,
  handovers,
}: {
  childrenCount: number;
  openTasks: number;
  packingLeft: number;
  handovers: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatChip icon={<Users className="size-4" />} label="Kinderen" value={String(childrenCount)} />
      <StatChip
        icon={<CheckCircle2 className={cn("size-4", openTasks === 0 ? "text-[color:var(--famli-success)]" : "")} />}
        label="Open taken"
        value={String(openTasks)}
      />
      <StatChip
        icon={<Briefcase className="size-4 text-[color:var(--famli-warning)]" />}
        label="Meenemen"
        value={String(packingLeft)}
      />
      <StatChip
        icon={<ArrowLeftRight className="size-4 text-[color:var(--famli-parent-2)]" />}
        label="Wissels"
        value={String(handovers)}
      />
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-[color:var(--famli-elevated)] px-3 py-2.5 shadow-[var(--famli-shadow-rest)]">
      <span className="grid size-8 place-items-center rounded-full bg-[color:var(--famli-surface)] text-[color:var(--famli-ink)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-[color:var(--famli-muted)]">{label}</p>
      </div>
    </div>
  );
}

export function TodayScheduleCard({
  rows,
  duties,
  settledOk,
  settledMessage,
}: {
  rows: NowSoonEvent[];
  duties: DutyItem[];
  settledOk: boolean;
  settledMessage: string;
}) {
  const visible = rows.slice(0, 8);

  return (
    <section className="famli-card h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="famli-section-title">Vandaag</h2>
        <Link href="/agenda" className="text-sm font-medium text-[color:var(--famli-brand)]">
          Naar agenda →
        </Link>
      </div>
      {visible.length ? (
        <ol>
          {visible.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
              <span className="relative mt-3 flex w-4 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "relative z-10 size-2.5 rounded-full ring-4 ring-[color:var(--famli-elevated)]",
                    item.live ? "bg-[color:var(--famli-brand)]" : "bg-[color:var(--famli-muted)]",
                  )}
                />
                {index < visible.length - 1 ? (
                  <span className="absolute top-3 bottom-[-12px] w-px bg-[color:var(--famli-border)]" />
                ) : null}
              </span>
              <Link
                href={item.href}
                className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-xl py-0.5 hover:bg-[color:var(--famli-surface)]"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--famli-surface)] text-[color:var(--famli-muted)]">
                  <TimelineIcon title={item.title} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[color:var(--famli-muted)]">
                      {item.live ? "Nu" : item.time ?? "Hele dag"}
                    </span>
                  </span>
                  {item.who ? <span className="mt-0.5 block text-sm text-[color:var(--famli-muted)]">{item.who}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[color:var(--famli-muted)]">Niets gepland voor vandaag.</p>
      )}
      {duties.length ? (
        <div className="mt-4 space-y-2 border-t border-[color:var(--famli-border)] pt-3">
          {duties.slice(0, 3).map((item) => (
            <OpenDutyCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
      {settledOk ? (
        <p className="mt-4 flex items-start gap-2 text-sm text-[color:var(--famli-success)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {settledMessage === "Alles geregeld ✓"
              ? "Alles geregeld. Fijn, er staat niets open voor vandaag."
              : settledMessage}
          </span>
        </p>
      ) : null}
    </section>
  );
}

function TimelineIcon({ title }: { title: string }) {
  const hay = title.toLowerCase();
  if (/school|les/.test(hay)) return <GraduationCap className="size-4" />;
  if (/haal|breng|ophalen/.test(hay)) return <Car className="size-4" />;
  if (/hockey|sport|zwem|gym/.test(hay)) return <Dumbbell className="size-4" />;
  if (/eten|pasta|diner/.test(hay)) return <Utensils className="size-4" />;
  return <Briefcase className="size-4" />;
}

export function TodayForgetCard({
  groups,
  needed,
  canEdit,
}: {
  groups: PackingGroup[];
  needed: NeededItem[];
  canEdit: boolean;
}) {
  const visible = groups.filter((group) => group.items.length || group.suggestions.length).slice(0, 4);
  if (!visible.length && !needed.length) return null;

  return (
    <section className="famli-card">
      <h2 className="famli-section-title">Niet vergeten</h2>
      <div className="mt-2 space-y-4">
        {visible.map((group) => (
          <div key={group.id}>
            <p className="text-sm font-medium">
              {group.childName} · {group.title}
              {group.when ? ` ${group.when}` : ""}
            </p>
            <ul className="mt-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <PackingToggle itemId={item.id} checked={item.checked} label={item.label} disabled={!canEdit} />
                </li>
              ))}
              {group.suggestions.map((suggestion) => (
                <li key={suggestion.key}>
                  <PackingSuggestionToggle
                    childId={suggestion.childId}
                    label={suggestion.label}
                    context={suggestion.context}
                    eventId={suggestion.eventId}
                    handoverId={suggestion.handoverId}
                    dueOn={suggestion.dueOn}
                    disabled={!canEdit}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {needed.slice(0, 3).map((item) => (
          <Link
            key={item.id}
            href={`/kinderen/${item.childId}?tab=nodig`}
            className="flex min-h-11 items-center gap-3 text-sm"
          >
            <span className="size-11 shrink-0 rounded-xl border border-[color:var(--famli-border)]" />
            <span className="flex-1">{item.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TodayHandoverPackingCard({
  snapshot,
  handover,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  handover: Handover;
  canEdit: boolean;
}) {
  const items = uniqueByLabel(
    packingItemsForHandover(snapshot, handover).filter(
      (item) => item.handoverId === handover.id || item.context === "handover",
    ),
  );
  const suggestions = uniqueSuggestionLabels(
    handoverPackingSuggestions(snapshot, handover).filter((row) => !row.eventId),
  ).filter((row) => !items.some((item) => item.label.trim().toLowerCase() === row.label.trim().toLowerCase()));
  const checked = items.filter((item) => item.checked).length;
  const total = items.length + suggestions.length;
  const percent = total ? Math.round((checked / total) * 100) : 0;
  const toLabel = parentName(snapshot, handover.toMemberId);
  const childId = handover.childIds[0] ?? snapshot.children[0]?.id;

  return (
    <section className="famli-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="famli-section-title">Meenemen naar {toLabel.toLowerCase()}</h2>
          <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
            {formatDayLong(handover.date)} · {handover.time}
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums">{checked} van {total} klaar</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--famli-surface)]">
        <div
          className="h-full rounded-full bg-[color:var(--famli-success)] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-2">
        {items.map((item) => (
          <li key={item.id}>
            <PackingToggle itemId={item.id} checked={item.checked} label={item.label} disabled={!canEdit} compact />
          </li>
        ))}
        {suggestions.map((suggestion) => (
          <li key={suggestion.key}>
            <PackingSuggestionToggle
              childId={suggestion.childId}
              label={suggestion.label}
              context={suggestion.context}
              eventId={suggestion.eventId}
              handoverId={suggestion.handoverId}
              dueOn={suggestion.dueOn}
              disabled={!canEdit}
              compact
            />
          </li>
        ))}
      </ul>
      {canEdit && childId ? (
        <PackingAddRow childId={childId} context="handover" handoverId={handover.id} dueOn={handover.date} />
      ) : null}
    </section>
  );
}

function uniqueSuggestionLabels(items: PackingSuggestion[]): PackingSuggestion[] {
  const seen = new Set<string>();
  const out: PackingSuggestion[] = [];
  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function uniqueByLabel(items: PackingItem[]): PackingItem[] {
  const seen = new Set<string>();
  const out: PackingItem[] = [];
  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function TodayWeekCard({ lines }: { lines: WeekLine[] }) {
  if (!lines.length) return null;
  return (
    <section className="famli-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="famli-section-title">Volgende week</h2>
        <Link href="/agenda" className="text-sm font-medium text-[color:var(--famli-brand)]">
          Agenda →
        </Link>
      </div>
      <ul>
        {lines.map((line) => (
          <li key={line.id}>
            <Link href={line.href} className="flex min-h-10 items-baseline justify-between gap-3 rounded-lg px-1 py-1 text-sm hover:bg-[color:var(--famli-surface)]">
              <span className="font-medium">{line.title}</span>
              <span className="shrink-0 capitalize text-[color:var(--famli-muted)]">{line.when}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
