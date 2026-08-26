import Link from "next/link";

import { requireSnapshot } from "@/lib/auth/session";

import { greetingForHour } from "@/lib/domain/labels";

import { formatDayLong, toISODate } from "@/lib/dates";

import { nextHandover, parentName, urgentActions } from "@/lib/queries/family-view";

import { childPlace, forgetNot, neededHeadline } from "@/lib/queries/child-life";

import { myOpenDutiesToday, myCompletedDutiesToday } from "@/lib/queries/routines";

import { canAcceptChangeRequests } from "@/lib/members/permissions";

import { handoverIsSoon } from "@/lib/queries/handover";

import { allSettledMessage, childDaySections } from "@/lib/queries/vandaag";

import { eventResponsibilityLines } from "@/lib/queries/responsibility";

import { AddMenu } from "@/components/compose/add-menu";

import { ChangeReviewCard } from "@/components/requests/change-review";

import { EmptyState } from "@/components/empty-state";

import { SmartHandover } from "@/components/handover/smart-handover";

import { OpenDutyCard, CompletedDutyCard } from "@/components/completion/duty-cards";



export default async function TodayPage() {

  const snapshot = await requireSnapshot();

  const now = new Date();

  const today = toISODate(now);

  const actions = urgentActions(snapshot, now);

  const next = nextHandover(snapshot, today);

  const showHandover = next && handoverIsSoon(next, today);

  const incoming = canAcceptChangeRequests(snapshot)

    ? snapshot.changeRequests.filter(

        (item) => item.status === "pending" && item.requestedByMemberId !== snapshot.currentMember.id,

      )

    : [];

  const remember = forgetNot(snapshot, now).slice(0, 5);

  const duties = myOpenDutiesToday(snapshot, now);

  const completedDuties = myCompletedDutiesToday(snapshot, now);

  const childSections = childDaySections(snapshot, today);

  const settled = allSettledMessage(snapshot, now);

  const attentionActions = actions.filter((item) => item.kind !== "change");



  return (

    <div className="space-y-8">

      <header className="flex items-start justify-between gap-3">

        <div>

          <p className="text-sm text-[color:var(--famli-muted)]">{formatDayLong(now)}</p>

          <h1 className="mt-1 text-4xl font-semibold tracking-tight">

            {greetingForHour(now.getHours())}, {snapshot.currentProfile.firstName}

          </h1>

          <p className="mt-2 text-sm text-[color:var(--famli-muted)]">

            Famli onthoudt het, zodat jij het niet hoeft te onthouden.

          </p>

        </div>

        <div className="hidden lg:block">

          <AddMenu snapshot={snapshot} compact />

        </div>

      </header>



      <section>

        <h2 className="mb-3 text-2xl font-semibold">Waar zijn ze?</h2>

        <div className="grid gap-2">

          {snapshot.children.map((child) => {

            const place = childPlace(snapshot, child, now);

            const travel = snapshot.travelPlans.find(

              (plan) => plan.childIds.includes(child.id) && plan.startsOn <= today && plan.endsOn >= today,

            );

            return (

              <Link

                key={child.id}

                href={place.href}

                className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"

              >

                <p className="text-sm text-[color:var(--famli-muted)]">{child.firstName}</p>

                <p className="text-lg font-semibold">Nu: {place.label}</p>

                {place.nextLabel && place.nextTime ? (

                  <p className="text-sm text-[color:var(--famli-muted)]">

                    Vanaf {place.nextTime}: {place.nextLabel}

                  </p>

                ) : place.detail ? (

                  <p className="text-sm text-[color:var(--famli-muted)]">{place.detail}</p>

                ) : null}

                {travel ? (

                  <p className="mt-2 text-sm font-medium text-[color:var(--famli-brand)]">Bekijk reisgegevens</p>

                ) : null}

              </Link>

            );

          })}

        </div>

      </section>



      {showHandover && next ? <SmartHandover snapshot={snapshot} handover={next} /> : null}



      <section>

        <h2 className="mb-3 text-2xl font-semibold">Vandaag</h2>

        <div className="space-y-4">

          {childSections.map((section) => (

            <div key={section.childId}>

              <h3 className="mb-2 text-lg font-semibold">

                {section.childName} — {section.custodyLabel}

              </h3>

              {section.entries.length ? (

                <div className="space-y-2">

                  {section.entries.map((entry) => (

                    <Link

                      key={entry.id}

                      href={entry.href}

                      className="flex gap-4 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-3"

                    >

                      <span className="w-12 shrink-0 text-sm text-[color:var(--famli-muted)]">

                        {entry.time ?? "Dag"}

                      </span>

                      <div className="min-w-0">

                        <p className="font-medium">{entry.title}</p>

                        {entry.subtitle ? (

                          <p className="text-sm text-[color:var(--famli-muted)]">{entry.subtitle}</p>

                        ) : null}

                        {entry.event ? (

                          <p className="mt-0.5 text-sm text-[color:var(--famli-muted)]">

                            {eventResponsibilityLines(snapshot, entry.event).join(" · ")}

                          </p>

                        ) : null}

                      </div>

                    </Link>

                  ))}

                </div>

              ) : (

                <p className="text-sm text-[color:var(--famli-muted)]">Geen afspraken vandaag.</p>

              )}

            </div>

          ))}

          {!childSections.length ? (

            <EmptyState title="Een rustige dag" body="Geen afspraken of wissels voor vandaag." />

          ) : null}

        </div>

      </section>



      <section>

        <h2 className="mb-3 text-2xl font-semibold">Voor jou vandaag</h2>

        {duties.length ? (

          <div className="space-y-2">

            {duties.map((item) => (

              <OpenDutyCard key={item.id} item={item} />

            ))}

          </div>

        ) : (

          <p className="text-sm text-[color:var(--famli-muted)]">Niets specifiek voor jou vandaag.</p>

        )}

      </section>



      {(incoming.length || remember.length) ? (

        <section>

          <div className="mb-3 flex items-end justify-between">

            <h2 className="text-2xl font-semibold">Niet vergeten</h2>

            <Link href="/regelen?tab=nodig" className="text-sm font-medium text-[color:var(--famli-brand)]">

              Bekijk alles

            </Link>

          </div>

          {incoming.length ? (

            <div className="mb-3 space-y-3">

              {incoming.slice(0, 1).map((request) => (

                <ChangeReviewCard key={request.id} snapshot={snapshot} request={request} />

              ))}

            </div>

          ) : null}

          <div className="space-y-2">

            {remember.map((item) => {

              const child = snapshot.children.find((row) => row.id === item.childId);

              return (

                <Link

                  key={item.id}

                  href={`/kinderen/${item.childId}?tab=nodig`}

                  className="block rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4"

                >

                  <p className="font-medium">{item.title}</p>

                  <p className="text-sm text-[color:var(--famli-muted)]">

                    {[child?.firstName, item.size ? `maat ${item.size}` : null].filter(Boolean).join(" · ")}

                  </p>

                  <p className="mt-1 text-sm">{neededHeadline(item, snapshot)}</p>

                </Link>

              );

            })}

          </div>

        </section>

      ) : null}



      <section

        className={`rounded-3xl border px-5 py-4 ${

          settled.ok

            ? "border-[color:var(--famli-border)] bg-[color:var(--famli-card)]"

            : "border-[color:var(--famli-brand)]/25 bg-[color:var(--famli-brand-soft)]/30"

        }`}

      >

        <h2 className="text-lg font-semibold">Alles geregeld</h2>

        <p className="mt-1 text-[color:var(--famli-muted)]">{settled.message}</p>

        {!settled.ok && attentionActions.length ? (

          <ul className="mt-3 space-y-2">

            {attentionActions.slice(0, 3).map((item) => (

              <li key={item.id}>

                <Link href={item.href} className="flex items-center justify-between gap-3 text-sm">

                  <span>{item.title}</span>

                  <span className="font-medium text-[color:var(--famli-brand)]">{item.cta}</span>

                </Link>

              </li>

            ))}

          </ul>

        ) : null}

      </section>



      {completedDuties.length ? (

        <section>

          <h2 className="mb-3 text-2xl font-semibold text-[color:var(--famli-muted)]">Afgerond vandaag</h2>

          <div className="space-y-2">

            {completedDuties.map((item) => (

              <CompletedDutyCard key={item.id} item={item} />

            ))}

          </div>

        </section>

      ) : null}



      {next && !showHandover ? (

        <section className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">

          <p className="text-sm text-[color:var(--famli-muted)]">Volgende wissel</p>

          <p className="mt-1 font-medium">

            {formatDayLong(next.date)} · {next.time} · {parentName(snapshot, next.fromMemberId)} →{" "}

            {parentName(snapshot, next.toMemberId)}

          </p>

          <Link href={`/agenda?date=${next.date}&view=wissels`} className="mt-2 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">

            Bekijk overdracht →

          </Link>

        </section>

      ) : null}

    </div>

  );

}


