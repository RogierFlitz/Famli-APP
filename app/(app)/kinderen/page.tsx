import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { toISODate } from "@/lib/dates";
import { nextEventForChild, nextHandoverForChild } from "@/lib/queries/family-view";
import { childPlace } from "@/lib/queries/child-life";
import { formatTime } from "@/lib/dates";

export default async function ChildrenPage() {
  const snapshot = await requireSnapshot();
  const today = toISODate(new Date());

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Kinderen</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {snapshot.children.map((child) => {
          const nextEvent = nextEventForChild(snapshot, child.id, today);
          const nextHandover = nextHandoverForChild(snapshot, child.id, today);
          const place = childPlace(snapshot, child);
          return (
            <article key={child.id} className="famli-card">
              <div
                className="mb-4 grid size-14 place-items-center rounded-full text-lg font-semibold text-white"
                style={{ background: child.color }}
              >
                {child.firstName.slice(0, 1)}
              </div>
              <h2 className="text-2xl font-semibold">{child.firstName}</h2>
              <p className="mt-2 text-sm">Vandaag: <strong>{place.label}</strong></p>
              {nextEvent ? (
                <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
                  Volgende afspraak: {nextEvent.title} · {nextEvent.allDay ? "hele dag" : formatTime(nextEvent.startsAt)}
                </p>
              ) : null}
              {nextHandover ? (
                <p className="text-sm text-[color:var(--famli-muted)]">
                  Volgende wissel: {nextHandover.date.slice(8, 10)} {monthLabel(nextHandover.date)} · {nextHandover.time}
                </p>
              ) : null}
              <Link href={`/kinderen/${child.id}`} className="famli-btn famli-btn-secondary mt-4 h-11 px-4">
                Bekijk profiel
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function monthLabel(iso: string) {
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return months[Number(iso.slice(5, 7)) - 1];
}
