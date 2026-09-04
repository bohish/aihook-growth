/**
 * Server-side TikTok OAuth entry point.
 *
 * The client id/secret live ONLY in server environment variables. The browser
 * never sees them: it calls `startTikTokOAuth`, which either returns the
 * official authorization URL (when credentials are configured) or reports that
 * the app must fall back to demo mode.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export interface StartOAuthResult {
  configured: boolean;
  authorizationUrl: string | null;
  /** Reason shown to the user when the real integration is unavailable. */
  reason?: string;
}

const SCOPES = ["user.info.basic", "user.info.stats", "video.list"];

export const startTikTokOAuth = createServerFn({ method: "POST" }).handler(
  async (): Promise<StartOAuthResult> => {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];

    if (!clientKey || !clientSecret) {
      return {
        configured: false,
        authorizationUrl: null,
        reason: "بيانات تطبيق TikTok غير مضافة بعد، سيتم استخدام الوضع التجريبي.",
      };
    }

    const request = getRequest();
    const origin = request ? new URL(request.url).origin : "";
    const redirectUri = `${origin}/api/public/tiktok/callback`;
    const state = crypto.randomUUID();

    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    return { configured: true, authorizationUrl: url.toString() };
  },
);
