import { cookies } from "next/headers";
import { deleteSession, makeClearSessionCookie, SESSION_COOKIE } from "@/lib/auth/session";
import { ok } from "@/lib/apiResponse";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionId) deleteSession(sessionId);
  } catch {
    // ignore — always clear the cookie
  }
  const response = ok({ loggedOut: true });
  response.cookies.set(makeClearSessionCookie());
  return response;
}
