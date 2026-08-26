"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createChangeRequestAction } from "@/lib/actions/calendar";
import { changeRequestLabel } from "@/lib/domain/labels";
import { occurrenceOn, parentName } from "@/lib/queries/family-view";
import type { ChangeRequestType, FamilySnapshot } from "@/lib/domain/types";
import { formatDayLong } from "@/lib/dates";

const TYPES: ChangeRequestType[] = ["swap_day", "extra_day", "pickup", "pickup_time", "location", "other"];

export function ProposeChangeForm({
  snapshot,
  date,
  onDone,
}: {
  snapshot: FamilySnapshot;
  date: string;
  onDone?: () => void;
}) {
  const [type, setType] = useState<ChangeRequestType>("swap_day");
  const current = occurrenceOn(snapshot, date);
  const other = snapshot.members.find((member) => member.id !== snapshot.currentMember.id);
  const proposedDefault =
    type === "swap_day" || type === "extra_day" ? snapshot.currentMember.id : (current?.custodianMemberId ?? snapshot.currentMember.id);

  async function action(formData: FormData) {
    await createChangeRequestAction(formData);
    toast.success("Voorstel verstuurd");
    onDone?.();
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="targetDate" value={date} />
      <label className="block text-sm">
        Wat wil je wijzigen?
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as ChangeRequestType)}
          className="famli-input mt-1"
        >
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {changeRequestLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4 text-sm">
        <p className="text-[color:var(--famli-muted)]">Huidige situatie</p>
        <p className="mt-1 font-medium">
          {formatDayLong(date)} · {current ? `Bij ${parentName(snapshot, current.custodianMemberId).toLowerCase()}` : "Nog niet ingepland"}
        </p>
      </div>
      {type === "swap_day" || type === "extra_day" ? (
        <label className="block text-sm">
          Voorstel
          <select name="requestedCustodianMemberId" defaultValue={proposedDefault} className="famli-input mt-1">
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>
                Bij {parentName(snapshot, member.id).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="requestedCustodianMemberId" value={proposedDefault} />
      )}
      {type === "pickup_time" || type === "pickup" ? (
        <label className="block text-sm">
          Tijd
          <input name="time" type="time" defaultValue="17:00" className="famli-input mt-1" />
        </label>
      ) : null}
      {type === "pickup" ? (
        <label className="block text-sm">
          Wie haalt op?
          <select name="pickupMemberId" defaultValue={snapshot.currentMember.id} className="famli-input mt-1">
            {snapshot.members.map((member) => (
              <option key={member.id} value={member.id}>
                {parentName(snapshot, member.id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {type === "location" ? (
        <label className="block text-sm">
          Locatie
          <input name="location" defaultValue="School" className="famli-input mt-1" />
        </label>
      ) : null}
      <label className="block text-sm">
        Opmerking
        <textarea name="message" placeholder="Optioneel" className="famli-input mt-1" />
      </label>
      <button className="famli-btn famli-btn-primary w-full">Voorstel versturen</button>
      {other ? (
        <p className="text-center text-xs text-[color:var(--famli-muted)]">
          {parentName(snapshot, other.id)} ziet dit daarna op Vandaag en in Regelen.
        </p>
      ) : null}
    </form>
  );
}
