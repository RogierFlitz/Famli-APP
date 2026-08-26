"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { respondToChangeRequestAction } from "@/lib/actions/calendar";
import { createGuestLinkAction } from "@/lib/actions/messages";
import { formatDayLong } from "@/lib/dates";
import { changeRequestLabel } from "@/lib/domain/labels";
import { canAcceptChangeRequests } from "@/lib/members/permissions";
import { parentName, occurrenceOn } from "@/lib/queries/family-view";
import type { ChangeRequest, FamilySnapshot } from "@/lib/domain/types";
import { ContextMessages } from "@/components/messages/context-messages";

export function ChangeReviewCard({
  snapshot,
  request,
}: {
  snapshot: FamilySnapshot;
  request: ChangeRequest;
}) {
  const from = parentName(snapshot, request.requestedByMemberId);
  const current = occurrenceOn(snapshot, request.targetDate);
  const currentLabel = current
    ? `Bij ${parentName(snapshot, current.custodianMemberId).toLowerCase()}`
    : "Nog niet ingepland";
  const proposedId =
    typeof request.payload.requestedCustodianMemberId === "string"
      ? request.payload.requestedCustodianMemberId
      : request.requestedByMemberId;
  const mine = request.requestedByMemberId === snapshot.currentMember.id;
  const canRespond = canAcceptChangeRequests(snapshot);
  const [guestUrl, setGuestUrl] = useState<string | null>(null);
  const [linkPending, startLinkTransition] = useTransition();

  async function action(formData: FormData) {
    const decision = String(formData.get("decision"));
    await respondToChangeRequestAction(formData);
    if (decision === "accepted") toast.success("Wijziging geaccepteerd");
    if (decision === "declined") toast.message("Voorstel afgewezen");
    if (decision === "alternative_proposed") toast.message("Alternatief verstuurd");
  }

  function shareGuestLink() {
    const formData = new FormData();
    formData.set("changeRequestId", request.id);
    formData.set("label", "Kun jij ophalen?");
    startLinkTransition(async () => {
      try {
        const url = await createGuestLinkAction(formData);
        const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
        setGuestUrl(full);
        await navigator.clipboard.writeText(full);
        toast.success("Link gekopieerd — stuur naar oma of oppas");
      } catch {
        toast.error("Link kon niet worden aangemaakt");
      }
    });
  }

  return (
    <article className="famli-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Wijzigingsvoorstel</p>
        <h3 className="mt-1 text-lg font-semibold">
          {from} {request.type === "swap_day" ? "wil ruilen" : changeRequestLabel[request.type].toLowerCase()}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--famli-muted)]">{formatDayLong(request.targetDate)}</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-[color:var(--famli-muted)]">Huidig</dt>
            <dd>{currentLabel}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--famli-muted)]">Voorstel</dt>
            <dd>Bij {parentName(snapshot, proposedId).toLowerCase()}</dd>
          </div>
          {request.message ? <p className="text-[color:var(--famli-muted)]">{request.message}</p> : null}
        </dl>
      </div>

      {mine ? (
        <div className="space-y-2">
          <p className="text-sm text-[color:var(--famli-muted)]">Wachten op de andere ouder.</p>
          {(request.type === "pickup" || request.type === "pickup_time") ? (
            <button
              type="button"
              disabled={linkPending}
              onClick={shareGuestLink}
              className="famli-btn famli-btn-secondary h-10 px-4 text-sm"
            >
              {linkPending ? "Link maken…" : "Deel link met oppas (zonder account)"}
            </button>
          ) : null}
          {guestUrl ? (
            <p className="break-all text-xs text-[color:var(--famli-muted)]">{guestUrl}</p>
          ) : null}
        </div>
      ) : canRespond ? (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={request.id} />
          <button name="decision" value="accepted" className="famli-btn famli-btn-primary h-11 px-4">
            Accepteren
          </button>
          <button name="decision" value="alternative_proposed" className="famli-btn famli-btn-secondary h-11 px-4">
            Alternatief voorstellen
          </button>
          <button name="decision" value="declined" className="famli-btn famli-btn-secondary h-11 px-4">
            Weigeren
          </button>
        </form>
      ) : (
        <p className="text-sm text-[color:var(--famli-muted)]">
          Alleen ouders kunnen wijzigingsverzoeken behandelen.
        </p>
      )}

      <ContextMessages snapshot={snapshot} resourceType="change_request" resourceId={request.id} />
    </article>
  );
}
