"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchFamily } from "@/lib/search";
import type { FamilySnapshot } from "@/lib/domain/types";

export function FamilySearch({ snapshot }: { snapshot: FamilySnapshot }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = searchFamily(snapshot, query);
  const open = hits.length > 0 && (query.length >= 2 || focused);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileOpen(true);
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-w-0 lg:mx-auto lg:w-full lg:max-w-[36rem]">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full border border-[color:var(--famli-border)] bg-[color:var(--famli-elevated)] text-[color:var(--famli-muted)] lg:hidden"
        aria-label="Zoeken in Famli"
        onClick={() => {
          setMobileOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        hidden={mobileOpen}
      >
        <Search className="size-4" />
      </button>
      <div className={mobileOpen ? "relative block" : "relative hidden lg:block"}>
        <label className="sr-only" htmlFor="famli-search">
          Zoek in Famli
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--famli-muted)]" />
        <input
          ref={inputRef}
          id="famli-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (!query) setMobileOpen(false);
          }}
          placeholder="Zoek kind, afspraak, document…"
          className="h-11 w-full rounded-full border border-[color:var(--famli-border)] bg-[color:var(--famli-elevated)] pl-10 pr-24 text-sm leading-none outline-none focus-visible:border-[color:var(--famli-blue)] focus-visible:ring-2 focus-visible:ring-[color:var(--famli-blue)]/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[color:var(--famli-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--famli-muted)] lg:inline">
          ⌘K / Ctrl+K
        </kbd>
      </div>
      {open && hits.length ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-elevated)] shadow-[var(--famli-shadow-lift)]">
          {hits.map((hit) => (
            <Link
              key={hit.id}
              href={hit.href}
              onClick={() => {
                setQuery("");
                setFocused(false);
                setMobileOpen(false);
              }}
              className="block px-4 py-3 hover:bg-[color:var(--famli-surface)]"
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
