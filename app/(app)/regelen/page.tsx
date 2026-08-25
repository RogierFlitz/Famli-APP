import { requireSnapshot } from "@/lib/auth/session";
import { changeRequestLabel, taskStatusLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { respondToChangeRequestAction } from "@/lib/actions/calendar";
import { createTaskAction, markSplitPaidAction, updateTaskStatusAction } from "@/lib/actions/family";
import { memberLabel } from "@/lib/custody/generate";

export default async function ArrangePage() {
  const snapshot = await requireSnapshot();
  const pending = snapshot.changeRequests.filter((item) => item.status === "pending" || item.status === "alternative_proposed");
  const openTasks = snapshot.tasks.filter((task) => task.status !== "done");
  const myOpenSplits = snapshot.splits.filter((split) => {
    const expense = snapshot.expenses.find((item) => item.id === split.expenseId);
    return split.status === "pending" && expense && expense.paidByMemberId !== snapshot.currentMember.id && split.memberId === snapshot.currentMember.id;
  });

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Regelen</h1>
        <p className="mt-1 text-[color:var(--nest-muted)]">Alleen wat jouw aandacht nodig heeft.</p>
      </header>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Actie nodig</h2>
        <div className="space-y-3">
          {pending.map((request) => (
            <article key={request.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">
                {changeRequestLabel[request.type]} · {request.targetDate}
              </p>
              <p className="mt-2 text-lg">{request.message}</p>
              <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
                Van {memberLabel(snapshot.members, request.requestedByMemberId)}
              </p>
              {request.requestedByMemberId !== snapshot.currentMember.id ? (
                <form action={respondToChangeRequestAction} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={request.id} />
                  <button name="decision" value="accepted" className="h-11 rounded-full bg-[color:var(--nest-ink)] px-4 text-white">
                    Accepteren
                  </button>
                  <button name="decision" value="alternative_proposed" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">
                    Alternatief voorstellen
                  </button>
                  <button name="decision" value="declined" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">
                    Niet deze keer
                  </button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-[color:var(--nest-muted)]">Wachten op de andere ouder.</p>
              )}
            </article>
          ))}
          {myOpenSplits.map((split) => {
            const expense = snapshot.expenses.find((item) => item.id === split.expenseId)!;
            return (
              <article key={split.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">Betaling</p>
                <p className="mt-1 text-lg">{expense.description}</p>
                <p className="text-[color:var(--nest-muted)]">{formatEuro(split.shareCents)} openstaand</p>
                <form action={markSplitPaidAction} className="mt-3">
                  <input type="hidden" name="splitId" value={split.id} />
                  <button className="h-11 rounded-full bg-[color:var(--nest-ink)] px-4 text-white">Markeer als betaald</button>
                </form>
              </article>
            );
          })}
          {!pending.length && !myOpenSplits.length ? (
            <p className="text-sm text-[color:var(--nest-muted)]">Geen openstaande verzoeken of betalingen.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Taken</h2>
        <form action={createTaskAction} className="mb-4 grid gap-2 rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-4 md:grid-cols-2">
          <input name="title" required placeholder="Titel" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
          <select name="childId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
            <option value="">Geen kind</option>
            {snapshot.children.map((child) => (
              <option key={child.id} value={child.id}>{child.firstName}</option>
            ))}
          </select>
          <select name="assigneeMemberId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>{member.parentLabel}</option>
            ))}
          </select>
          <input name="dueAt" type="datetime-local" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
          <textarea name="description" placeholder="Omschrijving" className="min-h-20 rounded-2xl border border-[color:var(--nest-border)] p-3 md:col-span-2" />
          <button className="h-12 rounded-full bg-[color:var(--nest-ink)] text-white md:col-span-2">Taak toevoegen</button>
        </form>
        <div className="space-y-3">
          {openTasks.map((task) => (
            <article key={task.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[color:var(--nest-muted)]">{taskStatusLabel[task.status]}</p>
                  <p className="text-lg font-medium">{task.title}</p>
                  {task.description ? <p className="text-sm text-[color:var(--nest-muted)]">{task.description}</p> : null}
                </div>
                <form action={updateTaskStatusAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button name="status" value="done" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm">
                    Afronden
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
