export const ADMIN_ROLES = ["super_admin", "support_admin", "readonly_admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminCapability =
  | "view_dashboard"
  | "view_users"
  | "view_families"
  | "view_audit"
  | "add_support_note"
  | "block_account"
  | "resend_invite"
  | "reset_onboarding"
  | "retry_sync"
  | "manage_admin_roles"
  | "elevate_privacy";

const ROLE_CAPS: Record<AdminRole, AdminCapability[]> = {
  readonly_admin: ["view_dashboard", "view_users", "view_families", "view_audit"],
  support_admin: [
    "view_dashboard",
    "view_users",
    "view_families",
    "view_audit",
    "add_support_note",
    "resend_invite",
    "reset_onboarding",
    "retry_sync",
  ],
  super_admin: [
    "view_dashboard",
    "view_users",
    "view_families",
    "view_audit",
    "add_support_note",
    "block_account",
    "resend_invite",
    "reset_onboarding",
    "retry_sync",
    "manage_admin_roles",
    "elevate_privacy",
  ],
};

export function adminHasCapability(role: AdminRole, capability: AdminCapability): boolean {
  return ROLE_CAPS[role].includes(capability);
}

export function assertAdminCapability(role: AdminRole, capability: AdminCapability): void {
  if (!adminHasCapability(role, capability)) {
    throw new Error("Onvoldoende adminrechten voor deze actie.");
  }
}

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super admin",
  support_admin: "Support",
  readonly_admin: "Alleen-lezen",
};
