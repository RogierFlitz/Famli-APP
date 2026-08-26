/**
 * Gezinsoverzicht export — HTML print/PDF-ready overview for a selected period.
 */
import { formatDayLong, formatTime } from "@/lib/dates";
import { changeRequestLabel, expenseCategoryLabel, eventCategoryLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot } from "@/lib/domain/types";

export type ExportFormat = "html" | "json";

export type ExportPeriod = {
  from: string;
  to: string;
};

export type ExportSections = {
  custody: boolean;
  handovers: boolean;
  events: boolean;
  changes: boolean;
  tasks: boolean;
  expenses: boolean;
};

export const DEFAULT_EXPORT_SECTIONS: ExportSections = {
  custody: true,
  handovers: true,
  events: true,
  changes: true,
  tasks: true,
  expenses: true,
};

function inPeriod(date: string, period: ExportPeriod): boolean {
  return date >= period.from && date <= period.to;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFamilyOverviewHtml(
  snapshot: FamilySnapshot,
  period: ExportPeriod,
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
): string {
  const familyName = escapeHtml(snapshot.family.name);
  const fromLabel = formatDayLong(period.from);
  const toLabel = formatDayLong(period.to);
  const generated = formatDayLong(new Date());

  const blocks: string[] = [];

  if (sections.custody) {
    const rows = snapshot.occurrences
      .filter((item) => inPeriod(item.date, period))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(formatDayLong(item.date))}</td><td>${escapeHtml(parentName(snapshot, item.custodianMemberId))}</td><td>${item.isOverride ? "Wijziging" : "Schema"}</td></tr>`,
      );
    blocks.push(section("Verblijf", table(["Datum", "Bij", "Bron"], rows)));
  }

  if (sections.handovers) {
    const rows = snapshot.handovers
      .filter((item) => !item.cancelledAt && inPeriod(item.date, period))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(formatDayLong(item.date))}</td><td>${escapeHtml(item.time)}</td><td>${escapeHtml(parentName(snapshot, item.fromMemberId))} → ${escapeHtml(parentName(snapshot, item.toMemberId))}</td><td>${escapeHtml(item.location ?? "—")}</td></tr>`,
      );
    blocks.push(section("Wisselmomenten", table(["Datum", "Tijd", "Overdracht", "Locatie"], rows)));
  }

  if (sections.events) {
    const rows = snapshot.events
      .filter((item) => !item.cancelledAt && inPeriod(item.startsAt.slice(0, 10), period))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(formatDayLong(item.startsAt.slice(0, 10)))}</td><td>${escapeHtml(item.allDay ? "Hele dag" : formatTime(item.startsAt))}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(eventCategoryLabel[item.category])}</td></tr>`,
      );
    blocks.push(section("Agenda", table(["Datum", "Tijd", "Titel", "Type"], rows)));
  }

  if (sections.changes) {
    const rows = snapshot.changeRequests
      .filter((item) => inPeriod(item.targetDate, period))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(formatDayLong(item.targetDate))}</td><td>${escapeHtml(changeRequestLabel[item.type])}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(parentName(snapshot, item.requestedByMemberId))}</td></tr>`,
      );
    blocks.push(section("Wijzigingsvoorstellen", table(["Datum", "Type", "Status", "Door"], rows)));
  }

  if (sections.tasks) {
    const rows = snapshot.tasks
      .filter((item) => {
        if (!item.dueAt) return false;
        return inPeriod(item.dueAt.slice(0, 10), period);
      })
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.dueAt ? formatDayLong(item.dueAt.slice(0, 10)) : "—")}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.status)}</td><td>${item.assigneeMemberId ? escapeHtml(parentName(snapshot, item.assigneeMemberId)) : "—"}</td></tr>`,
      );
    blocks.push(section("Taken", table(["Datum", "Titel", "Status", "Toegewezen"], rows)));
  }

  if (sections.expenses) {
    const rows = snapshot.expenses
      .filter((item) => !item.voidedAt && inPeriod(item.date, period))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(formatDayLong(item.date))}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(formatEuro(item.amountCents))}</td><td>${escapeHtml(expenseCategoryLabel[item.category])}</td></tr>`,
      );
    blocks.push(section("Kosten", table(["Datum", "Omschrijving", "Bedrag", "Categorie"], rows)));
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>${familyName} — overzicht</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1a1a1a; margin: 2rem; line-height: 1.5; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .meta { color: #666; margin-bottom: 2rem; font-size: 0.95rem; }
    section { margin-bottom: 2rem; page-break-inside: avoid; }
    h2 { font-size: 1.15rem; border-bottom: 1px solid #ddd; padding-bottom: 0.35rem; margin-bottom: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.45rem 0.5rem; border-bottom: 1px solid #eee; vertical-align: top; }
    th { font-weight: 600; color: #444; }
    .empty { color: #888; font-style: italic; }
    @media print { body { margin: 1rem; } }
  </style>
</head>
<body>
  <h1>${familyName}</h1>
  <p class="meta">Periode ${escapeHtml(fromLabel)} t/m ${escapeHtml(toLabel)} · gegenereerd ${escapeHtml(generated)}</p>
  ${blocks.length ? blocks.join("\n") : '<p class="empty">Geen gegevens voor deze periode.</p>'}
</body>
</html>`;
}

export function buildFamilyOverviewJson(
  snapshot: FamilySnapshot,
  period: ExportPeriod,
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
): Record<string, unknown> {
  return {
    family: snapshot.family.name,
    period,
    generatedAt: new Date().toISOString(),
    custody: sections.custody
      ? snapshot.occurrences.filter((item) => inPeriod(item.date, period))
      : undefined,
    handovers: sections.handovers
      ? snapshot.handovers.filter((item) => !item.cancelledAt && inPeriod(item.date, period))
      : undefined,
    events: sections.events
      ? snapshot.events.filter((item) => !item.cancelledAt && inPeriod(item.startsAt.slice(0, 10), period))
      : undefined,
    changeRequests: sections.changes
      ? snapshot.changeRequests.filter((item) => inPeriod(item.targetDate, period))
      : undefined,
    tasks: sections.tasks
      ? snapshot.tasks.filter((item) => item.dueAt && inPeriod(item.dueAt.slice(0, 10), period))
      : undefined,
    expenses: sections.expenses
      ? snapshot.expenses.filter((item) => !item.voidedAt && inPeriod(item.date, period))
      : undefined,
  };
}

function section(title: string, body: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function table(headers: string[], rows: string[]): string {
  if (!rows.length) return '<p class="empty">Geen items in deze periode.</p>';
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

export async function exportFamilyOverview(
  snapshot: FamilySnapshot,
  period: ExportPeriod,
  format: ExportFormat,
  sections?: ExportSections,
): Promise<{ ok: true; content: string; mimeType: string; filename: string }> {
  if (format === "json") {
    return {
      ok: true,
      content: JSON.stringify(buildFamilyOverviewJson(snapshot, period, sections), null, 2),
      mimeType: "application/json",
      filename: `famli-overzicht-${period.from}-${period.to}.json`,
    };
  }
  return {
    ok: true,
    content: buildFamilyOverviewHtml(snapshot, period, sections),
    mimeType: "text/html",
    filename: `famli-overzicht-${period.from}-${period.to}.html`,
  };
}
