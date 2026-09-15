/**
 * TikTok for Business OAuth redirect target.
 * Verifies the signed httpOnly state cookie, then exchanges auth_code for a
 * token server-side. The Business token is stored separately from the Display
 * API connection, so it can never overwrite it. Tokens are never logged.
 */
import { createFileRoute } from "@tanstack/react-router";

function redirect(to: string, cookieName: string, extraCookie?: string): Response {
  const headers = new Headers({ Location: to });
  headers.append("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  if (extraCookie) headers.append("Set-Cookie", extraCookie);
  return new Response(null, { status: 302, headers });
}

export const Route = createFileRoute("/api/public/tiktok-business/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const store = await import("@/lib/tiktok-connection.server");
        const biz = await import("@/lib/tiktok-business.server");
        const url = new URL(request.url);
        const cookieName = store.OAUTH_COOKIE;
        const cookieHeader = request.headers.get("cookie");
        const cookieValue = biz.readCookie(cookieHeader, cookieName);

        const verified = store.verifyStateToken(cookieValue, url.searchParams.get("state"));
        if (!verified) {
          return redirect(`${url.origin}/connect?state=error&reason=invalid_state`, cookieName);
        }

        const code = url.searchParams.get("auth_code") ?? url.searchParams.get("code");
        if (!code) {
          return redirect(`${url.origin}/connect?state=error&reason=missing_code`, cookieName);
        }

        const appId = process.env["TIKTOK_BUSINESS_APP_ID"];
        const secret = process.env["TIKTOK_BUSINESS_APP_SECRET"];
        if (!appId || !secret) {
          return redirect(`${url.origin}/connect?state=error&reason=missing_credentials`, cookieName);
        }

        try {
          const response = await fetch(
            "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                app_id: appId,
                secret,
                auth_code: code,
                grant_type: "authorization_code",
              }),
            },
          );
          const payload = (await response.json()) as {
            code?: number;
            message?: string;
            data?: {
              access_token?: string;
              refresh_token?: string;
              expires_in?: number;
              scope?: string[] | string;
              open_id?: string;
            };
          };
          const token = payload.data?.access_token;
          if (!response.ok || payload.code !== 0 || !token) {
            console.error(`TikTok Business token exchange failed [${response.status}]: ${payload.message ?? ""}`);
            return redirect(`${url.origin}/connect?state=error&reason=api_error`, cookieName);
          }

          const scopeRaw = payload.data?.scope;
          const bizCookie = biz.buildBusinessCookie({
            accessToken: token,
            refreshToken: payload.data?.refresh_token ?? null,
            expiresAt: new Date(Date.now() + (payload.data?.expires_in ?? 86400) * 1000).toISOString(),
            openId: payload.data?.open_id ?? null,
            scopes: Array.isArray(scopeRaw) ? scopeRaw : scopeRaw ? [scopeRaw] : [],
          });
          return redirect(`${url.origin}/dashboard?business=connected`, cookieName, bizCookie);
        } catch (err) {
          console.error(err);
          return redirect(`${url.origin}/connect?state=error&reason=api_error`, cookieName);
        }
      },
    },
  },
});
