/**
 * TikTok OAuth redirect target.
 *
 * - Verifies the signed, httpOnly `state` cookie against the `state` query
 *   parameter (CSRF protection) and derives the owning user from it.
 * - Exchanges the authorization code for tokens server-side (client secret
 *   never leaves the server).
 * - Stores the connection encrypted with the service role.
 * - Redirects to /analyzing on success, or /connect with an explicit state.
 *
 * Nothing about the token payload is logged or returned to the browser.
 */
import { createFileRoute } from "@tanstack/react-router";

function clearCookie(cookieName: string): string {
  return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function redirect(to: string, cookieName: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: to, "Set-Cookie": clearCookie(cookieName) },
  });
}

export const Route = createFileRoute("/api/public/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const store = await import("@/lib/tiktok-connection.server");
        const url = new URL(request.url);
        const cookieName = store.OAUTH_COOKIE;

        const cookieHeader = request.headers.get("cookie") ?? "";
        const cookieValue = cookieHeader
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${cookieName}=`))
          ?.slice(cookieName.length + 1);

        const verified = store.verifyStateToken(cookieValue, url.searchParams.get("state"));
        if (!verified) {
          return redirect(`${url.origin}/connect?state=error&reason=invalid_state`, cookieName);
        }

        const error = url.searchParams.get("error");
        if (error) {
          const reason = error === "access_denied" ? "permission_denied" : "api_error";
          await store.markConnectionState(verified.userId, reason, null).catch(() => undefined);
          return redirect(`${url.origin}/connect?state=error&reason=${reason}`, cookieName);
        }

        const code = url.searchParams.get("code");
        if (!code) {
          return redirect(`${url.origin}/connect?state=error&reason=missing_code`, cookieName);
        }

        try {
          await store.completeOAuth(verified.userId, code, url.origin);
        } catch (err) {
          const reason = (err as { code?: string }).code ?? "api_error";
          return redirect(`${url.origin}/connect?state=error&reason=${reason}`, cookieName);
        }

        return redirect(`${url.origin}/analyzing`, cookieName);
      },
    },
  },
});
