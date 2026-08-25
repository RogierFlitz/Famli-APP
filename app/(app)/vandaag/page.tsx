import Link from "next/link";
import { addDays } from "date-fns";
import { requireSnapshot } from "@/lib/auth/session";
import { greetingForHour } from "@/lib/domain/labels";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { timelineForDate } from "@/lib/calendar/timeline";
import { memberLabel } from "@/lib/custody/generate";
import { balanceForMember } from "@/lib/costs/balance";
import { formatEuro } from "@/lib/money";
import { changeRequestLabel, taskStatusLabel } from "@/lib/domain/labels";
import { respondToChangeRequestAction } from "@/lib/actions/calendar";

export default async function TodayPage() {
  const snapshot = await requireSnapshot();
  const now = new Date();
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));
  const todayItems = timelineForDate(snapshot, today);
  const tomorrowItems = timelineForDate(snapshot, tomorrow).filter((item) => item.kind !== "custody");
  const net = balanceForMember(snapshot.expenses, snapshot.splits, snapshot.currentMember.id);
  const pendingRequests = snapshot.changeRequests.filter(
    (item) => item.status === "pending" && item.requestedByMemberId !== snapshot.currentMember.id,
  );
  const myOpenTasks = snapshot.tasks.filter(
    (task) => task.status !== "done" && task.assigneeMemberId === snapshot.currentMember.id,
  );
  const openSplit = snapshot.splits.find(
    (split) =>
      split.memberId === snapshot.currentMember.id &&
      split.status === "pending" &&
      snapshot.expenses.find((expense) => expense.id === split.expenseId && expense.paidByMemberId !== snapshot.currentMember.id),
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-[color:var(--nest-muted)]">{formatDayLong(now)}</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          {greetingForHour(now.getHours())}, {snapshot.currentProfile.firstName}
        </h1>
      </header>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Vandaag</h2>
        <div className="space-y-3">
          {todayItems.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5"
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">
                {item.time ? `${item.time} — ${item.title}` : item.title}
              </p>
              <p className="mt-1 text-lg font-medium">{item.subtitle || item.title}</p>
              {item.handover ? (
                <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
                  Ophalen: {memberLabel(snapshot.members, item.handover.pickupMemberId ?? item.handover.toMemberId)}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
              ) : item.location ? (
                <p className="mt-1 text-sm text-[color:var(--nest-muted)]">{item.location}</p>
              ) : null}
              {item.packingList.length ? (
                <p className="mt-2 text-sm">Meenemen: {item.packingList.join(", ")}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Morgen</h2>
        <div className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
          {tomorrowItems.length === 0 ? (
            <p className="text-sm text-[color:var(--nest-muted)]">Een rustige dag.</p>
          ) : (
            <ul className="space-y-3">
              {tomorrowItems.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="w-14 text-sm text-[color:var(--nest-muted)]">{item.time ?? "Dag"}</span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-[color:var(--nest-muted)]">{item.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Actie nodig</h2>
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">
                {changeRequestLabel[request.type]}
              </p>
              <p className="mt-1 text-lg">{request.message}</p>
              <form action={respondToChangeRequestAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={request.id} />
                <button name="decision" value="accepted" className="h-11 rounded-full bg-[color:var(--nest-ink)] px-4 text-sm text-white">
                  Accepteren
                </button>
                <button name="decision" value="alternative_proposed" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm">
                  Alternatief voorstellen
                </button>
                <button name="decision" value="declined" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm">
                    Niet deze keer
                </button>
              </form>
            </article>
          ))}
          {openSplit ? (
            <Link href="/kosten" className="block rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">Openstaande kosten</p>
              <p className="mt-1 text-lg">
                {net < 0 ? `Jij moet ${formatEuro(Math.abs(net))} betalen` : `Jij krijgt ${formatEuro(net)}`}
              </p>
            </Link>
          ) : null}
          {myOpenTasks.slice(0, 2).map((task) => (
            <Link key={task.id} href="/regelen" className="block rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">{taskStatusLabel[task.status]}</p>
              <p className="mt-1 text-lg">{task.title}</p>
              {task.dueAt ? <p className="text-sm text-[color:var(--nest-muted)]">Voor {formatTime(task.dueAt)}</p> : null}
            </Link>
          ))}
          {!pendingRequests.length && !openSplit && !myOpenTasks.length ? (
            <p className="text-sm text-[color:var(--nest-muted)]">Niets dat nu jouw aandacht nodig heeft.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
