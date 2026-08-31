"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { respondToChangeRequestAction } from "@/lib/actions/calendar";
import { createGuestLinkAction } from "@/lib/actions/messages";
import { formatDayLong } from "@/lib/dates";
import { changeRequestLabel, changeRequestStatusLabel } from "@/lib/domain/labels";
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
  const waitingOnMe =
    canRespond &&
    ((request.status === "pending" && !mine) || (request.status === "alternative_proposed" && mine));
  const resolved = request.status === "accepted" || request.status === "declined" || request.status === "cancelled";
  const alternativeDate =
    typeof request.alternativePayload?.targetDate === "string" ? request.alternativePayload.targetDate : null;
  const [guestUrl, setGuestUrl] = useState<string | null>(null);
  const [linkPending, startLinkTransition] = useTransition();

  async function action(formData: FormData) {
    const decision = String(formData.get("decision"));
    await respondToChangeRequestAction(formData);
    if (decision === "accepted") toast.success("Verzoek geaccepteerd");
    if (decision === "declined") toast.message("Kan niet — de andere ouder is op de hoogte");
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
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
          {changeRequestStatusLabel[request.status]}
        </p>
        <h3 className="mt-1 text-lg font-semibold">
          {from} · {changeRequestLabel[request.type]}
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
          {alternativeDate ? (
            <div>
              <dt className="text-[color:var(--famli-muted)]">Alternatieve datum</dt>
              <dd>{formatDayLong(alternativeDate)}</dd>
            </div>
          ) : null}
          {request.message ? <p className="text-[color:var(--famli-muted)]">{request.message}</p> : null}
          {request.responseMessage ? (
            <p className="text-[color:var(--famli-muted)]">Reactie: {request.responseMessage}</p>
          ) : null}
        </dl>
      </div>

      {waitingOnMe ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={request.id} />
          {request.status === "pending" ? (
            <label className="block text-sm">
              Andere datum voorstellen (optioneel)
              <input name="alternativeDate" type="date" className="famli-input mt-1" />
            </label>
          ) : null}
          <label className="block text-sm">
            Bericht (optioneel)
            <input name="message" className="famli-input mt-1" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button name="decision" value="accepted" className="famli-btn famli-btn-primary h-11 px-4">
              Accepteren
            </button>
            {request.status === "pending" ? (
              <button name="decision" value="alternative_proposed" className="famli-btn famli-btn-secondary h-11 px-4">
                Alternatief voorstellen
              </button>
            ) : null}
            <button name="decision" value="declined" className="famli-btn famli-btn-secondary h-11 px-4">
              Kan niet
            </button>
          </div>
        </form>
      ) : resolved ? null : (
        <div className="space-y-2">
          <p className="text-sm text-[color:var(--famli-muted)]">
            {mine ? "Wachten op de andere ouder." : "Wachten op een reactie."}
          </p>
          {mine && (request.type === "pickup" || request.type === "pickup_time" || request.type === "dropoff") ? (
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
      )}

      <ContextMessages snapshot={snapshot} resourceType="change_request" resourceId={request.id} />
    </article>
  );
}
