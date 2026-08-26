import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-6", className)}>
      <p className="font-medium">{title}</p>
      {body ? <p className="mt-1 text-sm leading-6 text-[color:var(--famli-muted)]">{body}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="famli-btn famli-btn-secondary mt-4 h-10 px-4 text-sm">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
