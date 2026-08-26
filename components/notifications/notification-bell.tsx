"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { notificationHref } from "@/lib/notifications/routes";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import type { AppNotification, FamilySnapshot } from "@/lib/domain/types";

export function NotificationBell({ snapshot }: { snapshot: FamilySnapshot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const items = snapshot.notifications
    .filter((item) => item.userId === snapshot.currentProfile.id)
    .slice(0, 20);
  const unread = items.filter((item) => !item.readAt).length;

  function handleOpenItem(item: AppNotification) {
    const href = notificationHref(item);
    startTransition(async () => {
      if (!item.readAt) await markNotificationReadAction(item.id);
      setOpen(false);
      router.push(href);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function handleDelete(id: string, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      await deleteNotificationAction(id);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `${unread} ongelezen meldingen` : "Meldingen"}
          className="relative grid size-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] text-[color:var(--famli-ink)] transition hover:bg-[color:var(--famli-bg)]"
        >
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[color:var(--famli-brand)] px-1 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-[color:var(--famli-border)] px-4 py-3">
          <p className="text-sm font-semibold">Meldingen</p>
          {unread > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-[color:var(--famli-brand)] hover:underline disabled:opacity-50"
            >
              Alles gelezen
            </button>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 size-8 text-[color:var(--famli-muted)]" />
              <p className="text-sm font-medium">Geen meldingen</p>
              <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
                Updates van je gezin verschijnen hier.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--famli-border)]">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleOpenItem(item)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--famli-bg)]/80",
                      !item.readAt && "bg-[color:var(--famli-bg)]/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        item.readAt ? "bg-transparent" : "bg-[color:var(--famli-brand)]",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.body ? (
                        <span className="mt-0.5 line-clamp-2 text-xs text-[color:var(--famli-muted)]">
                          {item.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-[color:var(--famli-muted)]">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: nl })}
                      </span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Melding verwijderen"
                      onClick={(event) => handleDelete(item.id, event)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleDelete(item.id, event as unknown as React.MouseEvent);
                        }
                      }}
                      className="shrink-0 self-start rounded px-1 text-[10px] text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]"
                    >
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 ? (
          <div className="border-t border-[color:var(--famli-border)] px-4 py-2">
            <Link
              href="/vandaag"
              onClick={() => setOpen(false)}
              className="text-xs text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]"
            >
              Naar vandaag
            </Link>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
