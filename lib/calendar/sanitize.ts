import { applyPrivacy as applyProviderPrivacy } from "@/lib/calendar/providers";
import type { CalendarPrivacyMode, PersonalCalendarEvent } from "@/lib/domain/types";

export interface RawExternalEventRow {
  id: string;
  user_id: string;
  provider: string;
  starts_at: string;
  ends_at: string;
  title: string;
  location: string | null;
  all_day: boolean;
  is_busy_only: boolean;
  is_own: boolean;
}

/** Server-side sanitization — mirrors DB RPC rules for tests and memory store. */
export function sanitizeExternalEvent(
  event: {
    id: string;
    userId: string;
    provider: "google" | "microsoft" | "apple_ics";
    startsAt: string;
    endsAt: string;
    title: string;
    location: string | null;
    allDay: boolean;
  },
  privacyMode: CalendarPrivacyMode,
  viewerUserId: string,
  ownerMemberId: string,
): PersonalCalendarEvent | null {
  const isOwn = event.userId === viewerUserId;
  if (isOwn) {
    return {
      id: event.id,
      userId: event.userId,
      ownerMemberId,
      provider: event.provider,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      title: event.title,
      location: event.location,
      allDay: event.allDay,
      isBusyOnly: false,
      isOwn: true,
    };
  }

  const block = applyProviderPrivacy(
    {
      id: event.id,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      title: event.title,
      location: event.location ?? undefined,
    },
    privacyMode,
  );
  if (!block) return null;

  return {
    id: event.id,
    userId: event.userId,
    ownerMemberId,
    provider: event.provider,
    startsAt: block.startsAt,
    endsAt: block.endsAt,
    title: block.title,
    location: privacyMode === "full" ? event.location : null,
    allDay: event.allDay,
    isBusyOnly: block.isBusyOnly,
    isOwn: false,
  };
}

export function mapRpcRowToPersonalEvent(
  row: RawExternalEventRow,
  ownerMemberId: string,
): PersonalCalendarEvent | null {
  if (!row.title) return null;
  return {
    id: row.id,
    userId: row.user_id,
    ownerMemberId,
    provider: row.provider as PersonalCalendarEvent["provider"],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title,
    location: row.location,
    allDay: row.all_day,
    isBusyOnly: row.is_busy_only,
    isOwn: row.is_own,
  };
}
