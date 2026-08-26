"use client";

import { parentName } from "@/lib/queries/family-view";
import { messageStatusLabel, messagesForResource } from "@/lib/queries/context-messages";
import type { ContextResourceType, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function ContextMessages({
  snapshot,
  resourceType,
  resourceId,
}: {
  snapshot: FamilySnapshot;
  resourceType: ContextResourceType;
  resourceId: string;
}) {
  const messages = messagesForResource(snapshot, resourceType, resourceId);
  if (!messages.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">Berichten</p>
      {messages.map((message) => (
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
          <p className="mt-1 text-xs text-[color:var(--famli-muted)]">{messageStatusLabel(snapshot, message)}</p>
        </article>
      ))}
    </div>
  );
}
