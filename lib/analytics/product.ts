export const PRODUCT_EVENTS = [
  "tomorrow_viewed",
  "packing_item_checked",
  "smart_signal_resolved",
  "tomorrow_all_ready",
  "daily_brief_enabled",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

/**
 * Privacy-safe product analytics. Never pass child names, event titles, or document names.
 * No-op until a provider is wired.
 */
export function trackProductEvent(_name: ProductEventName, _meta?: { count?: number }): void {
  return;
}
