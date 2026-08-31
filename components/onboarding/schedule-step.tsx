"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { saveScheduleAction } from "@/lib/actions/onboarding";
import { toISODate } from "@/lib/dates";
import type { CustodyPattern } from "@/lib/domain/types";
import {
  alternatingCycle,
  CustomCycleEditor,
  defaultWeekdayMemberIds,
  FixedWeekdaysEditor,
  isCustomCycleValid,
  isWeekdayAssignmentValid,
  type ParentOption,
} from "@/components/onboarding/custody-schedule-editor";

export function ScheduleStep(props: {
  parents: ParentOption[];
  onBack: () => void;
  onSaved: () => void;
  onSkip?: () => void;
}) {
  const [patternType, setPatternType] = useState<CustodyPattern>("two_two_three");
  const parentAId = props.parents[0]?.memberId ?? "";
  const parentBId = props.parents[1]?.memberId ?? parentAId;

  const [dayCycle, setDayCycle] = useState(() =>
    alternatingCycle(7, parentAId, parentBId),
  );
  const [weekdayMemberIds, setWeekdayMemberIds] = useState(() =>
    defaultWeekdayMemberIds(parentAId),
  );

  const isValid = useMemo(() => {
    if (patternType === "custom") {
      return isCustomCycleValid(dayCycle, parentAId, parentBId);
    }
    if (patternType === "fixed_weekdays") {
      return isWeekdayAssignmentValid(weekdayMemberIds, parentAId, parentBId);
    }
    return true;
  }, [patternType, dayCycle, weekdayMemberIds, parentAId, parentBId]);

  return (
    <form
      action={async (formData) => {
        if (!isValid) {
          toast.error("Vul het schema volledig in voordat je opslaat.");
          return;
        }
        const result = await saveScheduleAction(formData);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        props.onSaved();
      }}
      className="space-y-4"
    >
      <h1 className="text-4xl font-semibold tracking-tight">Stel het basisschema in</h1>

      <label className="block text-sm">
        Patroon
        <select
          name="patternType"
          value={patternType}
          onChange={(event) => setPatternType(event.target.value as CustodyPattern)}
          className="famli-input mt-1"
        >
          <option value="two_two_three">2-2-3</option>
          <option value="week_on_week_off">Week-op-week-af</option>
          <option value="fixed_weekdays">Vaste weekdagen</option>
          <option value="custom">Volledig aangepast</option>
        </select>
      </label>

      {patternType === "custom" ? (
        <>
          <CustomCycleEditor
            dayCycle={dayCycle}
            parents={props.parents}
            onChange={setDayCycle}
          />
          <input type="hidden" name="dayCycle" value={JSON.stringify(dayCycle)} />
        </>
      ) : null}

      {patternType === "fixed_weekdays" ? (
        <>
          <FixedWeekdaysEditor
            weekdayMemberIds={weekdayMemberIds}
            parents={props.parents}
            onChange={setWeekdayMemberIds}
          />
          <input
            type="hidden"
            name="weekdayMemberIds"
            value={JSON.stringify(weekdayMemberIds)}
          />
        </>
      ) : null}

      <label className="block text-sm">
        Startdatum (maandag)
        <input
          name="startsOn"
          type="date"
          defaultValue={toISODate(new Date())}
          required
          className="famli-input mt-1"
        />
      </label>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="submit"
          disabled={!isValid}
          className="famli-btn famli-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Schema opslaan
        </button>
        <button
          type="button"
          onClick={props.onBack}
          className="famli-btn famli-btn-secondary"
        >
          Terug
        </button>
        {props.onSkip ? (
          <button type="button" onClick={props.onSkip} className="famli-btn famli-btn-secondary">
            Later instellen
          </button>
        ) : null}
      </div>
    </form>
  );
}
