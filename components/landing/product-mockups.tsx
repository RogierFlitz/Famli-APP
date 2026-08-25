export function ProductMockups() {
  return (
    <div className="relative mt-12 lg:mt-0">
      <div className="famli-card rounded-[2rem] p-5 shadow-[var(--famli-shadow-lift)]">
        <p className="text-2xl font-semibold tracking-tight">Goedemorgen, Emma</p>
        <p className="mt-1 text-sm text-[color:var(--famli-muted)]">Vandaag bij papa · overdracht om 17:00</p>
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-[color:var(--famli-parent-1)]/35 p-4">
            <p className="text-xs text-[color:var(--famli-muted)]">17:00 — Overdracht</p>
            <p className="mt-1 font-medium">Kinderen naar mama</p>
            <p className="text-sm text-[color:var(--famli-muted)]">Ophalen bij school · stick, bitje, bidon</p>
          </div>
          <div className="rounded-2xl bg-[color:var(--famli-sport)]/40 p-4">
            <p className="text-xs text-[color:var(--famli-muted)]">18:00 — Hockey Roxy</p>
            <p className="mt-1 font-medium">Sportpark</p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-4 hidden w-56 rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)]/90 p-4 backdrop-blur sm:block">
        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--famli-muted)]">Agenda</p>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-[color:var(--famli-muted)]">
          {["M", "D", "W", "D", "V", "Z", "Z"].map((d) => (
            <span key={d}>{d}</span>
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={`rounded-md py-1 ${i % 3 === 0 ? "bg-[color:var(--famli-parent-1)]/50" : "bg-[color:var(--famli-parent-2)]/45"}`}
            >
              {i + 10}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
