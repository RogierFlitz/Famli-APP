import { notFound, redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  if (!session) redirect(`/signup?error=${encodeURIComponent("Maak eerst een account om de uitnodiging te accepteren.")}`);
  try {
    await getRepository().acceptInvite(token, session.userId);
  } catch {
    notFound();
  }
  redirect("/vandaag");
}
