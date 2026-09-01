import Link from "next/link";
import { cn } from "@/lib/utils";

export function TimelineItem({
  href,
  time,
  title,
  meta,
  accent,
}: {
  href: string;
  time?: string | null;
  title: string;
  meta?: string | null;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 gap-3 rounded-2xl px-1 py-2.5 transition-colors hover:bg-[color:var(--famli-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--famli-brand)]",
        accent && "bg-[color:var(--famli-brand-soft)]/50 px-3",
      )}
    >
      <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-[color:var(--famli-muted)]">{time ?? "Dag"}</span>
      <div className="min-w-0">
        <p className="font-medium text-[color:var(--famli-ink)]">{title}</p>
        {meta ? <p className="text-sm text-[color:var(--famli-muted)]">{meta}</p> : null}
      </div>
    </Link>
  );
}

export function InfoRow({
  href,
  title,
  meta,
  trailing,
}: {
  href?: string;
  title: string;
  meta?: string | null;
  trailing?: string | null;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {meta ? <p className="text-sm text-[color:var(--famli-muted)]">{meta}</p> : null}
      </div>
      {trailing ? <p className="shrink-0 text-sm font-medium text-[color:var(--famli-ink)]">{trailing}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="famli-row hover:bg-[color:var(--famli-surface)]/80">
        {inner}
      </Link>
    );
  }
  return <div className="famli-row">{inner}</div>;
}
