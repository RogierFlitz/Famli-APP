import { addAdminSupportNote, resendInvite } from "@/lib/admin/actions";
import { loadPendingInvites } from "@/lib/admin/directory";
import { loadSupportNotes } from "@/lib/admin/logs";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";

export default async function AdminSupportPage() {
  const actor = await requireAdmin();
  const notes = await loadSupportNotes();
  const invites = await loadPendingInvites();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Support</h1>
      {adminHasCapability(actor.role, "add_support_note") ? (
        <form action={addAdminSupportNote} className="rounded-xl border border-slate-200 bg-white p-4">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Interne notitie"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white">Opslaan</button>
        </form>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Openstaande uitnodigingen</h2>
        <ul className="mt-3 space-y-2">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
              <span>
                {invite.email} · verloopt {new Date(invite.expiresAt).toLocaleDateString("nl-NL")}
              </span>
              {adminHasCapability(actor.role, "resend_invite") ? (
                <ConfirmActionForm
                  action={resendInvite}
                  title="Opnieuw versturen"
                  confirmLabel="Versturen"
                  extraFields={
                    <>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <input type="hidden" name="familyId" value={invite.familyId} />
                    </>
                  }
                />
              ) : null}
            </li>
          ))}
          {invites.length === 0 ? <li className="text-sm text-slate-500">Geen openstaande uitnodigingen.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notities</h2>
        <ul className="mt-3 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
              <p>{note.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.authorName} · {new Date(note.createdAt).toLocaleString("nl-NL")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
