/**
 * TikTok for Business OAuth (App ID / App Secret), separate from the Display API flow.
 * Tokens are exchanged server-side only.
 */
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TIKTOK_BUSINESS_REDIRECT_URI =
  "https://aihook.store/api/public/tiktok-business/callback";

export interface StartBusinessOAuthResult {
  ok: boolean;
  authorizationUrl?: string;
  message?: string;
}

export const startTikTokBusinessOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StartBusinessOAuthResult> => {
    const appId = process.env["TIKTOK_BUSINESS_APP_ID"];
    if (!appId) {
      return { ok: false, message: "TIKTOK_BUSINESS_APP_ID غير مضبوط على الخادم" };
    }
    const store = await import("./tiktok-connection.server");
    const { state, cookieValue } = store.createStateToken(context.userId);
    setResponseHeader(
      "Set-Cookie",
      `${store.OAUTH_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`,
    );
    const url = new URL("https://business-api.tiktok.com/portal/auth");
    url.searchParams.set("app_id", appId);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", TIKTOK_BUSINESS_REDIRECT_URI);
    return { ok: true, authorizationUrl: url.toString() };
  });
