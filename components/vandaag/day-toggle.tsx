import Link from "next/link";
import { cn } from "@/lib/utils";

export function DayToggle({ active }: { active: "today" | "tomorrow" }) {
  return (
    <div className="inline-flex rounded-2xl bg-[color:var(--famli-elevated)] p-1 shadow-[var(--famli-shadow-rest)]">
      <Link
        href="/vandaag"
        className={cn(
          "inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-xl px-4 text-sm font-medium",
          active === "today"
            ? "bg-[color:var(--famli-surface)] text-[color:var(--famli-ink)]"
            : "text-[color:var(--famli-muted)]",
        )}
      >
        Vandaag
      </Link>
      <Link
        href="/vandaag?dag=morgen"
        className={cn(
          "inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-xl px-4 text-sm font-medium",
          active === "tomorrow"
            ? "bg-[color:var(--famli-surface)] text-[color:var(--famli-ink)]"
            : "text-[color:var(--famli-muted)]",
        )}
      >
        Morgen
      </Link>
    </div>
  );
}
