import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { differenceInYears } from "date-fns";
import { parseISO } from "date-fns";

export default async function ChildrenPage() {
  const snapshot = await requireSnapshot();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Kinderen</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {snapshot.children.map((child) => (
          <Link
            key={child.id}
            href={`/kinderen/${child.id}`}
            className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-6"
          >
            <div className="mb-4 grid size-14 place-items-center rounded-full text-white" style={{ background: child.color }}>
              {child.firstName.slice(0, 1)}
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{child.firstName}</h2>
            <p className="text-sm text-[color:var(--nest-muted)]">
              {differenceInYears(new Date(), parseISO(child.dateOfBirth))} jaar · {child.school}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
