import { notFound } from "next/navigation";
import { requireSnapshot } from "@/lib/auth/session";
import { ChildProfile } from "@/components/children/child-profile";

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const snapshot = await requireSnapshot();
  const child = snapshot.children.find((item) => item.id === id);
  if (!child) notFound();
  return <ChildProfile snapshot={snapshot} child={child} initialTab={tab} />;
}
