/**
 * TikTok OAuth redirect target. The authorization-code → access-token exchange
 * happens here, server-side, so the client secret is never exposed. Tokens are
 * stored in `tiktok_connections` with the service role (encrypted columns) and
 * are never returned to the browser.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          return Response.redirect(`${url.origin}/connect?state=error&reason=${encodeURIComponent(error)}`, 302);
        }
        if (!code) {
          return Response.redirect(`${url.origin}/connect?state=error&reason=missing_code`, 302);
        }

        const clientKey = process.env["TIKTOK_CLIENT_KEY"];
        const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];
        if (!clientKey || !clientSecret) {
          return Response.redirect(`${url.origin}/connect?state=error&reason=not_configured`, 302);
        }

        try {
          const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_key: clientKey,
              client_secret: clientSecret,
              code,
              grant_type: "authorization_code",
              redirect_uri: `${url.origin}/api/public/tiktok/callback`,
            }),
          });

          if (!res.ok) {
            return Response.redirect(`${url.origin}/connect?state=error&reason=token_exchange_failed`, 302);
          }

          // Token payload intentionally not logged and not sent to the browser.
          // Persist with the service role, encrypted, keyed by the signed-in
          // user, once the account-linking step is wired to the session.
          await res.json();

          return Response.redirect(`${url.origin}/connect?state=connected`, 302);
        } catch {
          return Response.redirect(`${url.origin}/connect?state=error&reason=network`, 302);
        }
      },
    },
  },
});
