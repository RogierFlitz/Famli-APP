/**
 * Export overview — placeholder action for future data export.
 */
export type ExportFormat = "pdf" | "csv" | "ics";

export async function exportFamilyOverview(_familyId: string, _format: ExportFormat): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: "Export nog niet beschikbaar — placeholder voorbereid." };
}
