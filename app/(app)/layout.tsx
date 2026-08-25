import { requireSnapshot } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = await requireSnapshot();
  return <AppShell snapshot={snapshot}>{children}</AppShell>;
}
