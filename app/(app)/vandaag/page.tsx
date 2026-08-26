import Link from "next/link";
import { addDays } from "date-fns";
import { requireSnapshot } from "@/lib/auth/session";
import { greetingForHour } from "@/lib/domain/labels";
import { formatDayLong, toISODate } from "@/lib/dates";
import { timelineForDate } from "@/lib/calendar/timeline";
import { nextHandover, parentName, urgentActions } from "@/lib/queries/family-view";
import { childPlace, comingSoon, forgetNot, neededHeadline, stayHeadline } from "@/lib/queries/child-life";
import { myOpenDutiesToday, myCompletedDutiesToday } from "@/lib/queries/routines";
import { completeRoutineOccurrenceAction } from "@/lib/actions/routines";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { AddMenu } from "@/components/compose/add-menu";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { EmptyState } from "@/components/empty-state";

export default async function TodayPage() {
  const snapshot = await requireSnapshot();
  const now = new Date();
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));
  const todayItems = timelineForDate(snapshot, today);
  const tomorrowItems = timelineForDate(snapshot, tomorrow);
  const actions = urgentActions(snapshot, now);
  const next = nextHandover(snapshot, today);
  const incoming = canAcceptChangeRequests(snapshot)
    ? snapshot.changeRequests.filter(
        (item) => item.status === "pending" && item.requestedByMemberId !== snapshot.currentMember.id,
      )
    : [];
  const remember = forgetNot(snapshot, now);
  const soon = comingSoon(snapshot, now);
  const duties = myOpenDutiesToday(snapshot, now);
  const completedDuties = myCompletedDutiesToday(snapshot, now);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--famli-muted)]">{formatDayLong(now)}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">
            {greetingForHour(now.getHours())}, {snapshot.currentProfile.firstName}
          </h1>
          <p className="mt-2 text-lg text-[color:var(--famli-ink)]">{stayHeadline(snapshot, now)}</p>
          {next ? (
            <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
              Volgende wissel {formatDayLong(next.date)} · {next.time}
            </p>
          ) : null}
        </div>
        <div className="hidden lg:block">
          <AddMenu snapshot={snapshot} compact />
        </div>
      </header>

      <section className="grid gap-2">
        {snapshot.children.map((child) => {
          const place = childPlace(snapshot, child, now);
          const travel = snapshot.travelPlans.find(
            (plan) => plan.childIds.includes(child.id) && plan.startsOn <= today && plan.endsOn >= today,
          );
          return (
            <Link key={child.id} href={place.href} className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
              <p className="text-sm text-[color:var(--famli-muted)]">{child.firstName}</p>
              <p className="text-lg font-semibold">{place.label}</p>
              {place.detail ? <p className="text-sm text-[color:var(--famli-muted)]">{place.detail}</p> : null}
              {travel ? (
                <p className="mt-2 text-sm font-medium text-[color:var(--famli-brand)]">Bekijk reisgegevens</p>
              ) : null}
            </Link>
          );
        })}
      </section>

      {duties.length || completedDuties.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Voor jou vandaag</h2>
          <div className="space-y-2">
            {duties.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"
              >
                <p className="text-sm text-[color:var(--famli-muted)]">{item.time}</p>
                <p className="text-lg font-medium">{item.title}</p>
                {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
                {item.packingItems.length ? (
                  <p className="mt-2 text-sm text-[color:var(--famli-muted)]">🎒 {item.packingItems.join(", ")}</p>
                ) : null}
                {item.occurrence?.status === "pending" ? (
                  <form action={completeRoutineOccurrenceAction} className="mt-3">
                    <input type="hidden" name="occurrenceId" value={item.occurrence.id} />
                    <button className="famli-btn famli-btn-primary h-10 px-4 text-sm">Afronden</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
          {completedDuties.length ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold text-[color:var(--famli-muted)]">Afgerond vandaag</h3>
              {completedDuties.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4 opacity-80"
                >
                  <p className="text-sm text-[color:var(--famli-muted)]">{item.time}</p>
                  <p className="text-lg font-medium line-through">{item.title}</p>
                  {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
                  <p className="mt-1 text-sm text-[color:var(--famli-muted)]">✓ Afgerond</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Vandaag</h2>
        <div className="space-y-2">
          {todayItems.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
              <p className="text-sm text-[color:var(--famli-muted)]">{item.time ?? "Hele dag"}</p>
              <p className="text-lg font-medium">{item.title}</p>
              {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
              {item.event?.dropoffMemberId || item.event?.pickupMemberId ? (
                <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
                  {item.event.dropoffMemberId ? `Brengen: ${parentName(snapshot, item.event.dropoffMemberId)}` : ""}
                  {item.event.dropoffMemberId && item.event.pickupMemberId ? " · " : ""}
                  {item.event.pickupMemberId ? `Halen: ${parentName(snapshot, item.event.pickupMemberId)}` : ""}
                </p>
              ) : null}
              {item.packingList.length ? (
                <p className="mt-2 text-sm text-[color:var(--famli-muted)]">🎒 {item.packingList.join(", ")}</p>
              ) : null}
            </Link>
          ))}
          {!todayItems.length ? (
            <EmptyState title="Een rustige dag" body="Geen afspraken of wissels voor vandaag." />
          ) : null}
        </div>
      </section>

      {incoming.length || remember.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Niet vergeten</h2>
          {incoming.length ? (
            <div className="mb-3 space-y-3">
              {incoming.slice(0, 1).map((request) => (
                <ChangeReviewCard key={request.id} snapshot={snapshot} request={request} />
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            {remember.map((item) => {
              const child = snapshot.children.find((row) => row.id === item.childId);
              return (
                <Link
                  key={item.id}
                  href={`/kinderen/${item.childId}?tab=nodig`}
                  className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[color:var(--famli-muted)]">
                    {[child?.firstName, item.size ? `maat ${item.size}` : null].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-sm">{neededHeadline(item, snapshot)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {soon.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Binnenkort</h2>
          <div className="space-y-2">
            {soon.map((item) => (
              <Link key={item.id} href={item.href} className="flex items-center justify-between rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[color:var(--famli-muted)]">{item.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Actie nodig</h2>
        <div className="space-y-2">
          {actions
            .filter((item) => item.kind !== "change")
            .slice(0, 3)
            .map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[color:var(--famli-muted)]">{item.detail}</p>
                </div>
                <span className="text-sm font-medium text-[color:var(--famli-brand)]">{item.cta}</span>
              </Link>
            ))}
        </div>
        {!incoming.length && !actions.length ? (
          <p className="text-sm text-[color:var(--famli-muted)]">Alles geregeld ✓</p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Morgen</h2>
          <Link href={`/agenda?date=${tomorrow}&view=day`} className="text-sm font-medium text-[color:var(--famli-brand)]">
            Bekijk morgen →
          </Link>
        </div>
        <div className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
          {tomorrowItems.length ? (
            <ul className="space-y-2">
              {tomorrowItems.slice(0, 4).map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="w-12 text-[color:var(--famli-muted)]">{item.time ?? "Dag"}</span>
                  <span>
                    {item.title}
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--famli-muted)]">Morgen is nog open.</p>
          )}
        </div>
      </section>
    </div>
  );
}
