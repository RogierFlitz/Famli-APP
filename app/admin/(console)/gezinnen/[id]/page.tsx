import Link from "next/link";
import { addAdminSupportNote } from "@/lib/admin/actions";
import { loadAdminDirectory, loadPendingInvites } from "@/lib/admin/directory";
import { loadSupportNotes } from "@/lib/admin/logs";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { notFound } from "next/navigation";

export default async function AdminFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const { families, users } = await loadAdminDirectory();
  const family = families.find((item) => item.id === id);
  if (!family) notFound();
  const members = users.filter((item) => item.familyId === id);
  const notes = await loadSupportNotes({ familyId: id });
  const invites = (await loadPendingInvites()).filter((item) => item.familyId === id);

  return (
    <div className="space-y-6">
      <Link href="/admin/gezinnen" className="text-sm text-slate-500 hover:underline">
        ← Gezinnen
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{family.name}</h1>
        <p className="font-mono text-xs text-slate-500">{family.id}</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Status</h2>
          <ul className="mt-3 space-y-1">
            <li>Hoofdgebruiker: {family.ownerEmail ?? "—"}</li>
            <li>Leden: {family.memberCount}</li>
            <li>Kinderen: {family.childCount} (aantal, geen dossiers)</li>
            <li>Aangemaakt: {new Date(family.createdAt).toLocaleString("nl-NL")}</li>
            <li>Laatste activiteit: {family.lastActivityAt ? new Date(family.lastActivityAt).toLocaleString("nl-NL") : "—"}</li>
            <li>
              Onboarding: {family.onboardingCompletedCount}/{family.memberCount}
            </li>
            <li>
              Integraties: Google {family.googleCount}, Microsoft {family.microsoftCount}, Apple {family.appleCount}
            </li>
            <li>
              Account: {family.plan} / {family.subscriptionStatus}
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Leden</h2>
          <ul className="mt-3 space-y-2">
            {members.map((member) => (
              <li key={member.id}>
                <Link href={`/admin/gebruikers/${member.id}`} className="hover:underline">
                  {member.firstName} {member.lastName}
                </Link>{" "}
                <span className="text-slate-500">({member.familyRole})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Uitnodigingen</h2>
          <ul className="mt-3 space-y-1">
            {invites.map((invite) => (
              <li key={invite.id}>
                {invite.email} · tot {new Date(invite.expiresAt).toLocaleDateString("nl-NL")}
              </li>
            ))}
            {invites.length === 0 ? <li className="text-slate-500">Geen openstaande uitnodigingen.</li> : null}
          </ul>
        </div>
      </section>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Geen agenda-inhoud, documenten, kostenregels of privénotities. Elevated inzage logt alleen de aanvraag en geeft geen privé-payload.
      </p>
      {adminHasCapability(actor.role, "add_support_note") ? (
        <form action={addAdminSupportNote} className="rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="familyId" value={family.id} />
          <textarea name="body" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white">Supportnotitie</button>
        </form>
      ) : null}
      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
            {note.body}
            <p className="mt-1 text-xs text-slate-500">{note.authorName}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
