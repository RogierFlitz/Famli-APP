import type { CalendarPrivacyMode, CalendarProvider } from "@/lib/domain/types";

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

export interface CalendarProviderMeta {
  id: CalendarProvider;
  label: string;
  description: string;
  authKind: "oauth" | "ics";
  limitations?: string;
}

export const calendarProviderMeta: CalendarProviderMeta[] = [
  {
    id: "microsoft",
    label: "Microsoft Outlook",
    description: "Koppel je Outlook-agenda. Famli leest alleen je afspraken — niets wordt teruggeschreven.",
    authKind: "oauth",
  },
  {
    id: "google",
    label: "Google Calendar",
    description: "Koppel Google Calendar en kies welke agenda's je wilt importeren.",
    authKind: "oauth",
  },
  {
    id: "apple_ics",
    label: "Apple Calendar",
    description: "Importeer via een ICS-abonnementslink. Geen volledige accountkoppeling mogelijk.",
    authKind: "ics",
    limitations:
      "Apple biedt geen OAuth voor agenda's. Deel een ICS-link uit Apple Calendar (Instellingen → Accounts → Agenda → Deel). Famli importeert periodiek; wijzigingen kunnen vertraagd binnenkomen.",
  },
];

export { googleAuthorizeUrl, exchangeGoogleCode, refreshGoogleToken, listGoogleCalendars, fetchGoogleEvents } from "./google";
export { microsoftAuthorizeUrl, exchangeMicrosoftCode, refreshMicrosoftToken, fetchMicrosoftEvents } from "./microsoft";
export { fetchIcsEvents, parseIcsEvents } from "./apple-ics";
