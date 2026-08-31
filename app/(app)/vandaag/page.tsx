import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { greetingForHour } from "@/lib/domain/labels";
import { formatDayLong, toISODate } from "@/lib/dates";
import { nextHandover, parentName, urgentActions } from "@/lib/queries/family-view";
import { compactStayLine, neededHeadline } from "@/lib/queries/child-life";
import { myCompletedDutiesToday } from "@/lib/queries/routines";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { handoverIsSoon } from "@/lib/queries/handover";
import { allSettledMessage } from "@/lib/queries/vandaag";
import { eventResponsibilityLines } from "@/lib/queries/responsibility";
import { bringHaalToday } from "@/lib/queries/bring-haal";
import { namedCostHeadline } from "@/lib/costs/stats";
import { formatEuro } from "@/lib/money";
import { forgetAndPack, nowAndSoon } from "@/lib/queries/smart-today";
import { AddMenu } from "@/components/compose/add-menu";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { SmartHandover } from "@/components/handover/smart-handover";
import { OpenDutyCard, CompletedDutyCard } from "@/components/completion/duty-cards";

export default async function TodayPage() {
  const snapshot = await requireSnapshot();
  const now = new Date();
  const today = toISODate(now);
  const actions = urgentActions(snapshot, now);
  const next = nextHandover(snapshot, today);
  const showHandover = next && handoverIsSoon(next, today);
  const incoming = canAcceptChangeRequests(snapshot)
    ? snapshot.changeRequests.filter(
        (item) => item.status === "pending" && item.requestedByMemberId !== snapshot.currentMember.id,
      )
    : [];
  const completedDuties = myCompletedDutiesToday(snapshot, now);
  const settled = allSettledMessage(snapshot, now);
  const attentionActions = actions.filter((item) => item.kind !== "change");
  const smart = forgetAndPack(snapshot, now);
  const { now: happening, soon } = nowAndSoon(snapshot, now);
  const bring = bringHaalToday(snapshot);
  const costs = namedCostHeadline(snapshot);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {greetingForHour(now.getHours())}, {snapshot.currentProfile.firstName}
          </p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">Vandaag · {formatDayLong(now)}</h1>
          <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
            Wat er speelt, wie iets doet, en wat je niet mag vergeten.
          </p>
        </div>
        <div className="hidden lg:block">
          <AddMenu snapshot={snapshot} compact />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Vandaag bij jullie</h2>
        <div className="grid gap-2">
          {snapshot.children.map((child) => (
            <Link
              key={child.id}
              href={`/kinderen/${child.id}`}
              className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"
            >
              <p className="text-sm text-[color:var(--famli-muted)]">{child.firstName}</p>
              <p className="text-lg font-semibold">{compactStayLine(snapshot, child, now)}</p>
            </Link>
          ))}
        </div>
      </section>

      {happening.length || soon.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Nu / straks</h2>
          <div className="space-y-2">
            {happening.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-3xl border border-[color:var(--famli-brand)]/30 bg-[color:var(--famli-brand-soft)]/40 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--famli-muted)]">Nu</p>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-[color:var(--famli-muted)]">{[item.who, item.time].filter(Boolean).join(" · ")}</p>
              </Link>
            ))}
            {soon.map((item) => (
              <Link key={item.id} href={item.href} className="flex gap-4 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-3">
                <span className="w-12 shrink-0 text-sm text-[color:var(--famli-muted)]">{item.time ?? "Dag"}</span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.who ? <p className="text-sm text-[color:var(--famli-muted)]">{item.who}</p> : null}
                  {item.event ? (
                    <p className="text-sm text-[color:var(--famli-muted)]">{eventResponsibilityLines(snapshot, item.event).join(" · ")}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {bring.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Ophalen & brengen</h2>
          <div className="space-y-2">
            {bring.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
                <p className="font-medium">
                  {item.time} · {item.title}
                </p>
                <p className="text-sm text-[color:var(--famli-muted)]">
                  {item.childNames} · {item.bringLabel} · {item.haulLabel}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {showHandover && next ? <SmartHandover snapshot={snapshot} handover={next} /> : null}

      {smart.packing.length || smart.needed.length ? (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">Niet vergeten</h2>
            <Link href="/regelen?tab=nodig" className="text-sm font-medium text-[color:var(--famli-brand)]">
              Bekijk alles
            </Link>
          </div>
          <div className="space-y-2">
            {smart.packing.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-[color:var(--famli-muted)]">Mee voor {item.context}</p>
              </Link>
            ))}
            {smart.needed.map((item) => {
              const child = snapshot.children.find((row) => row.id === item.childId);
              return (
                <Link key={item.id} href={`/kinderen/${item.childId}?tab=nodig`} className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
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

      {incoming.length || smart.duties.length || costs.net !== 0 || attentionActions.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Nog regelen</h2>
          {incoming.length ? (
            <div className="mb-3 space-y-3">
              {incoming.slice(0, 1).map((request) => (
                <ChangeReviewCard key={request.id} snapshot={snapshot} request={request} />
              ))}
            </div>
          ) : null}
          {smart.duties.length ? (
            <div className="mb-3 space-y-2">
              {smart.duties.map((item) => (
                <OpenDutyCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
          {costs.net !== 0 ? (
            <Link href="/kosten" className="mb-3 block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
              <p className="font-medium">{costs.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">{formatEuro(Math.abs(costs.net))} open</p>
            </Link>
          ) : null}
          {!settled.ok && attentionActions.length ? (
            <ul className="space-y-2">
              {attentionActions.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 text-sm">
                    <span>{item.title}</span>
                    <span className="font-medium text-[color:var(--famli-brand)]">{item.cta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <section className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
          <h2 className="text-lg font-semibold">Nog niets te regelen</h2>
          <p className="mt-1 text-[color:var(--famli-muted)]">{settled.message}</p>
        </section>
      )}

      {smart.shopping > 0 ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Boodschappen</h2>
          <Link href="/boodschappen" className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
            <p className="font-medium">
              {smart.shopping === 1 ? "1 open item" : `${smart.shopping} open items`}
            </p>
            <p className="text-sm text-[color:var(--famli-muted)]">Op de gedeelde lijst</p>
          </Link>
        </section>
      ) : null}

      {smart.evening.length || smart.tomorrow.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Vanavond / morgen</h2>
          {smart.evening.length ? (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-[color:var(--famli-muted)]">Vanavond</p>
              {smart.evening.map((item) => (
                <Link key={item.id} href={item.href} className="flex gap-4 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-3">
                  <span className="w-12 shrink-0 text-sm text-[color:var(--famli-muted)]">{item.time}</span>
                  <p className="font-medium">{item.title}</p>
                </Link>
              ))}
            </div>
          ) : null}
          {smart.tomorrow.length ? (
            <div className="space-y-2">
              <p className="text-sm text-[color:var(--famli-muted)]">Morgen alvast</p>
              {smart.tomorrow.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
                  <p className="font-medium">
                    {item.time ? `${item.time} · ` : ""}
                    {item.title}
                  </p>
                  {item.packing.length ? (
                    <p className="text-sm text-[color:var(--famli-muted)]">Mee: {item.packing.join(", ")}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {smart.week.events || smart.week.handovers || smart.week.openTasks ? (
        <section className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
          <p className="text-sm text-[color:var(--famli-muted)]">Deze week</p>
          <p className="mt-1 font-medium">
            {[
              smart.week.events ? `${smart.week.events} afspraken` : null,
              smart.week.sports ? `${smart.week.sports} sport` : null,
              smart.week.handovers ? `${smart.week.handovers} overdrachten` : null,
              smart.week.openTasks ? `${smart.week.openTasks} open taken` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link href="/agenda" className="mt-2 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">
            Open agenda →
          </Link>
        </section>
      ) : null}

      {completedDuties.length ? (
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[color:var(--famli-muted)]">Afgerond vandaag</h2>
          <div className="space-y-2">
            {completedDuties.map((item) => (
              <CompletedDutyCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {next && !showHandover ? (
        <section className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
          <p className="text-sm text-[color:var(--famli-muted)]">Volgende wissel</p>
          <p className="mt-1 font-medium">
            {formatDayLong(next.date)} · {next.time} · {parentName(snapshot, next.fromMemberId)} → {parentName(snapshot, next.toMemberId)}
          </p>
          <Link href={`/agenda?date=${next.date}&view=wissels`} className="mt-2 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">
            Bekijk overdracht →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
