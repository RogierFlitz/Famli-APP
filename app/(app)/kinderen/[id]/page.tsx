import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSnapshot } from "@/lib/auth/session";
import { formatEuro } from "@/lib/money";
import { documentCategoryLabel } from "@/lib/domain/labels";
import { timelineForDate } from "@/lib/calendar/timeline";
import { toISODate } from "@/lib/dates";

export default async function ChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshot = await requireSnapshot();
  const child = snapshot.children.find((item) => item.id === id);
  if (!child) notFound();
  const todayItems = timelineForDate(snapshot, toISODate(new Date())).filter(
    (item) => !item.event || item.event.childIds.includes(child.id) || item.kind === "handover" || item.kind === "custody",
  );
  const docs = snapshot.documents.filter((item) => item.childId === child.id);
  const costs = snapshot.expenses.filter((item) => item.childId === child.id && !item.voidedAt);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/kinderen" className="text-sm text-[color:var(--nest-muted)]">
          ← Kinderen
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">{child.firstName}</h1>
        <p className="text-[color:var(--nest-muted)]">{child.school} · {child.className}</p>
      </header>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Overzicht</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Item label="Huisarts" value={child.doctor} />
          <Item label="Tandarts" value={child.dentist} />
          <Item label="Opvang" value={child.daycare} />
          <Item label="Sport" value={child.sports.join(", ")} />
          <Item label="Kledingmaat" value={child.clothingSize} />
          <Item label="Schoenmaat" value={child.shoeSize} />
        </dl>
        {child.notes ? <p className="mt-4 text-sm">{child.notes}</p> : null}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Agenda</h2>
        <div className="space-y-2">
          {todayItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] px-4 py-3">
              <p className="text-sm text-[color:var(--nest-muted)]">{item.time ?? "Vandaag"}</p>
              <p className="font-medium">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Contacten</h2>
        <div className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
          {child.emergencyContacts.map((contact) => (
            <p key={contact.phone}>
              {contact.name} · {contact.relation} · {contact.phone}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Documenten</h2>
        {docs.map((doc) => (
          <p key={doc.id} className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] px-4 py-3">
            {doc.title} · {documentCategoryLabel[doc.category]}
          </p>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Kosten</h2>
        {costs.map((expense) => (
          <p key={expense.id} className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] px-4 py-3">
            {expense.description} · {formatEuro(expense.amountCents)}
          </p>
        ))}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[color:var(--nest-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
