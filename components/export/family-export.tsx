"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { exportFamilyOverviewAction } from "@/lib/actions/messages";
import { toISODate } from "@/lib/dates";

export function FamilyExportPanel() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(toISODate(new Date()));
  const [format, setFormat] = useState<"html" | "json">("html");
  const [pending, startTransition] = useTransition();

  function download(content: string, mimeType: string, filename: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openPrint(content: string) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up geblokkeerd — download de HTML en open in je browser.");
      return;
    }
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function exportOverview() {
    const formData = new FormData();
    formData.set("from", from);
    formData.set("to", to);
    formData.set("format", format);
    startTransition(async () => {
      try {
        const result = await exportFamilyOverviewAction(formData);
        if (format === "html") {
          openPrint(result.content);
        } else {
          download(result.content, result.mimeType, result.filename);
        }
        toast.success("Overzicht gegenereerd");
      } catch {
        toast.error("Export mislukt");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5">
      <h2 className="text-lg font-semibold">Gezinsoverzicht exporteren</h2>
      <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
        Kies een periode voor verblijf, wissels, agenda, verzoeken, taken en kosten. HTML opent direct als print/PDF.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-[color:var(--famli-muted)]">Van</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="famli-input mt-1 w-full" />
        </label>
        <label className="text-sm">
          <span className="text-[color:var(--famli-muted)]">Tot</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="famli-input mt-1 w-full" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="exportFormat" checked={format === "html"} onChange={() => setFormat("html")} />
          HTML / PDF printen
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="exportFormat" checked={format === "json"} onChange={() => setFormat("json")} />
          JSON download
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={exportOverview}
        className="famli-btn famli-btn-primary mt-4 h-11 px-5"
      >
        {pending ? "Bezig…" : "Exporteer overzicht"}
      </button>
    </section>
  );
}
