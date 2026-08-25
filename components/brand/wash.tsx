export function FamliWash({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative isolate min-h-dvh overflow-hidden ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -top-20 -left-12 size-[22rem] rounded-full bg-[color:var(--famli-blue)]/25 blur-3xl" />
        <span className="absolute top-32 -right-10 size-[20rem] rounded-full bg-[color:var(--famli-coral)]/28 blur-3xl" />
        <span className="absolute -bottom-16 left-[20%] size-[22rem] rounded-full bg-[color:var(--famli-yellow)]/22 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
