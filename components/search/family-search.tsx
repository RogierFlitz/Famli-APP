"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchFamily } from "@/lib/search";
import type { FamilySnapshot } from "@/lib/domain/types";

export function FamilySearch({ snapshot }: { snapshot: FamilySnapshot }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const hits = searchFamily(snapshot, query);

  useEffect(() => {
    if (query.length < 2) setOpen(false);
    else setOpen(true);
  }, [query]);

  return (
    <div className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor="famli-search">
        Zoeken
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--famli-muted)]" />
      <input
        id="famli-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder="Zoek schoenmaat, hockey, reis..."
        className="h-11 w-full rounded-full border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] pl-10 pr-4 text-sm"
      />
      {open && hits.length ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] shadow-lg">
          {hits.map((hit) => (
            <Link
              key={hit.id}
              href={hit.href}
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="block px-4 py-3 hover:bg-[color:var(--famli-bg)]"
            >
              <p className="font-medium">{hit.title}</p>
              {hit.detail ? <p className="text-sm text-[color:var(--famli-muted)]">{hit.detail}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
