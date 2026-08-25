import { cn } from "@/lib/utils";
import { famliBrand, famliColor } from "@/lib/brand/tokens";

type MarkProps = {
  className?: string;
  title?: string;
  /** Colourful mark, or a single currentColor for 24×24 / mono icons. */
  mono?: boolean;
};

function MarkShapes({
  parentA = famliColor.blue,
  parentB = famliColor.coral,
  child = famliColor.yellow,
  childStroke,
}: {
  parentA?: string;
  parentB?: string;
  child?: string;
  childStroke?: string;
}) {
  return (
    <>
      <g fill={parentA}>
        <circle cx="15.5" cy="15.5" r="8" />
        <ellipse cx="16.5" cy="40" rx="11" ry="18.5" transform="rotate(-14 16.5 40)" />
      </g>
      <g fill={parentB}>
        <circle cx="48.5" cy="15.5" r="8" />
        <ellipse cx="47.5" cy="40" rx="11" ry="18.5" transform="rotate(14 47.5 40)" />
      </g>
      <g fill={child} stroke={childStroke} strokeWidth={childStroke ? 2.2 : 0}>
        <circle cx="32" cy="24.5" r="7" />
        <ellipse cx="32" cy="41" rx="8" ry="13.5" />
      </g>
    </>
  );
}

/** Twee ouders die één kind beschermen. Blijft leesbaar op 24×24. */
export function FamliMark({ className, title = famliBrand.name, mono = false }: MarkProps) {
  const fill = "currentColor";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {mono ? (
        <MarkShapes parentA={fill} parentB={fill} child={fill} />
      ) : (
        <MarkShapes childStroke={famliColor.light} />
      )}
    </svg>
  );
}

export function FamliAppIcon({
  className,
  size,
  variant = "light",
}: {
  className?: string;
  size?: number;
  variant?: "light" | "dark" | "mono";
}) {
  const background =
    variant === "dark" ? famliColor.navy : variant === "mono" ? famliColor.light : famliColor.surface;
  const mono = variant === "mono";
  const parentA = mono ? famliColor.navy : famliColor.blue;
  const parentB = mono ? famliColor.navy : famliColor.coral;
  const child = mono ? famliColor.navy : famliColor.yellow;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={famliBrand.name}
    >
      <title>{famliBrand.name}</title>
      <rect width="64" height="64" rx="14" fill={background} />
      <g transform="translate(3 2) scale(0.9)">
        <MarkShapes parentA={parentA} parentB={parentB} child={child} childStroke={variant === "dark" ? famliColor.navy : famliColor.light} />
      </g>
    </svg>
  );
}

export function FamliWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center font-semibold tracking-tight", className)}>
      <span>faml</span>
      <span className="relative overflow-visible">
        i
        <span
          className="pointer-events-none absolute -top-[0.12em] left-1/2 z-10 block h-[0.55em] w-[0.55em] -translate-x-1/2 rounded-full bg-[#FBBF24]"
          aria-hidden
        />
      </span>
    </span>
  );
}

export function FamliLogo({
  className,
  markClassName,
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[color:var(--famli-ink)]", className)}>
      <FamliMark className={cn("size-8", markClassName)} />
      {wordmark ? (
        <FamliWordmark className="text-[1.35rem]" />
      ) : (
        <span className="sr-only">{famliBrand.name}</span>
      )}
    </span>
  );
}

/** @deprecated Use FamliLogo */
export function NestlyMark(props: { className?: string }) {
  return <FamliLogo className={props.className} />;
}
