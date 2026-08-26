import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { EmptyState } from "@/components/empty-state";
import { NeededList } from "@/components/children/needed-list";
import { RoutineOccurrenceCard } from "@/components/routines/routine-list";
import { CompletedRoutineOccurrencesSection } from "@/components/routines/completed-routines-section";
import { CompletedRegelenSection } from "@/components/completion/completed-regelen-section";
import { RegelenTaskCard } from "@/components/tasks/regelen-task-card";
import {
  completedOneOffTasks,
  completedRoutineOccurrences,
  myCompletedDutiesToday,
  myOpenDutiesToday,
  routinesOnly,
} from "@/lib/queries/routines";
import { weekdayLabel } from "@/lib/domain/labels";
import { createRoutineAction } from "@/lib/actions/routines";
import {
  changeRequestsForBucket,
  completedNeededItems,
  neededForBucket,
  tasksForBucket,
} from "@/lib/queries/regelen-view";
import { wieRegelt } from "@/lib/queries/responsibility";
import { neededHeadline } from "@/lib/queries/child-life";
import { CompletedDutyCard } from "@/components/completion/duty-cards";

export default async function ArrangePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const { tab = "voor-jou", id } = await searchParams;
  const todayDuties = myOpenDutiesToday(snapshot);
  const todayCompleted = myCompletedDutiesToday(snapshot);
  const voorJouTasks = tasksForBucket(snapshot, "voor_jou");
  const samenTasks = tasksForBucket(snapshot, "samen");
  const laterTasks = tasksForBucket(snapshot, "later");
  const verzoeken = changeRequestsForBucket(snapshot, "verzoeken");
  const routines = routinesOnly(snapshot);
  const routineOccurrences = snapshot.routineOccurrences
    .filter((item) => item.status === "pending" || item.status === "unregistered")
    .slice(0, 20);
  const completedTasks = completedOneOffTasks(snapshot);
  const completedNeeded = completedNeededItems(snapshot);
  const myCompletedTasks = completedTasks.filter((task) => task.assigneeMemberId === snapshot.currentMember.id);
  const myCompletedNeeded = completedNeeded.filter(
    (item) =>
      item.purchasedByMemberId === snapshot.currentMember.id ||
      item.assigneeMemberId === snapshot.currentMember.id,
  );
  const completedOccurrences = completedRoutineOccurrences(snapshot);
  const needsAction =
    voorJouTasks.length +
    samenTasks.filter((task) => !task.assigneeMemberId).length +
    verzoeken.length;

  const tabs = [
    { id: "voor-jou", label: "Voor jou" },
    { id: "samen", label: "Samen" },
    { id: "verzoeken", label: "Verzoeken" },
    { id: "later", label: "Later" },
    { id: "routines", label: "Routines" },
    { id: "nodig", label: "Nodig" },
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Regelen</h1>
        <p className="mt-1 text-[color:var(--famli-muted)]">
          {needsAction ? "Wat nu jouw aandacht nodig heeft." : "Alles is momenteel geregeld."}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/regelen?tab=${item.id}`}
            className={`h-10 rounded-full px-4 text-sm leading-10 ${
              tab === item.id ? "bg-[color:var(--famli-ink)] text-white" : "border border-[color:var(--famli-border)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "voor-jou" ? (
        <div className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Vandaag</h2>
            {todayDuties.map((item) => (
              <article key={item.id} className="famli-card">
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">{item.time}</p>
                <p className="mt-1 text-lg font-medium">{item.title}</p>
                {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
              </article>
            ))}
            {!todayDuties.length && !todayCompleted.length ? (
              <EmptyState title="Niets gepland voor vandaag" body="Taken en routines voor jou verschijnen hier." />
            ) : null}
          </section>
          {voorJouTasks.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Jouw taken</h2>
              {voorJouTasks.map((task) => (
                <RegelenTaskCard key={task.id} snapshot={snapshot} task={task} highlight={id === task.id} />
              ))}
            </section>
          ) : null}
          {neededForBucket(snapshot, "voor_jou").length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Nodig — jij regelt</h2>
              <NeededList snapshot={snapshot} items={neededForBucket(snapshot, "voor_jou")} compact />
            </section>
          ) : null}
          {todayCompleted.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Afgerond vandaag</h2>
              {todayCompleted.map((item) => (
                <CompletedDutyCard key={item.id} item={item} />
              ))}
            </section>
          ) : null}
          <CompletedRegelenSection snapshot={snapshot} tasks={myCompletedTasks} neededItems={myCompletedNeeded} />
        </div>
      ) : null}

      {tab === "samen" ? (
        <div className="space-y-3">
          {samenTasks.map((task) => (
            <RegelenTaskCard key={task.id} snapshot={snapshot} task={task} highlight={id === task.id} />
          ))}
          {neededForBucket(snapshot, "samen").map((item) => (
            <Link key={item.id} href={`/kinderen/${item.childId}?tab=nodig`} className="famli-card block">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">{wieRegelt(snapshot, item.assigneeMemberId)}</p>
            </Link>
          ))}
          {!samenTasks.length && !neededForBucket(snapshot, "samen").length ? (
            <EmptyState title="Niets open voor jullie beiden" body="Samen-taken verschijnen hier als iets nog niet is toegewezen." />
          ) : null}
        </div>
      ) : null}

      {tab === "verzoeken" ? (
        <div className="space-y-3">
          {verzoeken.map((request) => (
            <div key={request.id} id={request.id} className={id === request.id ? "rounded-3xl ring-2 ring-[color:var(--famli-brand)]" : ""}>
              <ChangeReviewCard snapshot={snapshot} request={request} />
            </div>
          ))}
          {!verzoeken.length ? (
            <EmptyState title="Geen openstaande verzoeken" body="Wijzigingsvoorstellen verschijnen hier." />
          ) : null}
        </div>
      ) : null}

      {tab === "later" ? (
        <div className="space-y-3">
          {laterTasks.map((task) => (
            <RegelenTaskCard key={task.id} snapshot={snapshot} task={task} highlight={id === task.id} />
          ))}
          {neededForBucket(snapshot, "later").map((item) => (
            <Link key={item.id} href={`/kinderen/${item.childId}?tab=nodig`} className="famli-card block">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">{neededHeadline(item, snapshot)}</p>
            </Link>
          ))}
          {!laterTasks.length && !neededForBucket(snapshot, "later").length ? (
            <EmptyState title="Niets voor later" body="Niet-urgente taken komen hier terecht." />
          ) : null}
        </div>
      ) : null}

      {tab === "routines" ? (
        <div className="space-y-4">
          <form action={createRoutineAction} className="famli-card grid gap-2 md:grid-cols-2">
            <h2 className="text-lg font-semibold md:col-span-2">Routine of zorg toevoegen</h2>
            <input name="title" required placeholder="Titel" className="famli-input" />
            <select name="kind" className="famli-input" defaultValue="routine">
              <option value="routine">Routine</option>
              <option value="care">Zorg / medicatie</option>
            </select>
            <select name="childId" className="famli-input">
              <option value="">Kind</option>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName}
                </option>
              ))}
            </select>
            <select name="assignMode" className="famli-input" defaultValue="stay">
              <option value="stay">Volgt verblijf/reis</option>
              <option value="fixed">Vaste persoon</option>
            </select>
            <input name="times" placeholder="Tijden, bv. 08:00, 20:00" className="famli-input" />
            <input name="packingItems" placeholder="Meenemen, kommagescheiden" className="famli-input" />
            <fieldset className="md:col-span-2 rounded-2xl border border-[color:var(--famli-border)] px-4 py-3">
              <legend className="px-1 text-sm">Dagen</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(weekdayLabel).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="weekdays" value={value} defaultChecked={value === "3"} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="famli-btn famli-btn-primary md:col-span-2">Opslaan</button>
          </form>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Vaste routines</h2>
            {routines.map((routine) => {
              const child = snapshot.children.find((row) => row.id === routine.childId);
              return (
                <article key={routine.id} className="famli-card">
                  <p className="text-lg font-medium">
                    {routine.title}
                    {child ? ` · ${child.firstName}` : ""}
                  </p>
                  <p className="text-sm text-[color:var(--famli-muted)]">
                    {(routine.weekdays ?? []).map((day) => weekdayLabel[day]).join(", ")}
                    {routine.times?.length ? ` · ${routine.times.join(", ")}` : ""}
                  </p>
                  {routine.packingItems?.length ? (
                    <p className="mt-1 text-sm">🎒 {routine.packingItems.join(", ")}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Komende momenten</h2>
            {routineOccurrences.map((occurrence) => (
              <RoutineOccurrenceCard key={occurrence.id} snapshot={snapshot} occurrence={occurrence} />
            ))}
            {!routineOccurrences.length ? (
              <EmptyState title="Geen open routines" body="Voeg een routine toe voor terugkerende taken." />
            ) : null}
          </div>
          <CompletedRoutineOccurrencesSection snapshot={snapshot} occurrences={completedOccurrences} groupByDate />
        </div>
      ) : null}

      {tab === "nodig" ? (
        <NeededList
          snapshot={snapshot}
          items={snapshot.neededItems.filter((item) => item.status !== "niet_meer_nodig")}
          showCompleted
        />
      ) : null}
    </div>
  );
}
