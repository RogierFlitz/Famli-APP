import { cn } from "@/lib/utils";

export function MarketingSection({
  id,
  children,
  className,
  tinted = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto max-w-6xl px-5 py-16 sm:py-20",
        tinted && "rounded-[2rem] bg-[color:var(--famli-card)]/70 shadow-[var(--famli-shadow-rest)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-sm font-medium tracking-wide text-[color:var(--famli-brand)]">
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("mb-10 max-w-2xl", centered && "mx-auto text-center")}>
      <h2 className="text-3xl font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-7 text-[color:var(--famli-muted)] sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

const avatarColors: Record<string, string> = {
  E: "bg-[color:var(--famli-parent-1)] text-white",
  T: "bg-[color:var(--famli-parent-2)] text-white",
  S: "bg-[color:var(--famli-yellow)] text-[color:var(--famli-ink)]",
  R: "bg-[color:var(--famli-sport)] text-white",
  L: "bg-[color:var(--famli-school)] text-white",
  M: "bg-[color:var(--famli-important)] text-white",
};

export function MemberAvatar({
  initial,
  size = "md",
  className,
}: {
  initial: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const letter = initial.charAt(0).toUpperCase();
  const color = avatarColors[letter] ?? "bg-muted text-[color:var(--famli-ink)]";
  const sizeClass =
    size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-10 text-sm" : "size-8 text-xs";

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-[color:var(--famli-card)]",
        sizeClass,
        color,
        className,
      )}
    >
      {letter}
    </span>
  );
}

export function PreviewCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-4 shadow-[var(--famli-shadow-lift)] transition-transform duration-300 hover:-translate-y-0.5 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--famli-brand-soft)] px-3 py-1 text-xs font-medium text-[color:var(--famli-ink)]">
      {children}
    </span>
  );
}
