import { formatEuro } from "@/lib/money";

export function SoftCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`famli-card ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--famli-muted)]">
            {kicker}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold text-[color:var(--famli-ink)]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Money({ cents }: { cents: number }) {
  return <span className="tabular-nums">{formatEuro(cents)}</span>;
}
