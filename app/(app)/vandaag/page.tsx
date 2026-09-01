import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { greetingForHour } from "@/lib/domain/labels";
import { formatDayLong, toISODate } from "@/lib/dates";
import { nextHandover, parentName, urgentActions } from "@/lib/queries/family-view";
import { neededHeadline } from "@/lib/queries/child-life";
import { myCompletedDutiesToday } from "@/lib/queries/routines";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { handoverIsSoon } from "@/lib/queries/handover";
import { allSettledMessage } from "@/lib/queries/vandaag";
import { eventResponsibilityLines } from "@/lib/queries/responsibility";
import { bringHaalToday } from "@/lib/queries/bring-haal";
import { namedCostHeadline } from "@/lib/costs/stats";
import { formatEuro } from "@/lib/money";
import { forgetAndPack, nowAndSoon } from "@/lib/queries/smart-today";
import { todayPackingGroups } from "@/lib/queries/packing";
import { childrenOverview } from "@/lib/queries/children-overview";
import { AddMenu } from "@/components/compose/add-menu";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { SmartHandover } from "@/components/handover/smart-handover";
import { TodayPacking } from "@/components/packing/today-packing";
import { hasChildCapability } from "@/lib/security/capabilities";
import { OpenDutyCard, CompletedDutyCard } from "@/components/completion/duty-cards";
import { PageHeader, PageSection } from "@/components/ui/page-header";
import { TimelineItem } from "@/components/ui/list-row";
import { EmptyState } from "@/components/empty-state";
import { ChildOverviewCardView } from "@/components/children/child-overview-card";

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
  const packingGroups = todayPackingGroups(snapshot, now);
  const canEditPacking = snapshot.children.some((child) => hasChildCapability(snapshot, child.id, "edit_tasks"));
  const { now: happening, soon } = nowAndSoon(snapshot, now);
  const bring = bringHaalToday(snapshot);
  const costs = namedCostHeadline(snapshot);
  const overview = childrenOverview(snapshot);
  const hasToArrange = incoming.length || smart.duties.length || costs.net !== 0 || attentionActions.length;

  return (
    <div className="famli-page">
      <PageHeader
        eyebrow={`${greetingForHour(now.getHours())}, ${snapshot.currentProfile.firstName}`}
        title={`Vandaag · ${formatDayLong(now)}`}
        subtitle="Wat er speelt, wie iets doet en wat je niet mag vergeten."
        action={
          <div className="hidden lg:block">
            <AddMenu snapshot={snapshot} compact />
          </div>
        }
      />

      {overview.cards.length ? (
        <PageSection title="Vandaag bij jullie">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {overview.cards.map((card) => (
              <ChildOverviewCardView key={card.child.id} card={card} compact />
            ))}
          </div>
        </PageSection>
      ) : null}

      {happening.length || soon.length ? (
        <PageSection title="Nu / straks">
          <div>
            {happening.map((item) => (
              <TimelineItem
                key={item.id}
                href={item.href}
                time="Nu"
                title={item.title}
                meta={[item.who, item.time].filter(Boolean).join(" · ")}
                accent
              />
            ))}
            {soon.map((item) => (
              <TimelineItem
                key={item.id}
                href={item.href}
                time={item.time}
                title={item.title}
                meta={[item.who, item.event ? eventResponsibilityLines(snapshot, item.event).join(" · ") : null]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </div>
        </PageSection>
      ) : null}

      {bring.length ? (
        <PageSection title="Ophalen & brengen">
          <div>
            {bring.map((item) => (
              <TimelineItem
                key={item.id}
                href={item.href}
                time={item.time}
                title={item.title}
                meta={`${item.childNames} · ${item.bringLabel} · ${item.haulLabel}`}
              />
            ))}
          </div>
        </PageSection>
      ) : null}

      {showHandover && next ? <SmartHandover snapshot={snapshot} handover={next} /> : null}

      {packingGroups.length ? <TodayPacking groups={packingGroups} canEdit={canEditPacking} /> : null}

      {smart.needed.length ? (
        <PageSection
          title="Nog nodig"
          action={
            <Link href="/regelen?tab=nodig" className="text-sm font-medium text-[color:var(--famli-brand)]">
              Alles
            </Link>
          }
        >
          <div>
            {smart.needed.map((item) => {
              const child = snapshot.children.find((row) => row.id === item.childId);
              return (
                <TimelineItem
                  key={item.id}
                  href={`/kinderen/${item.childId}?tab=nodig`}
                  title={item.title}
                  meta={[child?.firstName, neededHeadline(item, snapshot)].filter(Boolean).join(" · ")}
                />
              );
            })}
          </div>
        </PageSection>
      ) : null}

      {hasToArrange ? (
        <PageSection title="Nog regelen">
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
            <Link href="/kosten" className="famli-action-card mb-3 block">
              <p className="font-medium">{costs.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">{formatEuro(Math.abs(costs.net))} open</p>
            </Link>
          ) : null}
          {!settled.ok && attentionActions.length ? (
            <ul className="space-y-1">
              {attentionActions.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                    <span>{item.title}</span>
                    <span className="font-medium text-[color:var(--famli-brand)]">{item.cta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </PageSection>
      ) : (
        <EmptyState tone="success" title="Alles geregeld" body={settled.message} />
      )}

      {smart.shopping > 0 ? (
        <PageSection title="Boodschappen">
          <Link href="/boodschappen" className="famli-action-card block">
            <p className="font-medium">{smart.shopping === 1 ? "1 open item" : `${smart.shopping} open items`}</p>
            <p className="text-sm text-[color:var(--famli-muted)]">Op de gedeelde lijst</p>
          </Link>
        </PageSection>
      ) : null}

      {smart.evening.length || smart.tomorrow.length ? (
        <PageSection title="Morgen">
          {smart.evening.length ? (
            <div className="mb-3">
              <p className="mb-1 text-sm text-[color:var(--famli-muted)]">Vanavond</p>
              {smart.evening.map((item) => (
                <TimelineItem key={item.id} href={item.href} time={item.time} title={item.title} />
              ))}
            </div>
          ) : null}
          {smart.tomorrow.map((item) => (
            <TimelineItem
              key={item.id}
              href={item.href}
              time={item.time}
              title={item.title}
              meta={[item.detail, item.packing.length ? `Mee: ${item.packing.join(", ")}` : null].filter(Boolean).join(" · ")}
            />
          ))}
        </PageSection>
      ) : null}

      {smart.week.events || smart.week.handovers || smart.week.openTasks ? (
        <div className="famli-summary-card">
          <p className="famli-section-title">Deze week</p>
          <p className="mt-2 text-sm">
            {[
              smart.week.events ? `${smart.week.events} afspraken` : null,
              smart.week.sports ? `${smart.week.sports} sport` : null,
              smart.week.handovers ? `${smart.week.handovers} overdrachten` : null,
              smart.week.openTasks ? `${smart.week.openTasks} open taken` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link href="/agenda" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--famli-brand)]">
            Open agenda →
          </Link>
        </div>
      ) : null}

      {completedDuties.length ? (
        <PageSection title="Afgerond vandaag">
          <div className="space-y-2">
            {completedDuties.map((item) => (
              <CompletedDutyCard key={item.id} item={item} />
            ))}
          </div>
        </PageSection>
      ) : null}

      {next && !showHandover ? (
        <div className="famli-summary-card">
          <p className="famli-section-title">Volgende wissel</p>
          <p className="mt-2 font-medium">
            {formatDayLong(next.date)} · {next.time} · {parentName(snapshot, next.fromMemberId)} →{" "}
            {parentName(snapshot, next.toMemberId)}
          </p>
          <Link
            href={`/agenda?date=${next.date}&view=wissels`}
            className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--famli-brand)]"
          >
            Bekijk overdracht →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
