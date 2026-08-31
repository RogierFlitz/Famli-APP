import { requireAdmin } from "@/lib/admin/session";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireAdmin();
  return <AdminShell actor={actor}>{children}</AdminShell>;
}
