/**
 * External calendar privacy — "Bezet" blocks without event details.
 */
import type { ExternalBusyBlock } from "@/lib/domain/types";

export function busyBlockLabel(_block: ExternalBusyBlock): string {
  return "Bezet";
}

export function mergeBusyBlocks(blocks: ExternalBusyBlock[]): ExternalBusyBlock[] {
  return blocks.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
