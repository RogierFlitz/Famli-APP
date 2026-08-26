"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3 text-left"
      >
        <span className="text-lg font-semibold">
          {title}
          {count != null ? ` (${count})` : ""}
        </span>
        <span className="text-sm text-[color:var(--famli-muted)]">{open ? "Verbergen" : "Tonen"}</span>
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  );
}

export function ExpandableList<T>({
  items,
  initialLimit,
  renderItem,
  className,
}: {
  items: T[];
  initialLimit: number;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const [limit, setLimit] = useState(initialLimit);
  const visible = items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div className={cn("space-y-2", className)}>
      {visible.map(renderItem)}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setLimit((value) => value + initialLimit)}
          className="text-sm font-medium text-[color:var(--famli-brand)]"
        >
          Meer tonen
        </button>
      ) : null}
    </div>
  );
}
