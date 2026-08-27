import { SHOPPING_LOAD_ERROR_MESSAGE } from "@/lib/shopping/errors";

export function ShoppingLoadError({
  familyName,
  message = SHOPPING_LOAD_ERROR_MESSAGE,
}: {
  familyName?: string;
  message?: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Boodschappen</h1>
        {familyName ? (
          <p className="mt-1 text-[color:var(--famli-muted)]">
            Gedeelde lijst voor {familyName}
          </p>
        ) : null}
      </header>
      <div
        role="alert"
        className="famli-card rounded-3xl border border-rose-200/80 bg-rose-50/60 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20"
      >
        <p className="text-base font-medium text-[color:var(--famli-ink)]">{message}</p>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Blijf gerust andere onderdelen van Famli gebruiken. Werkt het na vernieuwen nog niet,
          neem dan contact op met de beheerder.
        </p>
      </div>
    </div>
  );
}
