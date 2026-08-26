import { inviteMemberAction } from "@/lib/actions/members";
import { relationTypeLabel, permissionPresetLabel, roleLabel } from "@/lib/domain/labels";
import { canManageMembers } from "@/lib/members/permissions";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot } from "@/lib/domain/types";

export function FamilyMembersPanel({ snapshot }: { snapshot: FamilySnapshot }) {
  const canManage = canManageMembers(snapshot);

  return (
    <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Ons gezin</h2>
      <p className="mt-1 text-sm text-[color:var(--nest-muted)]">
        Kinderen zijn gedeeld tussen huishoudens. Partners krijgen nooit automatisch volledige ouderrechten.
      </p>

      {snapshot.households.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {snapshot.households.map((household) => (
            <div key={household.id} className="rounded-2xl bg-[color:var(--nest-bg)] px-4 py-3 text-sm">
              <p className="font-medium">{household.name}</p>
              <p className="text-[color:var(--nest-muted)]">
                {household.memberIds.map((id) => parentName(snapshot, id)).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="mt-4 space-y-3 text-sm">
        {snapshot.members.map((member) => (
          <li key={member.id} className="rounded-2xl border border-[color:var(--nest-border)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {member.parentLabel}
                  {member.userId && snapshot.profiles[member.userId]
                    ? ` · ${snapshot.profiles[member.userId].firstName}`
                    : ""}
                </p>
                <p className="text-[color:var(--nest-muted)]">
                  {relationTypeLabel[member.relationType]}
                  {member.contactOnly ? " · alleen contact" : ""}
                  {member.linkedParentMemberId
                    ? ` · gekoppeld aan ${parentName(snapshot, member.linkedParentMemberId).toLowerCase()}`
                    : ""}
                </p>
                {!member.contactOnly ? (
                  <p className="mt-1 text-xs text-[color:var(--nest-muted)]">
                    {permissionPresetLabel[member.permissionPreset]}
                    {!member.permissions.acceptChangeRequests ? " · geen wijzigingsverzoeken" : ""}
                  </p>
                ) : null}
              </div>
              <span className="text-[color:var(--nest-muted)]">
                {roleLabel[member.role]} · {member.status}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {canManage ? (
        <form action={inviteMemberAction} className="mt-5 grid gap-2">
          <h3 className="font-medium">Gezinslid toevoegen</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="parentLabel" required placeholder="Naam / label" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <select name="relationType" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
              {Object.entries(relationTypeLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input name="email" type="email" placeholder="E-mail (optioneel bij contact)" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <select name="permissionPreset" defaultValue="involved" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
              {Object.entries(permissionPresetLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="householdId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
              <option value="">Geen huishouden</option>
              {snapshot.households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
            <select name="linkedParentMemberId" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3">
              <option value="">Gekoppeld aan ouder</option>
              {snapshot.members
                .filter((member) => member.relationType === "ouder")
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {parentName(snapshot, member.id)}
                  </option>
                ))}
            </select>
            <input name="phone" placeholder="Telefoon (contact)" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3 sm:col-span-2" />
          </div>
          <fieldset className="rounded-2xl border border-[color:var(--nest-border)] px-4 py-3">
            <legend className="px-1 text-sm">Toegang per kind</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {snapshot.children.map((child) => (
                <label key={child.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="childIds" value={child.id} defaultChecked />
                  {child.firstName}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="contactOnly" value="true" />
            Alleen contact (geen login)
          </label>
          <button className="h-12 rounded-full bg-[color:var(--nest-ink)] px-4 text-white sm:w-fit">Uitnodigen</button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-[color:var(--nest-muted)]">
          Alleen ouders kunnen gezinsleden beheren.
        </p>
      )}
    </section>
  );
}
