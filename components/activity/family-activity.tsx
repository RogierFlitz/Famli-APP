import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { FamilyActivityItem } from "@/lib/queries/activity-feed";

export function FamilyActivity({ items }: { items: FamilyActivityItem[] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="famli-section-title">Wat is er veranderd?</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-11 items-baseline justify-between gap-3 rounded-2xl px-1 py-2 hover:bg-[color:var(--famli-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--famli-brand)]"
            >
              <span className="text-sm text-[color:var(--famli-ink)]">{item.text}</span>
              <span className="shrink-0 text-xs text-[color:var(--famli-muted)]">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: nl })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
