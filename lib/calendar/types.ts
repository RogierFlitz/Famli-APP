export interface ProviderCalendar {
  id: string;
  name: string;
  primary?: boolean;
}

export interface ProviderFetchedEvent {
  providerEventId: string;
  calendarId?: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  raw?: Record<string, unknown>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
  accountId?: string;
  accountEmail?: string;
}

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}
