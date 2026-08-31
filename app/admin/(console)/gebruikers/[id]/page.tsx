import Link from "next/link";
import {
  addAdminSupportNote,
  blockUserAccount,
  resetOnboarding,
  retryCalendarSync,
  unblockUserAccount,
} from "@/lib/admin/actions";
import { loadAdminDirectory } from "@/lib/admin/directory";
import { loadSupportNotes } from "@/lib/admin/logs";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { getAccountFlag } from "@/lib/admin/memory";
import { notFound } from "next/navigation";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const { users, families } = await loadAdminDirectory();
  const user = users.find((item) => item.id === id);
  if (!user) notFound();
  const family = families.find((item) => item.id === user.familyId);
  const notes = await loadSupportNotes({ targetUserId: id });
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
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div>User-id: <span className="font-mono text-xs">{user.id}</span></div>
            <div>Aangemaakt: {new Date(user.createdAt).toLocaleString("nl-NL")}</div>
            <div>Laatste activiteit: {user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString("nl-NL") : "—"}</div>
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
            <li>Notificaties: metadata alleen, geen berichtinhoud</li>
          </ul>
        </div>
      </section>

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
    </div>
  );
}
