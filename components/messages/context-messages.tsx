"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createContextMessageAction,
  markContextMessageReadAction,
  respondToContextMessageAction,
} from "@/lib/actions/messages";
import { parentName } from "@/lib/queries/family-view";
import {
  messageStatusLabel,
  messagesForResource,
  unreadMessagesForMember,
} from "@/lib/queries/context-messages";
import type { ContextMessageKind, ContextResourceType, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function ContextMessages({
  snapshot,
  resourceType,
  resourceId,
  allowCompose = true,
}: {
  snapshot: FamilySnapshot;
  resourceType: ContextResourceType;
  resourceId: string;
  allowCompose?: boolean;
}) {
  const messages = messagesForResource(snapshot, resourceType, resourceId);
  const me = snapshot.currentMember.id;
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<ContextMessageKind>("update");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const unread = unreadMessagesForMember(snapshot, resourceType, resourceId, me);
    if (!unread.length) return;
    const formData = new FormData();
    for (const message of unread) {
      formData.set("messageId", message.id);
      void markContextMessageReadAction(formData);
    }
  }, [snapshot, resourceType, resourceId, me]);

  async function sendMessage() {
    if (!body.trim()) return;
    const formData = new FormData();
    formData.set("resourceType", resourceType);
    formData.set("resourceId", resourceId);
    formData.set("kind", kind);
    formData.set("body", body.trim());
    startTransition(async () => {
      try {
        await createContextMessageAction(formData);
        setBody("");
        toast.success("Bericht verstuurd");
      } catch {
        toast.error("Bericht kon niet worden verstuurd");
      }
    });
  }

  async function respond(messageId: string, decision: "confirmed" | "declined") {
    const formData = new FormData();
    formData.set("messageId", messageId);
    formData.set("decision", decision);
    formData.set("responseBody", decision === "confirmed" ? "Ja" : "Nee");
    startTransition(async () => {
      try {
        await respondToContextMessageAction(formData);
        toast.success(decision === "confirmed" ? "Bevestigd" : "Afgewezen");
      } catch {
        toast.error("Reactie kon niet worden opgeslagen");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
        Berichten bij dit item
      </p>
      {messages.length ? (
        <div className="space-y-2">
          {messages.map((message) => {
            const mine = message.authorMemberId === me;
            const needsResponse =
              message.kind === "confirmation" &&
              !mine &&
              message.status !== "confirmed" &&
              message.status !== "declined";

            return (
              <article
                key={message.id}
                className={cn(
                  "rounded-2xl border px-3 py-2.5 text-sm",
                  message.kind === "confirmation"
                    ? "border-[color:var(--famli-brand)]/30 bg-[color:var(--famli-brand-soft)]/40"
                    : "border-[color:var(--famli-border)] bg-[color:var(--famli-card)]",
                )}
              >
                <p className="font-medium">{parentName(snapshot, message.authorMemberId)}</p>
                <p className="mt-0.5">{message.body}</p>
                {message.responseBody ? (
                  <p className="mt-2 rounded-xl bg-[color:var(--famli-bg)] px-2 py-1">{message.responseBody}</p>
                ) : null}
                <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
                  {messageStatusLabel(snapshot, message)}
                </p>
                {needsResponse ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => respond(message.id, "confirmed")}
                      className="famli-btn famli-btn-primary h-9 px-3 text-xs"
                    >
                      Ja, bevestigd
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => respond(message.id, "declined")}
                      className="famli-btn famli-btn-secondary h-9 px-3 text-xs"
                    >
                      Nee
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--famli-muted)]">Nog geen berichten — alles blijft hier bij elkaar.</p>
      )}

      {allowCompose ? (
        <div className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-bg)] p-3">
          <label className="block text-xs text-[color:var(--famli-muted)]">Nieuw bericht</label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            placeholder="Bijv. kun jij haar ophalen?"
            className="famli-input mt-1 min-h-[4rem] w-full resize-y"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ContextMessageKind)}
              className="famli-input h-9 w-auto text-xs"
            >
              <option value="update">Update</option>
              <option value="confirmation">Bevestiging vragen</option>
            </select>
            <button
              type="button"
              disabled={pending || !body.trim()}
              onClick={sendMessage}
              className="famli-btn famli-btn-primary h-9 px-4 text-xs"
            >
              Versturen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
