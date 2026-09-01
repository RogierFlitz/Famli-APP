export function isMissingRelationError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    ((message.includes("does not exist") || message.includes("schema cache")) &&
      (message.includes("admin_staff") || message.includes("admin_audit") || message.includes("claim_first_super_admin")))
  );
}
