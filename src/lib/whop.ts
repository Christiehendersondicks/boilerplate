import { WhopServerSdk, verifyUserToken } from "@whop/api";

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",
  appApiKey: process.env.WHOP_API_KEY ?? "",
  // Omit entirely when unset — exactOptionalPropertyTypes rejects explicit undefined.
  ...(process.env.WHOP_AGENT_USER_ID
    ? { onBehalfOfUserId: process.env.WHOP_AGENT_USER_ID }
    : {}),
});

/**
 * Resolve the current WHOP user id from incoming request headers.
 *
 * Returns the verified WHOP user id, or `null` when no valid token is present.
 *
 * DEV_BYPASS escape hatch: outside production, if there is no WHOP token in the
 * request and `WHOP_DEV_FAKE_USER` is set, that value is returned as the user id.
 * This lets us exercise API routes locally without a real WHOP session. It is
 * never active when NODE_ENV === "production".
 */
export async function getWhopUserId(
  headersList: Headers,
): Promise<string | null> {
  try {
    // @whop/api 0.0.51 exposes `verifyUserToken` as a standalone export rather
    // than a method on the server SDK instance. It returns `{ userId: string }`.
    const { userId } = await verifyUserToken(headersList);
    if (userId) return userId;
  } catch {
    // Fall through to the dev bypass / null below — local dev without WHOP
    // must not crash.
  }

  if (process.env.NODE_ENV !== "production" && process.env.WHOP_DEV_FAKE_USER) {
    return process.env.WHOP_DEV_FAKE_USER;
  }

  return null;
}

/**
 * Like {@link getWhopUserId}, but throws a 401 `Response` when there is no
 * authenticated WHOP user. Intended for use inside route handlers.
 */
export async function requireWhopUser(headersList: Headers): Promise<string> {
  const userId = await getWhopUserId(headersList);
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return userId;
}
