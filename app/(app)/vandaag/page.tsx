import { requireSnapshot } from "@/lib/auth/session";
import { greetingForHour } from "@/lib/domain/labels";
import { formatDayLong, toISODate } from "@/lib/dates";
import { nextHandover } from "@/lib/queries/family-view";
import { myCompletedDutiesToday } from "@/lib/queries/routines";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { handoverIsSoon } from "@/lib/queries/handover";
import { allSettledMessage } from "@/lib/queries/vandaag";
import {
  forgetAndPack,
  nextWeekLines,
  packingRemainingCount,
  todaySchedule,
} from "@/lib/queries/smart-today";
import { todayPackingGroups } from "@/lib/queries/packing";
import { childrenOverview } from "@/lib/queries/children-overview";
import { familyActivityFeed } from "@/lib/queries/activity-feed";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { hasCapability, hasChildCapability } from "@/lib/security/capabilities";
import { CompletedDutyCard } from "@/components/completion/duty-cards";
import { ChildOverviewCardView } from "@/components/children/child-overview-card";
import { FamilyActivity } from "@/components/activity/family-activity";
import {
  TodayForgetCard,
  TodayHandoverPackingCard,
  TodayScheduleCard,
  TodayStatChips,
  TodayWeekCard,
} from "@/components/vandaag/today-dashboard";
import { TodayShoppingCard } from "@/components/vandaag/today-shopping-card";

export default async function TodayPage() {
  const snapshot = await requireSnapshot();
  const now = new Date();
  const today = toISODate(now);
  const next = nextHandover(snapshot, today);
  const showHandover = Boolean(next && handoverIsSoon(next, today));
  const incoming = canAcceptChangeRequests(snapshot)
    ? snapshot.changeRequests.filter(
        (item) => item.status === "pending" && item.requestedByMemberId !== snapshot.currentMember.id,
      )
    : [];
  const completedDuties = myCompletedDutiesToday(snapshot, now);
  const settled = allSettledMessage(snapshot, now);
  const smart = forgetAndPack(snapshot, now);
  const packingGroups = todayPackingGroups(snapshot, now);
  const canEditPacking = snapshot.children.some((child) => hasChildCapability(snapshot, child.id, "edit_tasks"));
  const canEditShopping = hasCapability(snapshot, "edit_tasks");
  const schedule = todaySchedule(snapshot, now);
  const overview = childrenOverview(snapshot);
  const activity = familyActivityFeed(snapshot, now);
  const shoppingList =
    snapshot.shoppingLists.find((list) => list.isDefault) ?? snapshot.shoppingLists[0] ?? null;
  const shoppingItems = shoppingList
    ? snapshot.shoppingItems.filter((item) => item.listId === shoppingList.id)
    : [];
  const handoverCount = snapshot.handovers.filter(
    (item) => !item.cancelledAt && handoverIsSoon(item, today),
  ).length;

  return (
    <div className="famli-page">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.85rem] font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-4xl">
            {greetingForHour(now.getHours())}, {snapshot.currentProfile.firstName}
          </h1>
          <p className="mt-1.5 text-sm text-[color:var(--famli-muted)]">
            Vandaag · {formatDayLong(now)}
          </p>
        </div>
        <TodayStatChips
          childrenCount={overview.cards.length}
          openTasks={smart.duties.length}
          packingLeft={packingRemainingCount(snapshot, now)}
          handovers={handoverCount}
        />
      </header>

      {overview.cards.length ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {overview.cards.map((card) => (
            <ChildOverviewCardView key={card.child.id} card={card} compact />
          ))}
        </div>
      ) : null}

      {incoming.length ? (
        <div className="space-y-3">
          {incoming.slice(0, 1).map((request) => (
            <ChangeReviewCard key={request.id} snapshot={snapshot} request={request} />
          ))}
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <TodayScheduleCard
          rows={schedule}
          duties={smart.duties}
          settledOk={settled.ok}
          settledMessage={settled.message}
        />
        <div className="space-y-4">
          <TodayForgetCard groups={packingGroups} needed={smart.needed} canEdit={canEditPacking} />
          {showHandover && next ? (
            <TodayHandoverPackingCard snapshot={snapshot} handover={next} canEdit={canEditPacking} />
          ) : null}
        </div>
        <div className="space-y-4">
          <TodayShoppingCard
            snapshot={snapshot}
            list={shoppingList}
            items={shoppingItems}
            canEdit={canEditShopping}
          />
          <TodayWeekCard lines={nextWeekLines(snapshot, now)} />
        </div>
      </div>

      {completedDuties.length ? (
        <section className="space-y-3">
          <h2 className="famli-section-title">Afgerond vandaag</h2>
          <div className="space-y-2">
            {completedDuties.map((item) => (
              <CompletedDutyCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <FamilyActivity items={activity} />
    </div>
  );
}
