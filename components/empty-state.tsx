import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  className,
  tone = "neutral",
}: {
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className={cn("py-1", className)}>
      <p
        className={cn(
          "text-sm font-medium",
          tone === "success" ? "text-[color:var(--famli-success)]" : "text-[color:var(--famli-ink)]",
        )}
      >
        {tone === "success" ? `✓ ${title}` : title}
      </p>
      {body ? <p className="mt-0.5 text-sm leading-6 text-[color:var(--famli-muted)]">{body}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--famli-brand)]">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
