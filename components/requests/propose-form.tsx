"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createChangeRequestAction } from "@/lib/actions/calendar";
import { changeRequestLabel } from "@/lib/domain/labels";
import { occurrenceOn, parentName } from "@/lib/queries/family-view";
import type { ChangeRequestType, FamilySnapshot } from "@/lib/domain/types";
import { formatDayLong, toISODate } from "@/lib/dates";

const TYPES: ChangeRequestType[] = [
  "swap_day",
  "extra_day",
  "pickup",
  "dropoff",
  "babysit",
  "task_takeover",
  "pickup_time",
  "location",
];

export function ProposeChangeForm({
  snapshot,
  date,
  onDone,
}: {
  snapshot: FamilySnapshot;
  date?: string;
  onDone?: () => void;
}) {
  const today = toISODate(new Date());
  const [type, setType] = useState<ChangeRequestType>("extra_day");
  const [targetDate, setTargetDate] = useState(date ?? today);
  const current = occurrenceOn(snapshot, targetDate);
  const other = snapshot.members.find((member) => member.id !== snapshot.currentMember.id);
  const proposedDefault =
    type === "swap_day" || type === "extra_day" || type === "babysit"
      ? snapshot.currentMember.id
      : (current?.custodianMemberId ?? snapshot.currentMember.id);
  const openTasks = snapshot.tasks.filter((task) => task.kind === "one_off" && task.status !== "done");

  async function action(formData: FormData) {
    await createChangeRequestAction(formData);
    toast.success("Verzoek verstuurd");
    onDone?.();
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        Wat wil je vragen?
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
      <label className="block text-sm">
        Datum
        <input
          name="targetDate"
          type="date"
          required
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          className="famli-input mt-1"
        />
      </label>
      <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4 text-sm">
        <p className="text-[color:var(--famli-muted)]">Nu in het schema</p>
        <p className="mt-1 font-medium">
          {formatDayLong(targetDate)} ·{" "}
          {current ? `Bij ${parentName(snapshot, current.custodianMemberId).toLowerCase()}` : "Nog niet ingepland"}
        </p>
      </div>
      {type === "swap_day" || type === "extra_day" || type === "babysit" ? (
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
      {type === "pickup_time" || type === "pickup" || type === "dropoff" || type === "babysit" ? (
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
      {type === "dropoff" ? (
        <label className="block text-sm">
          Wie brengt?
          <select name="dropoffMemberId" defaultValue={snapshot.currentMember.id} className="famli-input mt-1">
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
      {type === "task_takeover" ? (
        <label className="block text-sm">
          Welke taak?
          <select name="taskId" className="famli-input mt-1" defaultValue={openTasks[0]?.id ?? ""}>
            {openTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {snapshot.children.length > 1 ? (
        <label className="block text-sm">
          Kind (optioneel)
          <select name="childId" className="famli-input mt-1" defaultValue="">
            <option value="">Alle kinderen</option>
            {snapshot.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-sm">
        Reden of opmerking
        <textarea name="message" className="famli-input mt-1" />
      </label>
      <button className="famli-btn famli-btn-primary w-full">Verzoek versturen</button>
      {other ? (
        <p className="text-center text-xs text-[color:var(--famli-muted)]">
          {parentName(snapshot, other.id)} ziet dit daarna op Vandaag en in Regelen.
        </p>
      ) : null}
    </form>
  );
}
