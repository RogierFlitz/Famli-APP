import { SHOPPING_NOT_ACTIVATED_MESSAGE } from "@/lib/shopping/errors";

export function ShoppingNotActivated({ familyName }: { familyName: string }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Boodschappen</h1>
        <p className="mt-1 text-[color:var(--famli-muted)]">
          Gedeelde lijst voor {familyName}
        </p>
      </header>
      <div
        role="status"
        className="famli-card rounded-3xl border border-amber-200/80 bg-amber-50/60 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20"
      >
        <p className="text-base font-medium text-[color:var(--famli-ink)]">
          {SHOPPING_NOT_ACTIVATED_MESSAGE}
        </p>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          De rest van Famli blijft gewoon werken. Na de migratie kun je hier je gezinslijst
          gebruiken.
        </p>
      </div>
    </div>
  );
}
