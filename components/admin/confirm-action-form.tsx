"use client";

import { useState } from "react";

export function ConfirmActionForm({
  action,
  title,
  confirmLabel,
  extraFields,
  destructive = false,
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  confirmLabel: string;
  extraFields?: React.ReactNode;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          destructive
            ? "rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800"
            : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
        }
      >
        {title}
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {extraFields}
      <label className="block text-xs">
        Reden (verplicht)
        <input name="reason" required className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
      </label>
      <div className="flex gap-2">
        <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white">{confirmLabel}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500">
          Annuleren
        </button>
      </div>
    </form>
  );
}
