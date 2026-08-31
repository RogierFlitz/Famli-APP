"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Copy, RefreshCw, Unplug } from "lucide-react";
import {
  issueCalendarFeedAction,
  revokeCalendarFeedAction,
} from "@/lib/actions/calendar-integrations";
import type { IssuedCalendarFeed } from "@/lib/calendar/ics-export";
import { calendarFeedActionError } from "@/lib/calendar/feed-errors";

export function CalendarExportPanel({ hasFeed }: { hasFeed: boolean }) {
  const [issued, setIssued] = useState<IssuedCalendarFeed | null>(null);
  const [pending, setPending] = useState(false);

  async function issue(rotate: boolean) {
    setPending(true);
    try {
      const result = await issueCalendarFeedAction();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setIssued(result);
      toast.success(rotate ? "Nieuwe abonnementslink gemaakt" : "Abonnementslink klaar");
    } catch (error) {
      toast.error(calendarFeedActionError(error, "Link maken mislukt"));
    } finally {
      setPending(false);
    }
  }

  async function revoke() {
    setPending(true);
    try {
      const result = await revokeCalendarFeedAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setIssued(null);
      toast.success("Abonnementslink uitgeschakeld");
    } catch (error) {
      toast.error(calendarFeedActionError(error, "Uitschakelen mislukt"));
    } finally {
      setPending(false);
    }
  }

  async function copyUrl() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.httpsUrl);
      toast.success("Link gekopieerd");
    } catch {
      toast.error("Kopiëren mislukt");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-[color:var(--nest-muted)]">
        Iedereen met de link kan je Famli-agenda zien (afspraken, wissels, vakanties). Deel hem niet
        publiek. Externe agenda&apos;s verversen zelf; wijzigingen kunnen tot een uur duren.
      </p>

      {issued ? (
        <div className="space-y-3 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[color:var(--nest-muted)]">Abonnementslink</span>
            <textarea
              readOnly
              rows={3}
              value={issued.httpsUrl}
              className="w-full resize-none break-all rounded-xl border border-[color:var(--nest-border)] px-3 py-2 font-mono text-xs leading-5"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--nest-border)] px-4 text-sm"
            >
              <Copy className="size-4" />
              Kopieer link
            </button>
            <a
              href={issued.httpsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-full border border-[color:var(--nest-border)] px-4 text-sm"
            >
              Open ICS
            </a>
          </div>
          <p className="text-xs font-medium text-[color:var(--nest-muted)]">Toevoegen in</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={issued.googleUrl}
              target="_blank"
              rel="noreferrer"
              className="famli-btn famli-btn-primary h-10 px-4 text-sm"
            >
              Google Calendar
            </a>
            <a
              href={issued.appleUrl}
              className="inline-flex h-10 items-center rounded-full border border-[color:var(--nest-border)] px-4 text-sm"
            >
              Apple Agenda
            </a>
            <a
              href={issued.outlookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-full border border-[color:var(--nest-border)] px-4 text-sm"
            >
              Outlook
            </a>
          </div>
        </div>
      ) : hasFeed ? (
        <p className="text-sm text-[color:var(--nest-muted)]">
          Er is al een abonnementslink actief. De volledige URL wordt om veiligheidsredenen niet
          opnieuw getoond. Maak een nieuwe link om hem te kopiëren — de oude stopt dan.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => issue(hasFeed || Boolean(issued))}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--nest-border)] px-4 text-sm disabled:opacity-60"
        >
          {hasFeed || issued ? <RefreshCw className="size-4" /> : <CalendarDays className="size-4" />}
          {hasFeed || issued ? "Nieuwe link maken" : "Abonnementslink maken"}
        </button>
        {hasFeed || issued ? (
          <button
            type="button"
            disabled={pending}
            onClick={revoke}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm text-red-700 disabled:opacity-60"
          >
            <Unplug className="size-4" />
            Link uitschakelen
          </button>
        ) : null}
      </div>
    </div>
  );
}
