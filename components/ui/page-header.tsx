import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm text-[color:var(--famli-muted)]">{eyebrow}</p> : null}
        <h1 className="mt-0.5 text-[1.85rem] font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-4xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[color:var(--famli-muted)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
    </header>
  );
}

export function PageSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="famli-section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
