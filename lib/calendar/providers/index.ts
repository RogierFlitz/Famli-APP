import type { CalendarPrivacyMode, CalendarProvider } from "@/lib/domain/types";

/**
 * Modular calendar integration layer.
 * Provider adapters are intentionally inert until OAuth credentials exist.
 * Do not call live Google/Microsoft APIs from this module.
 */
export interface ExternalCalendarEvent {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  location?: string;
}

export interface SharedCalendarBlock {
  startsAt: string;
  endsAt: string;
  title: string;
  isBusyOnly: boolean;
}

export function applyPrivacy(
  event: ExternalCalendarEvent,
  mode: CalendarPrivacyMode,
): SharedCalendarBlock | null {
  if (mode === "hidden") return null;
  if (mode === "busy") {
    return {
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      title: "Bezet",
      isBusyOnly: true,
    };
  }
  return {
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    title: event.title,
    isBusyOnly: false,
  };
}

export interface CalendarProviderAdapter {
  id: CalendarProvider;
  label: string;
  description: string;
  authKind: "oauth" | "ics";
  connect(): Promise<never>;
}

function notConfigured(provider: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${provider} is nog niet gekoppeld. Voeg OAuth-credentials toe voordat je deze provider activeert.`,
    ),
  );
}

export const calendarProviders: CalendarProviderAdapter[] = [
  {
    id: "microsoft",
    label: "Microsoft Outlook",
    description: "Microsoft Graph Calendar API. Persoonlijke afspraken blijven privé tot jij deelt.",
    authKind: "oauth",
    connect: () => notConfigured("Microsoft Outlook"),
  },
  {
    id: "google",
    label: "Google Calendar",
    description: "Google Calendar API. Famli-gebeurtenissen kunnen later optioneel terug synchroniseren.",
    authKind: "oauth",
    connect: () => notConfigured("Google Calendar"),
  },
  {
    id: "apple_ics",
    label: "Apple Calendar",
    description: "ICS-abonnement of export. Geschikt voor delen zonder volledige accounttoegang.",
    authKind: "ics",
    connect: () => notConfigured("Apple Calendar"),
  },
];
