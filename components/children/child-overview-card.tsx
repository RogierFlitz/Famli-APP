import Link from "next/link";
import type { ChildOverviewCard } from "@/lib/queries/children-overview";

export function ChildOverviewCardView({ card, compact = false }: { card: ChildOverviewCard; compact?: boolean }) {
  const { child } = card;
  const initial = child.firstName.slice(0, 1).toUpperCase();

  return (
    <article
      className="relative rounded-2xl bg-[color:var(--famli-elevated)] px-3.5 py-3 shadow-[var(--famli-shadow-rest)] transition-[box-shadow] hover:shadow-[var(--famli-shadow-lift)]"
      style={{ borderLeft: `3px solid ${child.color || "var(--famli-child)"}` }}
    >
      <Link
        href={card.href}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--famli-brand)]"
        aria-label={`Open ${child.firstName}`}
      />
      <div className="pointer-events-none relative flex gap-3">
        {child.photoUrl ? (
          <img src={child.photoUrl} alt="" className="size-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div
            className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-[color:var(--famli-ink)]"
            style={{ background: child.color }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight text-[color:var(--famli-ink)]">
            {child.firstName}
            {card.ageLabel ? <span className="font-normal text-[color:var(--famli-muted)]"> · {card.ageLabel}</span> : null}
          </h2>
          <p className="mt-0.5 text-sm">{card.stayHeadline}</p>
          {card.stayUntil && !compact ? <p className="text-sm text-[color:var(--famli-muted)]">{card.stayUntil}</p> : null}

          {card.needsSchedule ? (
            <p className="pointer-events-auto relative z-10 mt-2">
              <Link href="/agenda?view=wissels" className="text-sm font-medium text-[color:var(--famli-brand)]">
                Schema instellen →
              </Link>
            </p>
          ) : null}

          {card.todayEvent ? (
            <p className="mt-1.5 text-sm text-[color:var(--famli-muted)]">
              {card.todayEvent.time ? `${card.todayEvent.time} · ` : ""}
              {card.todayEvent.title}
              {card.todayEvent.who ? ` · ${card.todayEvent.who}` : ""}
            </p>
          ) : null}

          {card.nextHandover ? (
            <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
              {card.nextHandover.when} → {card.nextHandover.toLabel}
            </p>
          ) : null}

          {!compact && card.attention.length ? (
            <ul className="mt-2 space-y-0.5">
              {card.attention.map((item) => (
                <li key={item} className="text-sm">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
