"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveSheet } from "@/components/layout/responsive-sheet";
import { createEventAction, createHandoverAction } from "@/lib/actions/calendar";
import { createExpenseAction, createTaskAction } from "@/lib/actions/family";
import {
  createChildUpdateAction,
  createNeededAction,
  createPartyAction,
  createSchoolMomentAction,
  createTravelAction,
} from "@/lib/actions/life";
import { toISODate } from "@/lib/dates";
import { eventCategoryLabel, expenseCategoryLabel, EXPENSE_FORM_CATEGORIES, neededCategoryLabel, weekdayLabel } from "@/lib/domain/labels";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot } from "@/lib/domain/types";
import { createRoutineAction } from "@/lib/actions/routines";
import { cn } from "@/lib/utils";
import { ProposeChangeForm } from "@/components/requests/propose-form";
import { ImportShell } from "@/components/import/import-shell";

type Kind =
  | "menu"
  | "event"
  | "handover"
  | "party"
  | "travel"
  | "task"
  | "routine"
  | "needed"
  | "expense"
  | "request"
  | "school"
  | "update"
  | "import"
  | "shopping"
  | "document";

const GROUPS: { title: string; items: { id: Exclude<Kind, "menu">; label: string }[] }[] = [
  {
    title: "Snel",
    items: [
      { id: "event", label: "Afspraak" },
      { id: "task", label: "Taak" },
      { id: "shopping", label: "Boodschap" },
      { id: "expense", label: "Kosten" },
      { id: "needed", label: "Niet vergeten" },
      { id: "document", label: "Document" },
      { id: "update", label: "Notitie" },
    ],
  },
  {
    title: "Plannen",
    items: [
      { id: "event", label: "Afspraak" },
      { id: "handover", label: "Wisselmoment" },
      { id: "party", label: "Kinderfeestje" },
      { id: "travel", label: "Reis" },
      { id: "school", label: "Schoolmoment" },
      { id: "import", label: "Importeren (uitnodiging)" },
    ],
  },
  {
    title: "Regelen",
    items: [
      { id: "task", label: "Taak" },
      { id: "routine", label: "Routine of zorg" },
      { id: "needed", label: "Iets nodig" },
      { id: "expense", label: "Kosten" },
      { id: "request", label: "Verzoek" },
    ],
  },
  {
    title: "Delen",
    items: [{ id: "update", label: "Update" }],
  },
];

export function AddMenu({ snapshot, compact = false }: { snapshot: FamilySnapshot; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("menu");
  const router = useRouter();
  const today = toISODate(new Date());
  const other = snapshot.members.find((member) => member.id !== snapshot.currentMember.id);

  function close() {
    setOpen(false);
    setKind("menu");
  }

  const titles: Record<Kind, string> = {
    menu: "Toevoegen",
    event: "Afspraak toevoegen",
    handover: "Wisselmoment",
    party: "Kinderfeestje",
    travel: "Reis",
    task: "Taak toevoegen",
    routine: "Routine of zorg",
    needed: "Iets nodig",
    expense: "Kosten toevoegen",
    request: "Verzoek sturen",
    school: "Schoolmoment",
    update: "Update delen",
    import: "Slim importeren",
    shopping: "Boodschap",
    document: "Document",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "famli-btn famli-btn-primary hidden h-11 px-4 lg:inline-flex"
            : "fixed right-4 z-50 grid size-14 place-items-center rounded-full bg-[color:var(--famli-brand)] text-white shadow-[0_12px_30px_-18px_rgba(37,99,235,0.9)] lg:hidden",
          !compact && "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
        aria-label="Toevoegen"
      >
        {compact ? (
          "+ Toevoegen"
        ) : (
          <>
            <Plus className="size-6" />
            <span className="sr-only">Toevoegen</span>
          </>
        )}
      </button>
      <ResponsiveSheet open={open} onOpenChange={(value) => (value ? setOpen(true) : close())} title={titles[kind]}>
        {kind === "menu" ? (
          <div className="space-y-5">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">{group.title}</p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === "shopping") {
                          close();
                          router.push("/boodschappen");
                          return;
                        }
                        if (item.id === "document") {
                          close();
                          router.push("/documenten");
                          return;
                        }
                        setKind(item.id);
                      }}
                      className="flex h-12 w-full items-center rounded-2xl border border-[color:var(--famli-border)] px-4 text-left font-medium"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {kind === "event" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createEventAction(formData);
              toast.success("Afspraak toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Titel" className="famli-input" />
            <input name="date" type="date" required defaultValue={today} className="famli-input" />
            <div className="grid grid-cols-2 gap-2">
              <input name="start" type="time" defaultValue="18:00" className="famli-input" />
              <input name="end" type="time" defaultValue="19:00" className="famli-input" />
            </div>
            <select name="category" className="famli-input">
              {Object.entries(eventCategoryLabel)
                .filter(([value]) => value !== "overdracht")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
            {snapshot.children.map((child) => (
              <label key={child.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="childIds" value={child.id} defaultChecked />
                {child.firstName}
              </label>
            ))}
            <input name="location" placeholder="Locatie" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "handover" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createHandoverAction(formData);
              toast.success("Wisselmoment toegevoegd");
              close();
            }}
          >
            <input name="date" type="date" required defaultValue={today} className="famli-input" />
            <input name="time" type="time" defaultValue="17:00" className="famli-input" />
            <select name="fromMemberId" defaultValue={snapshot.currentMember.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  Van {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <select name="toMemberId" defaultValue={other?.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  Naar {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <input name="location" defaultValue="School" className="famli-input" />
            <input name="packingList" placeholder="Meenemen, kommagescheiden" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "party" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createPartyAction(formData);
              toast.success("Kinderfeestje toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Kinderfeestje Mila" className="famli-input" />
            <input name="hostName" required placeholder="Jarige" className="famli-input" />
            <select name="childId" className="famli-input" defaultValue={snapshot.children[0]?.id}>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  Voor {child.firstName}
                </option>
              ))}
            </select>
            <input name="date" type="date" required defaultValue={today} className="famli-input" />
            <div className="grid grid-cols-2 gap-2">
              <input name="start" type="time" defaultValue="14:00" className="famli-input" />
              <input name="end" type="time" defaultValue="17:00" className="famli-input" />
            </div>
            <input name="location" placeholder="Locatie" className="famli-input" />
            <input name="address" placeholder="Adres" className="famli-input" />
            <select name="dropoffMemberId" defaultValue={snapshot.currentMember.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  Wie brengt: {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <select name="pickupMemberId" defaultValue={other?.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  Wie haalt: {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <input name="giftBudget" placeholder="Budget cadeau" inputMode="decimal" className="famli-input" />
            <input name="contact" placeholder="Contact ouder" className="famli-input" />
            <textarea name="notes" placeholder="Opmerking" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "school" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createSchoolMomentAction(formData);
              toast.success("Schoolmoment toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Studiedag" className="famli-input" />
            <select name="schoolKind" className="famli-input" defaultValue="studiedag">
              <option value="studiedag">Studiedag</option>
              <option value="schoolreis">Schoolreisje</option>
              <option value="ouderavond">Ouderavond</option>
              <option value="rapport">Rapportgesprek</option>
              <option value="schoolactiviteit">Schoolactiviteit</option>
            </select>
            <input name="date" type="date" required defaultValue={today} className="famli-input" />
            {snapshot.children.map((child) => (
              <label key={child.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="childIds" value={child.id} defaultChecked />
                {child.firstName}
              </label>
            ))}
            <input name="location" placeholder="Locatie" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "travel" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createTravelAction(formData);
              toast.success("Reis toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Vakantie Spanje" className="famli-input" />
            <input name="destination" required placeholder="Bestemming" className="famli-input" />
            <div className="grid grid-cols-2 gap-2">
              <input name="startsOn" type="date" required className="famli-input" />
              <input name="endsOn" type="date" required className="famli-input" />
            </div>
            <select name="withMemberId" defaultValue={snapshot.currentMember.id} className="famli-input">
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  Met {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            {snapshot.children.map((child) => (
              <label key={child.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="childIds" value={child.id} defaultChecked />
                {child.firstName}
              </label>
            ))}
            <input name="transport" placeholder="Vervoer" className="famli-input" />
            <input name="stayName" placeholder="Verblijf" className="famli-input" />
            <input name="stayAddress" placeholder="Adres" className="famli-input" />
            <input name="outboundNumber" placeholder="Vlucht/trein heen" className="famli-input" />
            <input name="returnNumber" placeholder="Vlucht/trein terug" className="famli-input" />
            <textarea name="notes" placeholder="Notities" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "task" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createTaskAction(formData);
              toast.success("Taak toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Titel" className="famli-input" />
            <select name="childId" className="famli-input">
              <option value="">Geen kind</option>
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
            <textarea name="description" placeholder="Optionele notitie" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "routine" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createRoutineAction(formData);
              toast.success("Routine toegevoegd");
              close();
            }}
          >
            <input name="title" required placeholder="Gymtas mee" className="famli-input" />
            <select name="kind" className="famli-input" defaultValue="routine">
              <option value="routine">Routine</option>
              <option value="care">Zorg / medicatie</option>
            </select>
            <select name="childId" className="famli-input" defaultValue={snapshot.children[0]?.id}>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName}
                </option>
              ))}
            </select>
            <input name="times" placeholder="Tijden, bv. 08:00, 20:00" defaultValue="08:00" className="famli-input" />
            <select name="assignMode" className="famli-input" defaultValue="stay">
              <option value="stay">Volgt verblijf</option>
              <option value="fixed">Vaste persoon</option>
            </select>
            <input name="packingItems" placeholder="Meenemen" className="famli-input" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(weekdayLabel).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="weekdays" value={value} defaultChecked={["3", "4", "5", "6"].includes(value)} />
                  {label}
                </label>
              ))}
            </div>
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "needed" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createNeededAction(formData);
              toast.success("Toegevoegd aan Nodig");
              close();
            }}
          >
            <input name="title" required placeholder="Nieuwe gymschoenen" className="famli-input" />
            <select name="category" className="famli-input" defaultValue="kleding">
              {Object.entries(neededCategoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="childId" className="famli-input" defaultValue={snapshot.children[0]?.id}>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName}
                </option>
              ))}
            </select>
            <input name="size" placeholder="Maat" className="famli-input" />
            <input name="dueOn" type="date" className="famli-input" />
            <input name="budget" placeholder="Budget" inputMode="decimal" className="famli-input" />
            <select name="assigneeMemberId" className="famli-input">
              <option value="">Nog niemand</option>
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <textarea name="notes" placeholder="Notitie" className="famli-input" />
            <button className="famli-btn famli-btn-primary w-full">Opslaan</button>
          </form>
        ) : null}

        {kind === "expense" ? <ExpenseForm snapshot={snapshot} onDone={close} /> : null}

        {kind === "request" ? <ProposeChangeForm snapshot={snapshot} onDone={close} /> : null}

        {kind === "import" ? <ImportShell compact /> : null}

        {kind === "update" ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              await createChildUpdateAction(formData);
              toast.success("Update gedeeld");
              close();
            }}
          >
            <select name="childId" className="famli-input" defaultValue={snapshot.children[0]?.id}>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  Over {child.firstName}
                </option>
              ))}
            </select>
            <textarea name="body" required placeholder="Korte gezinsupdate" className="famli-input min-h-24" />
            <select name="category" className="famli-input">
              <option value="">Geen categorie</option>
              <option value="kleding">Kleding</option>
              <option value="school">School</option>
              <option value="sport">Sport</option>
            </select>
            <button className="famli-btn famli-btn-primary w-full">Delen</button>
          </form>
        ) : null}
      </ResponsiveSheet>
    </>
  );
}

export function ExpenseForm({ snapshot, onDone }: { snapshot: FamilySnapshot; onDone?: () => void }) {
  const today = toISODate(new Date());
  const [split, setSplit] = useState("50");
  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        await createExpenseAction(formData);
        toast.success("Kosten gedeeld");
        onDone?.();
      }}
    >
      <label className="block text-sm">
        Omschrijving
        <input name="description" required className="famli-input mt-1" />
      </label>
      <label className="block text-sm">
        Bedrag
        <input name="amount" required inputMode="decimal" className="famli-input mt-1" />
      </label>
      <label className="block text-sm">
        Datum
        <input name="date" type="date" required defaultValue={today} className="famli-input mt-1" />
      </label>
      <label className="block text-sm">
        Voor welk kind?
        <select name="childId" className="famli-input mt-1" defaultValue="">
          <option value="">Alle kinderen</option>
          {snapshot.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.firstName}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Categorie
        <select name="category" className="famli-input mt-1" defaultValue="overig">
          {EXPENSE_FORM_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {expenseCategoryLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Betaald door
        <select name="paidByMemberId" defaultValue={snapshot.currentMember.id} className="famli-input mt-1">
          {snapshot.members.map((member) => (
            <option key={member.id} value={member.id}>
              {parentName(snapshot, member.id)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Verdeling
        <select name="split" value={split} onChange={(event) => setSplit(event.target.value)} className="famli-input mt-1">
          <option value="50">50 / 50</option>
          <option value="70">70 / 30</option>
          <option value="60">60 / 40</option>
          <option value="custom">Zelf instellen</option>
        </select>
      </label>
      {split === "custom" ? (
        <label className="block text-sm">
          Jouw aandeel (%)
          <input name="customPercent" type="number" min={0} max={100} defaultValue={50} className="famli-input mt-1" />
        </label>
      ) : null}
      <label className="block text-sm">
        Bon of foto
        <input name="receipt" type="file" accept="image/*,.pdf" className="famli-input mt-1 pt-3 text-sm" />
      </label>
      <label className="block text-sm">
        Opmerking (optioneel)
        <textarea name="notes" className="famli-input mt-1" />
      </label>
      <button className="famli-btn famli-btn-primary w-full">Kosten delen</button>
    </form>
  );
}
