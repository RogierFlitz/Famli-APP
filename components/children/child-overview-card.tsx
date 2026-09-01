import Link from "next/link";
import type { ChildOverviewCard } from "@/lib/queries/children-overview";

export function ChildOverviewCardView({ card }: { card: ChildOverviewCard }) {
  const { child } = card;
  const initial = child.firstName.slice(0, 1).toUpperCase();

  return (
    <article className="relative rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-4 shadow-[var(--famli-shadow-rest)] transition-[box-shadow,border-color] hover:border-[color:var(--famli-brand)]/25 hover:shadow-[var(--famli-shadow-lift)]">
      <Link
        href={card.href}
        className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--famli-brand)]"
        aria-label={`Open ${child.firstName}`}
      />
      <div className="pointer-events-none relative flex gap-3">
        {child.photoUrl ? (
          <img
            src={child.photoUrl}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="grid size-12 shrink-0 place-items-center rounded-full text-base font-semibold text-[color:var(--famli-ink)]"
            style={{ background: child.color }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-[color:var(--famli-ink)]">
            {child.firstName}
            {card.ageLabel ? <span className="font-normal text-[color:var(--famli-muted)]"> · {card.ageLabel}</span> : null}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-[color:var(--famli-ink)]">{card.stayHeadline}</p>
          {card.stayUntil ? <p className="text-sm text-[color:var(--famli-muted)]">{card.stayUntil}</p> : null}

          {card.needsSchedule ? (
            <p className="pointer-events-auto relative z-10 mt-2">
              <Link
                href="/agenda?view=wissels"
                className="text-sm font-medium text-[color:var(--famli-brand)]"
              >
                Schema instellen →
              </Link>
            </p>
          ) : null}

          {card.todayEvent ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-[color:var(--famli-muted)]">Vandaag</p>
              <p className="text-sm text-[color:var(--famli-ink)]">
                {card.todayEvent.time ? `${card.todayEvent.time} · ` : ""}
                {card.todayEvent.title}
              </p>
              {card.todayEvent.who ? (
                <p className="text-sm text-[color:var(--famli-muted)]">{card.todayEvent.who}</p>
              ) : null}
            </div>
          ) : null}

          {card.nextHandover ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-[color:var(--famli-muted)]">Volgende wissel</p>
              <p className="text-sm text-[color:var(--famli-muted)]">
                {card.nextHandover.when} → {card.nextHandover.toLabel}
              </p>
            </div>
          ) : null}

          {card.attention.length ? (
            <ul className="mt-3 space-y-1">
              {card.attention.map((item) => (
                <li key={item} className="text-sm text-[color:var(--famli-ink)]">
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
