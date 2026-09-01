"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-xs uppercase tracking-wider text-slate-500">Famli intern</p>
        <h1 className="mt-2 text-2xl font-semibold">Beheer kon deze pagina niet tonen</h1>
        <p className="mt-3 text-sm text-slate-600">
          Dit is een fout in de beheerpagina, geen vastgelopen browser-tabblad. Probeer opnieuw, of open{" "}
          <a className="underline" href="/admin/ok">
            /admin/ok
          </a>{" "}
          om te zien of de server reageert.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Opnieuw
        </button>
        <a href="/admin" className="mt-3 block text-center text-sm text-slate-600 underline">
          Terug naar inloggen
        </a>
        {error.digest ? <p className="mt-4 text-xs text-slate-400">code {error.digest}</p> : null}
      </div>
    </div>
  );
}
