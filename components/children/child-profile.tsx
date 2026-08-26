"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { documentCategoryLabel, sizeFieldLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { childAge, nextEventForChild, nextHandoverForChild, parentName } from "@/lib/queries/family-view";
import { childPlace, nowImportant } from "@/lib/queries/child-life";
import { EmptyState } from "@/components/empty-state";
import { NeededList } from "@/components/children/needed-list";
import { createChildUpdateAction, updateChildSizesAction } from "@/lib/actions/life";
import type { Child, FamilySnapshot } from "@/lib/domain/types";
import { childRoutineOccurrences, childCompletedTasks, childCompletedRoutineOccurrences, occurrenceStatusLabel, routinesOnly } from "@/lib/queries/routines";
import { CompletedTasksSection } from "@/components/tasks/completed-tasks-section";
import { CompletedRoutineOccurrencesSection } from "@/components/routines/completed-routines-section";
import { weekdayLabel } from "@/lib/domain/labels";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overzicht", label: "Overzicht" },
  { id: "agenda", label: "Agenda" },
  { id: "nodig", label: "Nodig" },
  { id: "taken", label: "Taken & routines" },
  { id: "school", label: "School" },
  { id: "reizen", label: "Reizen" },
  { id: "informatie", label: "Informatie" },
  { id: "kosten", label: "Kosten" },
  { id: "documenten", label: "Documenten" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function ChildProfile({
  snapshot,
  child,
  initialTab,
}: {
  snapshot: FamilySnapshot;
  child: Child;
  initialTab?: string;
}) {
  const startTab = TABS.some((item) => item.id === initialTab) ? (initialTab as Tab) : "overzicht";
  const [tab, setTab] = useState<Tab>(startTab);
  if (initialTab && TABS.some((item) => item.id === initialTab) && tab !== initialTab) {
    setTab(initialTab as Tab);
  }
  const today = toISODate(new Date());
  const age = childAge(child);
  const place = childPlace(snapshot, child);
  const nextEvent = nextEventForChild(snapshot, child.id, today);
  const nextSwap = nextHandoverForChild(snapshot, child.id, today);
  const important = nowImportant(snapshot, child.id);
  const viewer = snapshot.currentMember.role === "viewer";
  const tabs = TABS.filter((item) => !(viewer && item.id === "kosten"));

  return (
    <div className="space-y-6">
      <Link href="/kinderen" className="text-sm text-[color:var(--famli-muted)]">
        ← Kinderen
      </Link>
      <header>
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full text-xl font-semibold text-white" style={{ background: child.color }}>
            {child.firstName.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{child.firstName}</h1>
            <p className="text-[color:var(--famli-muted)]">
              {age} jaar · {place.label}
            </p>
          </div>
        </div>
        {important.length ? (
          <section className="mt-4">
            <h2 className="mb-3 text-2xl font-semibold">Nu belangrijk</h2>
            <div className="space-y-2">
              {important.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[color:var(--famli-muted)]">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <div className="mt-4 grid gap-2">
          {nextEvent ? (
            <p>
              Volgende afspraak:{" "}
              <Link href={`/agenda?date=${nextEvent.startsAt.slice(0, 10)}&focus=${nextEvent.id}`} className="font-semibold">
                {nextEvent.title} · {nextEvent.allDay ? "hele dag" : formatTime(nextEvent.startsAt)}
              </Link>
            </p>
          ) : null}
          {nextSwap ? (
            <p>
              Volgende wissel:{" "}
              <Link href={`/agenda?date=${nextSwap.date}&view=wissels`} className="font-semibold">
                {formatDayLong(nextSwap.date)} · {nextSwap.time}
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm",
              tab === item.id ? "bg-[color:var(--famli-ink)] text-white" : "border border-[color:var(--famli-border)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overzicht" ? <Overview snapshot={snapshot} child={child} onOpenInfo={() => setTab("informatie")} /> : null}
      {tab === "agenda" ? <AgendaTab snapshot={snapshot} childId={child.id} today={today} /> : null}
      {tab === "nodig" ? <NeededTab snapshot={snapshot} childId={child.id} /> : null}
      {tab === "taken" ? <TasksRoutinesTab snapshot={snapshot} childId={child.id} today={today} /> : null}
      {tab === "school" ? <SchoolTab snapshot={snapshot} child={child} today={today} /> : null}
      {tab === "reizen" ? <TravelTab snapshot={snapshot} childId={child.id} today={today} /> : null}
      {tab === "informatie" ? <InfoTab snapshot={snapshot} child={child} /> : null}
      {tab === "kosten" && !viewer ? <CostsTab snapshot={snapshot} childId={child.id} /> : null}
      {tab === "documenten" ? <DocsTab snapshot={snapshot} childId={child.id} /> : null}
    </div>
  );
}

function Overview({
  snapshot,
  child,
  onOpenInfo,
}: {
  snapshot: FamilySnapshot;
  child: Child;
  onOpenInfo: () => void;
}) {
  const sizes = snapshot.sizes.find((item) => item.childId === child.id);
  const club = snapshot.clubs.find((item) => item.childId === child.id);
  const updates = snapshot.childUpdates.filter((item) => item.childId === child.id).slice(0, 3);

  return (
    <div className="space-y-4">
      {sizes ? (
        <button type="button" onClick={onOpenInfo} className="famli-card block w-full text-left">
          <p className="text-sm text-[color:var(--famli-muted)]">Maten</p>
          <p className="mt-1 font-medium">
            Kleding {sizes.clothing ?? "—"} · Schoenen {sizes.shoes ?? "—"}
          </p>
        </button>
      ) : null}
      {club ? (
        <div className="famli-card">
          <p className="text-sm text-[color:var(--famli-muted)]">{club.sport}</p>
          <p className="mt-1 font-medium">{club.training}</p>
          {club.gear.length ? <p className="mt-2 text-sm text-[color:var(--famli-muted)]">Benodigd: {club.gear.join(", ")}</p> : null}
        </div>
      ) : null}
      {updates.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Gedeeld</h2>
          <div className="space-y-2">
            {updates.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
                <p>{item.body}</p>
                <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
                  {parentName(snapshot, item.authorMemberId)} · {formatDayLong(item.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <ShareUpdate snapshot={snapshot} childId={child.id} />
    </div>
  );
}

function AgendaTab({ snapshot, childId, today }: { snapshot: FamilySnapshot; childId: string; today: string }) {
  const events = snapshot.events
    .filter((event) => !event.cancelledAt && event.startsAt.slice(0, 10) >= today && event.childIds.includes(childId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 16);
  return (
    <div className="space-y-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`}
          className="block rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3"
        >
          <p className="text-sm text-[color:var(--famli-muted)]">
            {formatDayLong(event.startsAt)} · {event.allDay ? "Hele dag" : formatTime(event.startsAt)}
          </p>
          <p className="font-medium">{event.title}</p>
          {event.dropoffMemberId || event.pickupMemberId ? (
            <p className="text-sm text-[color:var(--famli-muted)]">
              {event.dropoffMemberId ? `Brengen: ${parentName(snapshot, event.dropoffMemberId)}` : ""}
              {event.dropoffMemberId && event.pickupMemberId ? " · " : ""}
              {event.pickupMemberId ? `Halen: ${parentName(snapshot, event.pickupMemberId)}` : ""}
            </p>
          ) : null}
        </Link>
      ))}
      {!events.length ? <EmptyState title="Geen komende afspraken" /> : null}
    </div>
  );
}

function NeededTab({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const items = snapshot.neededItems.filter((item) => item.childId === childId);
  const gifts = items.filter((item) => item.category === "cadeau");
  const rest = items.filter((item) => item.category !== "cadeau");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-2xl font-semibold">Nodig</h2>
        <NeededList snapshot={snapshot} items={rest} childId={childId} />
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold">Cadeaus</h2>
        <p className="mb-3 text-sm text-[color:var(--famli-muted)]">Verlanglijst en cadeaus voor feestjes. Verborgen voor {snapshot.children.find((child) => child.id === childId)?.firstName}.</p>
        <NeededList snapshot={snapshot} items={gifts} childId={childId} giftsOnly />
      </section>
    </div>
  );
}

function SchoolTab({ snapshot, child, today }: { snapshot: FamilySnapshot; child: Child; today: string }) {
  const school = snapshot.schools.find((item) => item.childId === child.id);
  const club = snapshot.clubs.find((item) => item.childId === child.id);
  const coming = snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.childIds.includes(child.id) &&
        event.startsAt.slice(0, 10) >= today &&
        (event.category === "school" || event.schoolKind),
    )
    .filter((event) => event.title !== "School")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 8);
  const holiday = snapshot.vacations.find((item) => item.kind === "school" && item.endsOn >= today);

  return (
    <div className="space-y-4">
      <section className="famli-card space-y-2">
        <h2 className="text-xl font-semibold">{school?.name ?? child.school}</h2>
        <p>{school?.className ?? child.className}</p>
        {school?.teacher ? <p className="text-sm text-[color:var(--famli-muted)]">Leerkracht: {school.teacher}</p> : null}
        {school?.contact ? <p className="text-sm text-[color:var(--famli-muted)]">{school.contact}</p> : null}
        {school?.hours ? <p className="text-sm text-[color:var(--famli-muted)]">Tijden: {school.hours}</p> : null}
        {school?.gymDays ? <p className="text-sm text-[color:var(--famli-muted)]">Gym: {school.gymDays}</p> : null}
      </section>
      {club ? (
        <section className="famli-card space-y-1">
          <p className="text-sm text-[color:var(--famli-muted)]">Sport / club</p>
          <p className="text-lg font-medium">
            {club.sport} · {club.club}
            {club.team ? ` ${club.team}` : ""}
          </p>
          {club.training ? <p>Training: {club.training}</p> : null}
          {club.matchDay ? <p>Wedstrijd: {club.matchDay}</p> : null}
          {club.location ? <p className="text-sm text-[color:var(--famli-muted)]">{club.location}</p> : null}
          {club.trainer ? <p className="text-sm text-[color:var(--famli-muted)]">Trainer: {club.trainer}</p> : null}
          {club.gear.length ? <p className="text-sm text-[color:var(--famli-muted)]">Benodigd: {club.gear.join(", ")}</p> : null}
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Komend</h2>
        <div className="space-y-2">
          {coming.map((event) => (
            <Link key={event.id} href={`/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`} className="block rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
              <p className="font-medium">{event.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">
                {formatDayLong(event.startsAt)}
                {event.allDay ? "" : ` · ${formatTime(event.startsAt)}`}
              </p>
            </Link>
          ))}
        </div>
      </section>
      {holiday ? (
        <section className="famli-card">
          <p className="text-sm text-[color:var(--famli-muted)]">Schoolvakantie</p>
          <p className="mt-1 text-lg font-medium">{holiday.title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {formatDayLong(holiday.startsOn)} t/m {formatDayLong(holiday.endsOn)}
            {holiday.region ? ` · regio ${holiday.region}` : ""}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            {(holiday.stays ?? [])
              .filter((stay) => stay.childId === child.id)
              .map((stay) => (
                <p key={`${stay.from}-${stay.memberId}`}>
                  {format(new Date(`${stay.from}T12:00:00`), "d MMM", { locale: nl })}–
                  {format(new Date(`${stay.to}T12:00:00`), "d MMM", { locale: nl })} bij{" "}
                  {parentName(snapshot, stay.memberId).toLowerCase()}
                </p>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TravelTab({ snapshot, childId, today }: { snapshot: FamilySnapshot; childId: string; today: string }) {
  const plans = snapshot.travelPlans.filter((plan) => plan.childIds.includes(childId));
  if (!plans.length) return <EmptyState title="Nog geen reizen" body="Voeg een reis toe via + Toevoegen." />;
  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const segments = snapshot.travelSegments.filter((item) => item.travelPlanId === plan.id);
        const docs = snapshot.documents.filter((item) => item.travelPlanId === plan.id);
        const active = plan.startsOn <= today && plan.endsOn >= today;
        return (
          <article key={plan.id} className="famli-card space-y-2">
            {active ? <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-brand)]">Nu onderweg</p> : null}
            <h2 className="text-xl font-semibold">{plan.title}</h2>
            <p>
              {formatDayLong(plan.startsOn)} – {formatDayLong(plan.endsOn)}
            </p>
            <p>Met {parentName(snapshot, plan.withMemberId).toLowerCase()}</p>
            <p className="text-sm text-[color:var(--famli-muted)]">{plan.destination}</p>
            {plan.stayName ? (
              <p className="text-sm">
                {plan.stayName}
                {plan.stayAddress ? ` · ${plan.stayAddress}` : ""}
              </p>
            ) : null}
            {plan.stayContact ? <p className="text-sm text-[color:var(--famli-muted)]">{plan.stayContact}</p> : null}
            {plan.bookingRef ? <p className="text-sm text-[color:var(--famli-muted)]">Boeking {plan.bookingRef}</p> : null}
            {segments.map((segment) => (
              <div key={segment.id} className="rounded-2xl bg-[color:var(--famli-bg)] px-3 py-2 text-sm">
                <p className="font-medium">
                  {segment.kind === "outbound" ? "Heen" : segment.kind === "return" ? "Terug" : "Reis"} {segment.number}
                </p>
                <p className="text-[color:var(--famli-muted)]">
                  {segment.fromPlace} → {segment.toPlace}
                  {segment.departsAt ? ` · ${formatTime(segment.departsAt)}` : ""}
                </p>
              </div>
            ))}
            {plan.notes ? <p className="text-sm">{plan.notes}</p> : null}
            {docs.length ? (
              <ul className="text-sm text-[color:var(--famli-muted)]">
                {docs.map((doc) => (
                  <li key={doc.id}>{doc.title}</li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function InfoTab({ snapshot, child }: { snapshot: FamilySnapshot; child: Child }) {
  const sizes = snapshot.sizes.find((item) => item.childId === child.id);
  const history = snapshot.sizeHistory.filter((item) => item.childId === child.id);
  const [editing, setEditing] = useState(false);
  const sensitive = snapshot.currentMember.role !== "viewer";

  return (
    <div className="space-y-4">
      <section className="famli-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Maten</h2>
            {sizes?.updatedAt ? (
              <p className="text-sm text-[color:var(--famli-muted)]">
                Laatst bijgewerkt: {format(new Date(sizes.updatedAt), "d MMMM", { locale: nl })}
              </p>
            ) : null}
          </div>
          <button type="button" className="famli-btn famli-btn-secondary h-10 px-4" onClick={() => setEditing((value) => !value)}>
            Maten aanpassen
          </button>
        </div>
        {editing ? (
          <form
            className="grid gap-2 sm:grid-cols-2"
            action={async (formData) => {
              await updateChildSizesAction(formData);
              toast.success("Maten bijgewerkt");
              setEditing(false);
            }}
          >
            <input type="hidden" name="childId" value={child.id} />
            <SizeField name="clothing" label="Kledingmaat" defaultValue={sizes?.clothing ?? child.clothingSize} />
            <SizeField name="shoes" label="Schoenmaat" defaultValue={sizes?.shoes ?? child.shoeSize} />
            <SizeField name="jacket" label="Jasmaat" defaultValue={sizes?.jacket} />
            <SizeField name="trousers" label="Broekmaat" defaultValue={sizes?.trousers} />
            <SizeField name="sport" label="Sportkleding" defaultValue={sizes?.sport} />
            <SizeField name="helmet" label="Fietshelm" defaultValue={sizes?.helmet} />
            <label className="sm:col-span-2 text-sm text-[color:var(--famli-muted)]">
              Overige
              <input name="other" defaultValue={sizes?.other ?? ""} className="famli-input mt-1" />
            </label>
            <button className="famli-btn famli-btn-primary sm:col-span-2">Opslaan</button>
          </form>
        ) : (
          <dl className="grid gap-2 sm:grid-cols-2">
            <SizeLine label="Kleding" value={sizes?.clothing ?? child.clothingSize} />
            <SizeLine label="Schoenen" value={sizes?.shoes ?? child.shoeSize} />
            <SizeLine label="Sportkleding" value={sizes?.sport} />
            <SizeLine label="Jas" value={sizes?.jacket} />
            <SizeLine label="Broek" value={sizes?.trousers} />
            <SizeLine label="Fietshelm" value={sizes?.helmet} />
            <SizeLine label="Overig" value={sizes?.other} />
          </dl>
        )}
        {history.length ? (
          <div className="pt-2 text-sm text-[color:var(--famli-muted)]">
            {history.map((item) => (
              <p key={item.id}>
                {sizeFieldLabel[item.field] ?? item.field}: {item.fromValue} → {item.toValue}
              </p>
            ))}
          </div>
        ) : null}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Huisarts" value={child.doctor} />
        <InfoCard label="Tandarts" value={child.dentist} />
        <InfoCard label="Sport" value={child.sports.join(", ")} />
      </div>
      {sensitive && (child.passportExpiresOn || child.passportNumber) ? (
        <section className="famli-card space-y-1">
          <p className="text-sm text-[color:var(--famli-muted)]">Identiteit</p>
          {child.passportNumber ? <p>Paspoort {child.passportNumber}</p> : null}
          {child.passportExpiresOn ? <p className="text-sm">Geldig tot {formatDayLong(child.passportExpiresOn)}</p> : null}
        </section>
      ) : null}
      {child.emergencyContacts.map((contact) => (
        <div key={contact.phone} className="famli-card">
          <p className="text-sm text-[color:var(--famli-muted)]">{contact.relation}</p>
          <p className="font-medium">{contact.name}</p>
          <p className="text-sm">{contact.phone}</p>
        </div>
      ))}
    </div>
  );
}

function SizeField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <label className="text-sm text-[color:var(--famli-muted)]">
      {label}
      <input name={name} defaultValue={defaultValue ?? ""} className="famli-input mt-1" />
    </label>
  );
}

function SizeLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm text-[color:var(--famli-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function CostsTab({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const costs = snapshot.expenses.filter((item) => item.childId === childId && !item.voidedAt);
  if (!costs.length) return <EmptyState title="Nog geen kosten toegevoegd" actionHref="/kosten#toevoegen" actionLabel="Kosten toevoegen" />;
  return (
    <div className="space-y-2">
      {costs.map((expense) => (
        <Link key={expense.id} href={`/kosten?id=${expense.id}`} className="block rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
          {expense.description} · {formatEuro(expense.amountCents)}
        </Link>
      ))}
    </div>
  );
}

function DocsTab({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const docs = snapshot.documents.filter((item) => item.childId === childId);
  if (!docs.length) return <EmptyState title="Nog geen documenten" body="Belangrijke papieren komen hier te staan." />;
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <p key={doc.id} className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
          {doc.title} · {documentCategoryLabel[doc.category]}
          {doc.expiresOn ? ` · tot ${formatDayLong(doc.expiresOn)}` : ""}
        </p>
      ))}
    </div>
  );
}

function ShareUpdate({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const [open, setOpen] = useState(false);
  if (snapshot.currentMember.role === "viewer") return null;
  if (!open) {
    return (
      <button type="button" className="famli-btn famli-btn-secondary h-11 px-4" onClick={() => setOpen(true)}>
        Iets delen over {snapshot.children.find((child) => child.id === childId)?.firstName}
      </button>
    );
  }
  return (
    <form
      className="famli-card space-y-2"
      action={async (formData) => {
        await createChildUpdateAction(formData);
        toast.success("Update gedeeld");
        setOpen(false);
      }}
    >
      <input type="hidden" name="childId" value={childId} />
      <textarea name="body" required placeholder="Korte gezinsupdate" className="famli-input min-h-24" />
      <select name="category" className="famli-input">
        <option value="">Geen categorie</option>
        <option value="kleding">Kleding</option>
        <option value="school">School</option>
        <option value="sport">Sport</option>
        <option value="reizen">Reizen</option>
      </select>
      <div className="flex gap-2">
        <button className="famli-btn famli-btn-primary flex-1">Delen</button>
        <button type="button" className="famli-btn famli-btn-secondary" onClick={() => setOpen(false)}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

function TasksRoutinesTab({
  snapshot,
  childId,
  today,
}: {
  snapshot: FamilySnapshot;
  childId: string;
  today: string;
}) {
  const tasks = snapshot.tasks.filter((item) => item.kind === "one_off" && item.childId === childId && item.status !== "done");
  const completedTasks = childCompletedTasks(snapshot, childId);
  const routines = routinesOnly(snapshot).filter((item) => item.childId === childId);
  const occurrences = childRoutineOccurrences(snapshot, childId, today)
    .filter((item) => item.status === "pending" || item.status === "unregistered")
    .slice(0, 10);
  const completedOccurrences = childCompletedRoutineOccurrences(snapshot, childId);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-2xl font-semibold">Actief</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
              <p className="font-medium">{task.title}</p>
              {task.dueAt ? <p className="text-sm text-[color:var(--famli-muted)]">Voor {formatDayLong(task.dueAt)}</p> : null}
            </div>
          ))}
          {!tasks.length ? <p className="text-sm text-[color:var(--famli-muted)]">Geen open taken.</p> : null}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold">Komend</h2>
        <div className="space-y-2">
          {routines.map((routine) => (
            <div key={routine.id} className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
              <p className="font-medium">{routine.title}</p>
              <p className="text-sm text-[color:var(--famli-muted)]">
                {(routine.weekdays ?? []).map((day) => weekdayLabel[day]).join(", ")}
                {routine.times?.length ? ` · ${routine.times.join(", ")}` : ""}
              </p>
              {routine.kind === "care" ? (
                <p className="mt-1 text-sm text-[color:var(--famli-muted)]">{MEDICAL_DISCLAIMER}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {occurrences.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3">
              <p className="font-medium">
                {formatDayLong(item.date)} · {item.time}
              </p>
              <p className="text-sm text-[color:var(--famli-muted)]">{occurrenceStatusLabel(item.status)}</p>
            </div>
          ))}
          {!occurrences.length ? <p className="text-sm text-[color:var(--famli-muted)]">Geen komende momenten.</p> : null}
        </div>
      </section>
      <CompletedTasksSection snapshot={snapshot} tasks={completedTasks} />
      <CompletedRoutineOccurrencesSection snapshot={snapshot} occurrences={completedOccurrences} groupByDate />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="famli-card">
      <p className="text-sm text-[color:var(--famli-muted)]">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
