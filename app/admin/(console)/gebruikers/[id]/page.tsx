import Link from "next/link";
import {
  addAdminSupportNote,
  blockUserAccount,
  requestElevatedInzage,
  resetOnboarding,
  retryCalendarSync,
  unblockUserAccount,
} from "@/lib/admin/actions";
import { loadAdminDirectory, loadPendingInvites } from "@/lib/admin/directory";
import { loadAuditLog, loadSupportNotes } from "@/lib/admin/logs";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { getAccountFlag } from "@/lib/admin/memory";
import { notFound } from "next/navigation";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const actor = await requireAdmin();
  const { id } = await params;
  const flash = await searchParams;
  const { users, families } = await loadAdminDirectory();
  const user = users.find((item) => item.id === id);
  if (!user) notFound();
  const family = families.find((item) => item.id === user.familyId);
  const notes = await loadSupportNotes({ targetUserId: id });
  const audit = (await loadAuditLog()).filter((item) => item.targetUserId === id);
  const invites = (await loadPendingInvites()).filter(
    (item) => item.familyId === user.familyId || item.email.toLowerCase() === user.email.toLowerCase(),
  );
  const flag = getAccountFlag(id);
  const familyMembers = users.filter((item) => item.familyId === user.familyId);

  return (
    <div className="space-y-6">
      <Link href="/admin/gebruikers" className="text-sm text-slate-500 hover:underline">
        ← Gebruikers
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        {flash.ok ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash.ok}</p> : null}
        {flash.error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{flash.error}</p> : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div>User-id: <span className="font-mono text-xs">{user.id}</span></div>
            <div>Aangemaakt: {new Date(user.createdAt).toLocaleString("nl-NL")}</div>
            <div>Laatste login/activiteit: {user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString("nl-NL") : "—"}</div>
            <div>Status: {user.accountStatus === "blocked" ? "Geblokkeerd" : "Actief"}</div>
            {flag.blockedReason ? <div>Blokkade: {flag.blockedReason}</div> : null}
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gezin</h2>
          {family ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div>
                Family-id:{" "}
                <Link href={`/admin/gezinnen/${family.id}`} className="font-mono text-xs underline">
                  {family.id}
                </Link>
              </div>
              <div>Naam: {family.name}</div>
              <div>Leden: {familyMembers.map((item) => item.firstName).join(", ")}</div>
              <div>Kinderen: {family.childCount}</div>
              <div>Onboarding: {user.onboardingCompleted ? "Afgerond" : "Open"}</div>
              <div>Open uitnodigingen: {invites.length}</div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Geen gezin gekoppeld.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Integraties</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Microsoft: {user.microsoftConnected ? "ja" : "nee"}</li>
            <li>Google: {user.googleConnected ? "ja" : "nee"}</li>
            <li>Apple ICS: {user.appleIcs ? "ja" : "nee"}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Technische status</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Laatste sync: {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleString("nl-NL") : "—"}</li>
            <li>Laatste fout: {user.lastSyncError ?? "geen"}</li>
            <li>
              Notificaties:{" "}
              {user.notificationChannels
                ? `in-app ${user.notificationChannels.inApp ? "aan" : "uit"}, e-mail ${user.notificationChannels.email ? "aan" : "uit"}, push ${user.notificationChannels.push ? "aan" : "uit"}`
                : "onbekend"}
            </li>
            <li>Feature-status: plan {family?.plan ?? "—"} / {family?.subscriptionStatus ?? "—"}</li>
          </ul>
        </div>
      </section>

      {adminHasCapability(actor.role, "manage_users") ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Wachtwoord</h2>
          <p className="mt-2 text-sm text-slate-600">
            Zet een nieuw wachtwoord. De gebruiker kan daarna meteen inloggen in de gezinsapp. Het wachtwoord wordt niet
            getoond of gelogd.
          </p>
          <form action="/admin/users/password" method="post" className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />
            <label className="block text-sm sm:col-span-2">
              Reden (verplicht, voor de auditlog)
              <input name="reason" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Nieuw wachtwoord
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Bevestigen
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white sm:col-span-2">
              Wachtwoord opslaan
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Acties</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {adminHasCapability(actor.role, "block_account") ? (
            user.accountStatus === "blocked" ? (
              <ConfirmActionForm
                action={unblockUserAccount}
                title="Deblokkeren"
                confirmLabel="Deblokkeren"
                extraFields={<input type="hidden" name="userId" value={user.id} />}
              />
            ) : (
              <ConfirmActionForm
                action={blockUserAccount}
                title="Account blokkeren"
                confirmLabel="Blokkeren"
                destructive
                extraFields={<input type="hidden" name="userId" value={user.id} />}
              />
            )
          ) : null}
          {adminHasCapability(actor.role, "reset_onboarding") ? (
            <ConfirmActionForm
              action={resetOnboarding}
              title="Onboarding resetten"
              confirmLabel="Resetten"
              extraFields={<input type="hidden" name="userId" value={user.id} />}
            />
          ) : null}
          {adminHasCapability(actor.role, "retry_sync") ? (
            <ConfirmActionForm
              action={retryCalendarSync}
              title="Sync opnieuw vragen"
              confirmLabel="Registreren"
              extraFields={
                <>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="familyId" value={user.familyId ?? ""} />
                </>
              }
            />
          ) : null}
          {adminHasCapability(actor.role, "elevate_privacy") ? (
            <ConfirmActionForm
              action={requestElevatedInzage}
              title="Elevated inzage aanvragen"
              confirmLabel="Alleen loggen (geen privé-inhoud)"
              extraFields={
                <>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="familyId" value={user.familyId ?? ""} />
                </>
              }
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Supportnotities</h2>
        {adminHasCapability(actor.role, "add_support_note") ? (
          <form action={addAdminSupportNote} className="mt-3 space-y-2">
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="familyId" value={user.familyId ?? ""} />
            <textarea name="body" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white">Notitie opslaan</button>
          </form>
        ) : null}
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p>{note.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.authorName} · {new Date(note.createdAt).toLocaleString("nl-NL")}
              </p>
            </li>
          ))}
          {notes.length === 0 ? <li className="text-sm text-slate-500">Nog geen notities.</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Supportacties</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-mono text-xs">{entry.action}</span>
              {entry.reason ? <span className="text-slate-500"> — {entry.reason}</span> : null}
              <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("nl-NL")}</p>
            </li>
          ))}
          {audit.length === 0 ? <li className="text-slate-500">Nog geen acties op dit account.</li> : null}
        </ul>
      </section>
    </div>
  );
}
