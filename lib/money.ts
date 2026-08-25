export function formatEuro(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function parseEuroToCents(input: string): number {
  const normalized = input.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(normalized);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function splitAmounts(
  amountCents: number,
  percents: Record<string, number>,
): Record<string, number> {
  const ids = Object.keys(percents);
  const result: Record<string, number> = {};
  let allocated = 0;
  ids.forEach((id, index) => {
    if (index === ids.length - 1) {
      result[id] = amountCents - allocated;
    } else {
      const share = Math.round((amountCents * percents[id]) / 100);
      result[id] = share;
      allocated += share;
    }
  });
  return result;
}
