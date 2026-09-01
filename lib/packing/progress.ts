import type { Handover, HandoverReadyStatus, PackingItem } from "@/lib/domain/types";

export function packingProgressLabel(checked: number, total: number): string {
  if (total <= 0) return "Nog niets toegevoegd";
  if (checked >= total) return "Alles gereed ✓";
  const left = total - checked;
  if (checked === 0) return left === 1 ? "Nog 1 ding" : `Nog ${left} dingen`;
  if (left === 1) return "Nog 1 ding";
  return `${checked} van ${total} klaar`;
}

export function packingRemainingLabel(remaining: number): string {
  if (remaining <= 0) return "Alles gereed ✓";
  if (remaining === 1) return "Nog 1 ding";
  return `Nog ${remaining} dingen`;
}

export function handoverReadyLabel(
  handover: Pick<Handover, "readyStatus">,
  remaining: number,
): string {
  if (handover.readyStatus === "completed") return "Overdracht afgerond";
  if (handover.readyStatus === "ready") return "Alles gereed ✓";
  if (remaining <= 0) return "Bijna klaar";
  if (remaining <= 2) return packingRemainingLabel(remaining);
  return packingRemainingLabel(remaining);
}

export function countPackingProgress(items: PackingItem[]): { checked: number; total: number; remaining: number } {
  const total = items.length;
  const checked = items.filter((item) => item.checked).length;
  return { checked, total, remaining: Math.max(0, total - checked) };
}

export function nextHandoverStatusAfterToggle(
  current: HandoverReadyStatus,
  remaining: number,
): HandoverReadyStatus {
  if (current === "ready" || current === "completed") return current;
  if (remaining <= 0) return "in_progress";
  return current === "open" ? "in_progress" : current;
}
