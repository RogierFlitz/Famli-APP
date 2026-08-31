import Link from "next/link";
import { formatDayLong, formatTime } from "@/lib/dates";
import { formatEuro } from "@/lib/money";
import { namedCostHeadline } from "@/lib/costs/stats";
import { bringHaalToday, nextAppointment, openChangeRequests } from "@/lib/queries/bring-haal";
import { myOpenDutiesToday } from "@/lib/queries/routines";
import type { FamilySnapshot } from "@/lib/domain/types";

function Card({
  title,
  href,
  children,
  action,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  action: string;
}) {
  return (
    <Link href={href} className="famli-card block space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">{title}</p>
      <div>{children}</div>
      <p className="text-sm font-medium text-[color:var(--famli-brand)]">{action}</p>
    </Link>
  );
}

export function VandaagHubCards({ snapshot }: { snapshot: FamilySnapshot }) {
  const next = nextAppointment(snapshot);
  const bring = bringHaalToday(snapshot);
  const duties = myOpenDutiesToday(snapshot);
  const requests = openChangeRequests(snapshot);
  const costs = namedCostHeadline(snapshot);

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {next ? (
        <Card title="Eerstvolgende afspraak" href={`/agenda?date=${next.startsAt.slice(0, 10)}&focus=${next.id}`} action="Open agenda">
          <p className="font-semibold">{next.title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {formatDayLong(next.startsAt)}
            {next.allDay ? "" : ` · ${formatTime(next.startsAt)}`}
          </p>
        </Card>
      ) : null}
      {bring[0] ? (
        <Card title="Brengen & halen" href={bring[0].href} action="Wijzigen">
          <p className="font-semibold">
            {bring[0].title} · {bring[0].time}
          </p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {bring[0].bringLabel} · {bring[0].haulLabel}
          </p>
        </Card>
      ) : null}
      {duties[0] ? (
        <Card title="Openstaande taken" href="/regelen?tab=voor-jou" action="Naar Regelen">
          <p className="font-semibold">{duties[0].title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {duties.length === 1 ? "1 open taak" : `${duties.length} open taken`}
          </p>
        </Card>
      ) : null}
      {requests[0] ? (
        <Card title="Wisselverzoeken" href="/regelen?tab=verzoeken" action="Bekijk verzoeken">
          <p className="font-semibold">{requests.length === 1 ? "1 verzoek wacht" : `${requests.length} verzoeken`}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">In afwachting van de andere ouder.</p>
        </Card>
      ) : null}
      {costs.net !== 0 ? (
        <Card title="Openstaande kosten" href="/kosten" action="Naar Kosten">
          <p className="font-semibold">{costs.title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">{formatEuro(Math.abs(costs.net))} open</p>
        </Card>
      ) : null}
    </section>
  );
}
