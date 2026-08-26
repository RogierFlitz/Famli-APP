"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import {
  addChildAction,
  completeOnboardingAction,
  createFamilyAction,
  inviteParentAction,
} from "@/lib/actions/onboarding";
import { ScheduleStep } from "@/components/onboarding/schedule-step";
import type { ParentOption } from "@/components/onboarding/custody-schedule-editor";
import { famliBrand } from "@/lib/brand/tokens";

const steps = [
  "Welkom",
  "Gezin",
  "Kinderen",
  "Uitnodigen",
  "Schema",
  "Agenda",
  "Klaar",
];

export function OnboardingWizard(props: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  familyName: string;
  children: string[];
  invited: string[];
  hasSchedule: boolean;
  parents: ParentOption[];
}) {
  const initialStep = useMemo(() => {
    if (props.hasSchedule) return 5;
    if (props.invited.length) return 4;
    if (props.children.length) return 3;
    if (props.familyName) return 2;
    return 0;
  }, [props]);
  const [step, setStep] = useState(initialStep);

  return (
    <FamliWash>
    <div className="mx-auto min-h-dvh max-w-lg px-5 py-8">
      <FamliLogo />
      <div className="mt-8 mb-6 flex gap-1">
        {steps.map((label, index) => (
          <span
            key={label}
            className={`h-1 flex-1 rounded-full ${index <= step ? "bg-[color:var(--famli-brand)]" : "bg-black/10"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <Screen
          title="Welkom bij Famli"
          kicker={famliBrand.onboardingLine}
          text={famliBrand.onboardingBody}
          action="Start met Famli"
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <form
          action={async (formData) => {
            const result = await createFamilyAction(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setStep(2);
          }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-semibold tracking-tight">Maak je gezin aan</h1>
          <input type="hidden" name="firstName" defaultValue={props.firstName} />
          <input type="hidden" name="lastName" defaultValue={props.lastName} />
          <input type="hidden" name="email" defaultValue={props.email} />
          <Field name="familyName" label="Gezinsnaam" defaultValue={props.familyName || `Gezin ${props.lastName}`} />
          <Field name="parentLabel" label="Jouw naam in het gezin" defaultValue="Mama" />
          <Actions onBack={() => setStep(0)} submit="Doorgaan" />
        </form>
      )}

      {step === 2 && (
        <form
          action={async (formData) => {
            const result = await addChildAction(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setStep(3);
          }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-semibold tracking-tight">Voeg kind(eren) toe</h1>
          <p className="text-[color:var(--famli-muted)]">Je kunt later altijd nog een kind toevoegen.</p>
          <Field name="firstName" label="Voornaam" />
          <Field name="lastName" label="Achternaam" defaultValue={props.lastName} />
          <Field name="dateOfBirth" label="Geboortedatum" type="date" />
          <Actions onBack={() => setStep(1)} submit="Kind toevoegen" secondary={{ label: "Overslaan", onClick: () => setStep(3) }} />
        </form>
      )}

      {step === 3 && (
        <form
          action={async (formData) => {
            const result = await inviteParentAction(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setStep(4);
          }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-semibold tracking-tight">Nodig de andere ouder uit</h1>
          <Field name="email" label="E-mailadres" type="email" />
          <Field name="parentLabel" label="Hoe noemen jullie deze ouder?" defaultValue="Papa" />
          <Actions onBack={() => setStep(2)} submit="Uitnodiging versturen" secondary={{ label: "Later", onClick: () => setStep(4) }} />
        </form>
      )}

      {step === 4 && (
        <ScheduleStep
          parents={props.parents}
          onBack={() => setStep(3)}
          onSaved={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <Screen
          title="Koppel eventueel je agenda"
          text="Google, Outlook en Apple komen later. Persoonlijke afspraken blijven privé totdat jij kiest om ‘Bezet’ of de volledige titel te delen."
          action="Doorgaan"
          onNext={() => setStep(6)}
          back={() => setStep(4)}
        />
      )}

      {step === 6 && (
        <form action={completeOnboardingAction} className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Klaar</h1>
          <p className="text-[color:var(--famli-muted)]">Vanaf nu begint de dag op Vandaag. Weinig menu’s, één rustige plek.</p>
          <button className="famli-btn famli-btn-primary w-full">Naar Vandaag</button>
        </form>
      )}
    </div>
    </FamliWash>
  );
}

function Screen({
  title,
  kicker,
  text,
  action,
  onNext,
  back,
}: {
  title: string;
  kicker?: string;
  text: string;
  action: string;
  onNext: () => void;
  back?: () => void;
}) {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      {kicker ? <p className="mt-3 text-lg text-[color:var(--famli-ink)]">{kicker}</p> : null}
      <p className="mt-3 text-[color:var(--famli-muted)]">{text}</p>
      <div className="mt-8 flex gap-3">
        {back ? (
          <button type="button" onClick={back} className="famli-btn famli-btn-secondary flex-1">
            Terug
          </button>
        ) : null}
        <button type="button" onClick={onNext} className="famli-btn famli-btn-primary flex-1">
          {action}
        </button>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={type !== "email" ? true : undefined}
        className="famli-input mt-1"
      />
    </label>
  );
}

function Actions({
  onBack,
  submit,
  secondary,
}: {
  onBack: () => void;
  submit: string;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <button className="famli-btn famli-btn-primary">{submit}</button>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="famli-btn famli-btn-secondary flex-1">
          Terug
        </button>
        {secondary ? (
          <button type="button" onClick={secondary.onClick} className="famli-btn famli-btn-secondary flex-1">
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
