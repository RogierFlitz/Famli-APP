"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { createImportJobAction } from "@/lib/actions/messages";
import { IMPORT_SOURCES } from "@/lib/architecture/import";

export function ImportShell({ compact = false }: { compact?: boolean }) {
  const [source, setSource] = useState<(typeof IMPORT_SOURCES)[number]["id"]>("photo");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    const formData = new FormData();
    formData.set("source", source);
    if (file) formData.set("fileName", file.name);
    startTransition(async () => {
      try {
        await createImportJobAction(formData);
        toast.message("Bestand ontvangen", {
          description: "Automatisch uitlezen volgt binnenkort. Je kunt het item handmatig toevoegen via +.",
        });
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        toast.error("Upload mislukt");
      }
    });
  }

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-dashed border-[color:var(--famli-border)] p-4"
          : "rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5"
      }
    >
      {!compact ? (
        <>
          <h2 className="text-lg font-semibold">Slim importeren</h2>
          <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
            Upload een uitnodiging of screenshot. Famli maakt er binnenkort automatisch een afspraak van — nu alvast
            opslaan.
          </p>
        </>
      ) : null}
      <div className={compact ? "space-y-2" : "mt-4 space-y-3"}>
        <select
          value={source}
          onChange={(event) => setSource(event.target.value as typeof source)}
          className="famli-input w-full text-sm"
        >
          {IMPORT_SOURCES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="famli-input w-full text-sm" />
        <button
          type="button"
          disabled={pending}
          onClick={handleUpload}
          className="famli-btn famli-btn-secondary inline-flex h-10 items-center gap-2 px-4 text-sm"
        >
          <Upload className="size-4" />
          {pending ? "Bezig…" : "Uploaden (binnenkort parser)"}
        </button>
      </div>
    </section>
  );
}
