import { requireSnapshot } from "@/lib/auth/session";
import { balanceForMember } from "@/lib/costs/balance";
import { formatEuro } from "@/lib/money";
import { expenseCategoryLabel } from "@/lib/domain/labels";
import { memberLabel } from "@/lib/custody/generate";
import { createExpenseAction, createRecurringExpenseAction, markSplitPaidAction } from "@/lib/actions/family";
import { toISODate } from "@/lib/dates";

export default async function CostsPage() {
  const snapshot = await requireSnapshot();
  const net = balanceForMember(snapshot.expenses, snapshot.splits, snapshot.currentMember.id);
  const headline =
    net > 0 ? `Jij krijgt ${formatEuro(net)}` : net < 0 ? `Jij moet ${formatEuro(Math.abs(net))} betalen` : "Jullie staan gelijk";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Kosten</h1>
        <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[color:var(--nest-clay)]">{headline}</p>
      </header>

      <form action={createExpenseAction} className="grid gap-3 rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5 md:grid-cols-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl md:col-span-2">Kosten toevoegen</h2>
        <input name="description" required placeholder="Omschrijving" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
        <input name="amount" required placeholder="Bedrag" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
        <input name="date" type="date" required defaultValue={toISODate(new Date())} className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
        <select name="category" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
          {Object.entries(expenseCategoryLabel).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select name="childId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
          <option value="">Geen specifiek kind</option>
          {snapshot.children.map((child) => (
            <option key={child.id} value={child.id}>{child.firstName}</option>
          ))}
        </select>
        <select name="paidByMemberId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
          {snapshot.members.map((member) => (
            <option key={member.id} value={member.id}>Betaald door {member.parentLabel}</option>
          ))}
        </select>
        <select name="split" defaultValue="50" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
          <option value="50">50 / 50</option>
          <option value="70">70 / 30 (jij / andere ouder)</option>
          <option value="30">30 / 70</option>
          <option value="100">100 / 0</option>
          <option value="0">0 / 100</option>
        </select>
        <textarea name="notes" placeholder="Opmerkingen" className="min-h-20 rounded-2xl border border-[color:var(--nest-border)] p-3 md:col-span-2" />
        <button className="h-12 rounded-full bg-[color:var(--nest-ink)] text-white md:col-span-2">Opslaan</button>
      </form>

      <section className="space-y-3">
        {snapshot.expenses.filter((item) => !item.voidedAt).map((expense) => {
          const related = snapshot.splits.filter((split) => split.expenseId === expense.id);
          const other = related.find((split) => split.memberId === snapshot.currentMember.id && split.status === "pending" && expense.paidByMemberId !== snapshot.currentMember.id);
          return (
            <article key={expense.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">
                    {expenseCategoryLabel[expense.category]} · {expense.date}
                  </p>
                  <p className="text-lg font-medium">{expense.description}</p>
                  <p className="text-[color:var(--nest-muted)]">
                    {formatEuro(expense.amountCents)} · betaald door {memberLabel(snapshot.members, expense.paidByMemberId)}
                  </p>
                  <ul className="mt-2 text-sm text-[color:var(--nest-muted)]">
                    {related.map((split) => (
                      <li key={split.id}>
                        {memberLabel(snapshot.members, split.memberId)} {formatEuro(split.shareCents)} · {split.status === "pending" ? "openstaand" : "voldaan"}
                      </li>
                    ))}
                  </ul>
                </div>
                {other ? (
                  <form action={markSplitPaidAction}>
                    <input type="hidden" name="splitId" value={other.id} />
                    <button className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm">Betaald</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Terugkerend</h2>
        <form action={createRecurringExpenseAction} className="mb-4 grid gap-2 rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-4 md:grid-cols-2">
          <input name="description" required placeholder="Kinderopvang, sport, zakgeld…" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
          <input name="amount" required placeholder="Bedrag" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
          <select name="interval" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
            <option value="monthly">Maandelijks</option>
            <option value="quarterly">Per kwartaal</option>
            <option value="yearly">Jaarlijks</option>
            <option value="custom">Custom</option>
          </select>
          <input name="nextDueDate" type="date" required defaultValue={toISODate(new Date())} className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
          <select name="category" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
            {Object.entries(expenseCategoryLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="paidByMemberId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>{member.parentLabel}</option>
            ))}
          </select>
          <button className="h-12 rounded-full bg-[color:var(--nest-ink)] text-white md:col-span-2">Terugkerende kosten toevoegen</button>
        </form>
        <div className="space-y-3">
          {snapshot.recurringExpenses.filter((item) => item.active).map((item) => (
            <article key={item.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
              <p className="text-lg font-medium">{item.description}</p>
              <p className="text-sm text-[color:var(--nest-muted)]">
                {formatEuro(item.amountCents)} · {item.interval} · volgende {item.nextDueDate}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
