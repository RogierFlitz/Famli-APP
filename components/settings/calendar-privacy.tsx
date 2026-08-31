"use client";

import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, Unplug } from "lucide-react";
import { updateCalendarPrivacyAction } from "@/lib/actions/family";
import {
  connectIcsCalendarAction,
  disconnectCalendarAction,
  syncCalendarAction,
} from "@/lib/actions/calendar-integrations";
import { calendarProviderMeta } from "@/lib/calendar/providers";
import type { CalendarConnection, CalendarPrivacyMode, CalendarProvider } from "@/lib/domain/types";

const privacyOptions: Array<{ value: CalendarPrivacyMode; label: string; hint: string }> = [
  {
    value: "full",
    label: "Volledige afspraak",
    hint: "Andere gezinsleden zien titel, tijd en locatie.",
  },
  {
    value: "busy",
    label: 'Alleen "Bezet"',
    hint: "Andere gezinsleden zien alleen dat je bezet bent, zonder details.",
  },
  {
    value: "hidden",
    label: "Helemaal niet delen",
    hint: "Persoonlijke afspraken zijn voor anderen onzichtbaar. Jij ziet alles.",
  },
];

function connectionFor(
  connections: CalendarConnection[],
  userId: string,
  provider: CalendarProvider,
): CalendarConnection | undefined {
  return connections.find((item) => item.userId === userId && item.provider === provider);
}

function formatSyncedAt(value?: string | null): string {
  if (!value) return "Nog niet gesynchroniseerd";
  return new Date(value).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarPrivacyPanel({
  privacyMode,
  connections,
  userId,
  flash,
  oauthReady,
}: {
  privacyMode: CalendarPrivacyMode;
  connections: CalendarConnection[];
  userId: string;
  flash?: { provider?: string; connected?: boolean; error?: string };
  oauthReady: { google: boolean; microsoft: boolean };
}) {
  useEffect(() => {
    if (flash?.connected) toast.success("Agenda gekoppeld");
    if (flash?.error === "not_configured") {
      toast.error("OAuth is nog niet geconfigureerd op deze omgeving.");
    } else if (flash?.error) {
      toast.error(`Koppelen mislukt: ${flash.error}`);
    }
  }, [flash]);

  return (
    <>
      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          try {
            await updateCalendarPrivacyAction(formData);
            toast.success("Privacy-instelling opgeslagen");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
          }
        }}
      >
        <p className="text-sm font-medium">Persoonlijke afspraken tonen voor andere gezinsleden als</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {privacyOptions.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-2xl border border-[color:var(--nest-border)] p-3 has-[:checked]:border-[color:var(--nest-brand)] has-[:checked]:bg-[color:var(--nest-bg)]"
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="privacyMode"
                  value={option.value}
                  defaultChecked={privacyMode === option.value}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs text-[color:var(--nest-muted)]">{option.hint}</span>
                </span>
              </div>
            </label>
          ))}
        </div>
        <button className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">Opslaan</button>
      </form>

      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-medium">Agenda koppelen</h3>
        {calendarProviderMeta.map((provider) => (
          <ProviderCard
            key={provider.id}
            meta={provider}
            connection={connectionFor(connections, userId, provider.id)}
            oauthReady={
              provider.id === "google"
                ? oauthReady.google
                : provider.id === "microsoft"
                  ? oauthReady.microsoft
                  : true
            }
          />
        ))}
      </div>
    </>
  );
}

function ProviderCard({
  meta,
  connection,
  oauthReady,
}: {
  meta: (typeof calendarProviderMeta)[number];
  connection?: CalendarConnection;
  oauthReady: boolean;
}) {
  const connected = connection?.status === "connected";

  return (
    <div className="rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-bg)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{meta.label}</p>
          <p className="mt-1 text-sm text-[color:var(--nest-muted)]">{meta.description}</p>
          {meta.limitations ? (
            <p className="mt-2 text-xs text-[color:var(--nest-muted)]">{meta.limitations}</p>
          ) : null}
        </div>
        {connected ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Gekoppeld
          </span>
        ) : connection?.status === "error" ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">Fout</span>
        ) : null}
      </div>

      {connected ? (
        <div className="mt-4 space-y-2 text-sm">
          {connection?.providerAccountEmail ? (
            <p className="text-[color:var(--nest-muted)]">{connection.providerAccountEmail}</p>
          ) : null}
          <p className="text-xs text-[color:var(--nest-muted)]">
            Laatste sync: {formatSyncedAt(connection?.lastSyncedAt)}
          </p>
          {connection?.syncError ? (
            <p className="text-xs text-red-600">{connection.syncError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <form
              action={async (formData) => {
                try {
                  await syncCalendarAction(formData);
                  toast.success("Agenda gesynchroniseerd");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Sync mislukt");
                }
              }}
            >
              <input type="hidden" name="provider" value={meta.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--nest-border)] px-4 text-sm"
              >
                <RefreshCw className="size-4" />
                Nu synchroniseren
              </button>
            </form>
            <form
              action={async (formData) => {
                try {
                  await disconnectCalendarAction(formData);
                  toast.success("Agenda ontkoppeld");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Ontkoppelen mislukt");
                }
              }}
            >
              <input type="hidden" name="provider" value={meta.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm text-red-700"
              >
                <Unplug className="size-4" />
                Ontkoppelen
              </button>
            </form>
          </div>
        </div>
      ) : meta.authKind === "oauth" ? (
        <div className="mt-4">
          {oauthReady ? (
            meta.id === "microsoft" ? (
              <a
                href="/api/calendar/microsoft/authorize"
                className="famli-btn famli-btn-primary h-10 px-4 text-sm"
              >
                Koppel {meta.label}
              </a>
            ) : (
              <Link
                href={`/api/calendar/${meta.id}/authorize`}
                className="inline-flex h-10 items-center rounded-full bg-[color:var(--nest-brand)] px-4 text-sm text-white"
              >
                Koppel {meta.label}
              </Link>
            )
          ) : (
            <p className="text-sm text-[color:var(--nest-muted)]">
              OAuth-credentials ontbreken op deze server. Voeg de env-vars toe en probeer opnieuw.
            </p>
          )}
        </div>
      ) : (
        <form
          className="mt-4 space-y-2"
          action={async (formData) => {
            try {
              await connectIcsCalendarAction(formData);
              toast.success("ICS-agenda gekoppeld");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "ICS koppelen mislukt");
            }
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-[color:var(--nest-muted)]">ICS-abonnements-URL</span>
            <input
              name="icsUrl"
              type="url"
              required
              placeholder="https://…"
              className="h-11 w-full rounded-xl border border-[color:var(--nest-border)] px-3"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[color:var(--nest-muted)]">Label (optioneel)</span>
            <input
              name="label"
              type="text"
              placeholder="Mijn Apple-agenda"
              className="h-11 w-full rounded-xl border border-[color:var(--nest-border)] px-3"
            />
          </label>
          <button type="submit" className="h-10 rounded-full border border-[color:var(--nest-border)] px-4 text-sm">
            ICS importeren
          </button>
        </form>
      )}
    </div>
  );
}
