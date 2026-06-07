import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import DashboardShell from "./DashboardShell";

export const metadata = { title: "Creator Dashboard — Aura Superfan" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  const cookieStore = await cookies();
  const creator = getSessionFromCookies(cookieStore);

  if (!creator) redirect(`/auth?next=/dashboard/${communityId}`);

  return <DashboardShell communityId={communityId} creatorEmail={creator.email} creatorName={creator.displayName} />;
}
