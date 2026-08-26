import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { ChangeReviewCard } from "@/components/requests/change-review";
import { EmptyState } from "@/components/empty-state";
import { createTaskAction, updateTaskStatusAction } from "@/lib/actions/family";
import { parentName } from "@/lib/queries/family-view";
import { formatDayLong } from "@/lib/dates";
import { NeededList } from "@/components/children/needed-list";
import { RoutineOccurrenceCard } from "@/components/routines/routine-list";
import { CompletedRoutineOccurrencesSection } from "@/components/routines/completed-routines-section";
import { CompletedTasksSection } from "@/components/tasks/completed-tasks-section";
import {
  completedOneOffTasks,
  completedRoutineOccurrences,
  myOpenDutiesToday,
  myCompletedDutiesToday,
  routinesOnly,
} from "@/lib/queries/routines";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { weekdayLabel } from "@/lib/domain/labels";
import { createRoutineAction } from "@/lib/actions/routines";

export default async function ArrangePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const { tab = "vandaag", id } = await searchParams;
  const todayDuties = myOpenDutiesToday(snapshot);
  const todayCompleted = myCompletedDutiesToday(snapshot);
  const pending = canAcceptChangeRequests(snapshot)
    ? snapshot.changeRequests.filter((item) => item.status === "pending" || item.status === "alternative_proposed")
    : [];
  const tasks = snapshot.tasks.filter((task) => task.kind === "one_off" && task.status !== "done");
  const routines = routinesOnly(snapshot);
  const routineOccurrences = snapshot.routineOccurrences
    .filter((item) => item.status === "pending" || item.status === "unregistered")
    .slice(0, 20);
  const completedTasks = completedOneOffTasks(snapshot);
  const completedOccurrences = completedRoutineOccurrences(snapshot);
  const myOpenSplits = snapshot.splits.filter((split) => {
    const expense = snapshot.expenses.find((item) => item.id === split.expenseId);
    return split.status === "pending" && expense && expense.paidByMemberId !== snapshot.currentMember.id && split.memberId === snapshot.currentMember.id;
  });
  const needsAction = pending.length + myOpenSplits.length + tasks.filter((task) => task.assigneeMemberId === snapshot.currentMember.id).length;

  const tabs = [
    { id: "vandaag", label: "Vandaag" },
    { id: "taken", label: "Taken" },
    { id: "routines", label: "Routines" },
    { id: "verzoeken", label: "Verzoeken" },
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

      <nav className="flex gap-2">
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

      {tab === "vandaag" ? (
        <div className="space-y-4">
          <div className="space-y-3">
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
          </div>
          {todayCompleted.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Afgerond vandaag</h2>
              {todayCompleted.map((item) => (
                <article key={item.id} className="famli-card opacity-80">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">{item.time}</p>
                  <p className="mt-1 text-lg font-medium line-through">{item.title}</p>
                  {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
                  <p className="mt-1 text-sm text-[color:var(--famli-muted)]">✓ Afgerond</p>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "verzoeken" ? (
        <div className="space-y-3">
          {pending.map((request) => (
            <div key={request.id} id={request.id} className={id === request.id ? "rounded-3xl ring-2 ring-[color:var(--famli-brand)]" : ""}>
              <ChangeReviewCard snapshot={snapshot} request={request} />
            </div>
          ))}
          {!pending.length ? (
            <EmptyState title="Geen openstaande verzoeken" body="Wijzigingsvoorstellen verschijnen hier." />
          ) : null}
        </div>
      ) : null}

      {tab === "taken" ? (
        <div className="space-y-4">
          <form action={createTaskAction} className="famli-card grid gap-2 md:grid-cols-2">
            <h2 className="text-lg font-semibold md:col-span-2">Taak toevoegen</h2>
            <input name="title" required placeholder="Titel" className="famli-input" />
            <select name="childId" className="famli-input">
              <option value="">Kind</option>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName}
                </option>
              ))}
            </select>
            <select name="assigneeMemberId" defaultValue={snapshot.currentMember.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <input name="dueAt" type="datetime-local" className="famli-input" />
            <textarea name="description" placeholder="Optionele notitie" className="famli-input md:col-span-2" />
            <button className="famli-btn famli-btn-primary md:col-span-2">Opslaan</button>
          </form>
          {tasks.map((task) => (
            <article key={task.id} id={task.id} className="famli-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{task.title}</p>
                  <p className="text-sm text-[color:var(--famli-muted)]">
                    {task.childId ? snapshot.children.find((child) => child.id === task.childId)?.firstName : "Gezin"}
                    {task.assigneeMemberId ? ` · ${parentName(snapshot, task.assigneeMemberId)}` : ""}
                    {task.dueAt ? ` · voor ${formatDayLong(task.dueAt)}` : ""}
                  </p>
                  {task.description ? <p className="mt-1 text-sm">{task.description}</p> : null}
                </div>
                <form action={updateTaskStatusAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button name="status" value="done" className="famli-btn famli-btn-secondary h-11 px-4">
                    Afronden
                  </button>
                </form>
              </div>
            </article>
          ))}
          {!tasks.length ? <EmptyState title="Geen open taken" body="Voeg een taak toe als er iets geregeld moet worden." /> : null}
          <CompletedTasksSection snapshot={snapshot} tasks={completedTasks} />
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
          <CompletedRoutineOccurrencesSection
            snapshot={snapshot}
            occurrences={completedOccurrences}
            groupByDate
          />
        </div>
      ) : null}

      {tab === "nodig" ? (
        <NeededList snapshot={snapshot} items={snapshot.neededItems.filter((item) => item.status !== "niet_meer_nodig")} />
      ) : null}
    </div>
  );
}
