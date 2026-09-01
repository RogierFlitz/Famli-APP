import Link from "next/link";

export default function AdminDeniedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-xs uppercase tracking-wider text-slate-500">Famli intern</p>
        <h1 className="mt-2 text-2xl font-semibold">Geen toegang</h1>
        <p className="mt-3 text-sm text-slate-600">
          Dit account hoort bij de gezinsapp en heeft geen adminrol. Beheer is alleen voor interne medewerkers.
        </p>
        <Link href="/vandaag" className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Terug naar Famli
        </Link>
      </div>
    </div>
  );
}
