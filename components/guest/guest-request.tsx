"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { respondToGuestLinkAction } from "@/lib/actions/messages";
import { formatDayLong } from "@/lib/dates";
import { changeRequestLabel } from "@/lib/domain/labels";
import { parentName } from "@/lib/queries/family-view";
import type { ChangeRequest, FamilySnapshot, GuestLinkToken } from "@/lib/domain/types";

export function GuestRequestPage({
  link,
  snapshot,
  request,
}: {
  link: GuestLinkToken;
  snapshot: FamilySnapshot;
  request: ChangeRequest | null;
}) {
  const [name, setName] = useState("");
  const [done, setDone] = useState(link.response);
  const [pending, startTransition] = useTransition();

  async function respond(decision: "accepted" | "declined") {
    if (!name.trim()) {
      toast.error("Vul je naam in");
      return;
    }
    const formData = new FormData();
    formData.set("token", link.token);
    formData.set("decision", decision);
    formData.set("respondedByName", name.trim());
    startTransition(async () => {
      try {
        await respondToGuestLinkAction(formData);
        setDone(decision);
        toast.success(decision === "accepted" ? "Bedankt — bevestigd!" : "Bedankt — doorgegeven");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Reactie mislukt");
      }
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-6 text-center">
        <h1 className="text-2xl font-semibold">Bedankt, {link.respondedByName ?? name}!</h1>
        <p className="text-[color:var(--famli-muted)]">
          Je antwoord ({done === "accepted" ? "Ja" : "Nee"}) is doorgegeven aan {snapshot.family.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-sm text-[color:var(--famli-muted)]">{snapshot.family.name}</p>
        <h1 className="text-3xl font-semibold">{link.label}</h1>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Geen Famli-account nodig — reageer hieronder.
        </p>
      </header>

      {request ? (
        <article className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Verzoek</p>
          <p className="mt-1 text-lg font-medium">{changeRequestLabel[request.type]}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">{formatDayLong(request.targetDate)}</p>
          {request.message ? <p className="mt-2">{request.message}</p> : null}
          <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
            Van {parentName(snapshot, request.requestedByMemberId)}
          </p>
        </article>
      ) : null}

      <div className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5 space-y-4">
        <label className="block text-sm">
          <span className="text-[color:var(--famli-muted)]">Je naam</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bijv. Oma Els"
            className="famli-input mt-1 w-full"
            required
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("accepted")}
            className="famli-btn famli-btn-primary h-11 flex-1 px-4"
          >
            Ja
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("declined")}
            className="famli-btn famli-btn-secondary h-11 flex-1 px-4"
          >
            Nee
          </button>
        </div>
      </div>
    </div>
  );
}
