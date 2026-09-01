"use client";

import { toast } from "sonner";
import { childActivityKindLabel, weekdayLabel } from "@/lib/domain/labels";
import { parentName } from "@/lib/queries/family-view";
import { addChildActivityAction } from "@/lib/actions/family-hub";
import { EmptyState } from "@/components/empty-state";
import type { FamilySnapshot } from "@/lib/domain/types";

export function ChildActivitiesPanel({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const activities = (snapshot.childActivities ?? []).filter((item) => item.childId === childId && item.active);
  return (
    <div className="space-y-4">
      {activities.length ? (
        activities.map((item) => (
          <article key={item.id} className="famli-card space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
              {childActivityKindLabel[item.kind]} · {weekdayLabel[item.weekday]} {item.startTime}
            </p>
            <p className="text-lg font-medium">{item.title}</p>
            {item.location ? <p className="text-sm text-[color:var(--famli-muted)]">{item.location}</p> : null}
            <p className="text-sm">
              Brengen: {item.bringMemberId ? parentName(snapshot, item.bringMemberId) : "nog open"}
            </p>
            <p className="text-sm">
              Halen: {item.pickupMemberId ? parentName(snapshot, item.pickupMemberId) : "nog open"}
            </p>
          </article>
        ))
      ) : (
        <EmptyState title="Nog geen activiteiten" body="Voeg zwemles, sport of opvang toe. Ze komen ook in de agenda." />
      )}
      <form
        className="famli-card space-y-3"
        action={async (formData) => {
          try {
            await addChildActivityAction(formData);
            toast.success("Activiteit toegevoegd");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
          }
        }}
      >
        <h3 className="font-semibold">Activiteit toevoegen</h3>
        <input type="hidden" name="childId" value={childId} />
        <label className="block text-sm">
          Titel
          <input name="title" required className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Soort
          <select name="kind" className="famli-input mt-1" defaultValue="overig">
            {Object.entries(childActivityKindLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Locatie
          <input name="location" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Dag
          <select name="weekday" className="famli-input mt-1" defaultValue="2">
            {Object.entries(weekdayLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            Van
            <input name="startTime" type="time" defaultValue="17:00" className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            Tot
            <input name="endTime" type="time" defaultValue="18:00" className="famli-input mt-1" />
          </label>
        </div>
        <label className="block text-sm">
          Wie brengt?
          <select name="bringMemberId" className="famli-input mt-1" defaultValue={snapshot.currentMember.id}>
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>
                {parentName(snapshot, member.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Wie haalt?
          <select name="pickupMemberId" className="famli-input mt-1">
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>
                {parentName(snapshot, member.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Wie blijft erbij? (optioneel)
          <select name="stayMemberId" className="famli-input mt-1" defaultValue="">
            <option value="">Niet nodig</option>
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>
                {parentName(snapshot, member.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Contactpersoon
          <input name="contactName" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Opmerking
          <textarea name="notes" className="famli-input mt-1" />
        </label>
        <button className="famli-btn famli-btn-primary">Opslaan</button>
      </form>
    </div>
  );
}
