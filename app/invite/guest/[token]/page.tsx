import { notFound } from "next/navigation";
import { FamliLogo } from "@/components/brand/logo";
import { GuestRequestPage } from "@/components/guest/guest-request";
import { validateGuestToken } from "@/lib/architecture/guest-links";
import { getRepository } from "@/lib/data";

export default async function GuestInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getRepository().getGuestLinkByToken(token);
  if (!result) notFound();

  const validation = validateGuestToken(result.link);
  if (!validation.valid) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <FamliLogo className="mb-6" />
        <h1 className="text-2xl font-semibold">Link niet beschikbaar</h1>
        <p className="mt-2 text-[color:var(--famli-muted)]">{validation.reason}</p>
      </div>
    );
  }

  const request = result.link.changeRequestId
    ? result.snapshot.changeRequests.find((item) => item.id === result.link.changeRequestId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[color:var(--famli-bg)] px-4 py-10">
      <div className="mb-8 flex justify-center">
        <FamliLogo />
      </div>
      <GuestRequestPage link={result.link} snapshot={result.snapshot} request={request} />
    </div>
  );
}
