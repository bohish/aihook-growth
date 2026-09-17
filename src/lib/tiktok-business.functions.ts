/**
 * TikTok for Business OAuth (App ID / App Secret), separate from the Display API flow.
 * Tokens are exchanged server-side only and stored apart from the Display token.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TIKTOK_BUSINESS_REDIRECT_URI = "https://aihook.store/api/public/tiktok-business/callback";

/** Scopes approved for this app. */
export const TIKTOK_BUSINESS_SCOPES = [
  "user.info.basic",
  "biz.creator.info",
  "biz.creator.insights",
  "video.list",
  "tto.campaign.link",
];

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
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", appId);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", TIKTOK_BUSINESS_REDIRECT_URI);
    url.searchParams.set("scope", TIKTOK_BUSINESS_SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    return { ok: true, authorizationUrl: url.toString() };
  });

export type AudienceValue =
  | string
  | number
  | Array<string | number | Record<string, string | number>>
  | Record<string, string | number>;

export interface BusinessCreatorResult {
  ok: boolean;
  status: "not_connected" | "connected" | "denied" | "api_error";
  message?: string;
  scopes?: string[];
  creator?: Record<string, string | number>;
  audience?: Record<string, AudienceValue>;
  videoCount?: number | null;
  videos?: Array<Record<string, string | number>>;
  diag?: { endpoint: string; httpStatus: number; code: number | null; message: string };
}

/** Reads the Business creator endpoints with the Business token only. */
export const getBusinessCreatorData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BusinessCreatorResult> => {
    const biz = await import("./tiktok-business.server");
    const request = getRequest();
    const session = biz.readBusinessSession(request?.headers.get("cookie") ?? null);
    if (!session) {
      return { ok: false, status: "not_connected" };
    }
    try {
      const result = await biz.fetchBusinessCreator(session);
      if (!result.ok || !result.data) {
        return {
          ok: false,
          status: "denied",
          ...(result.message ? { message: result.message } : {}),
          ...(result.diag ? { diag: result.diag } : {}),
        };
      }
      return {
        ok: true,
        status: "connected",
        scopes: result.data.scopes,
        creator: result.data.creator,
        audience: result.data.audience as Record<string, AudienceValue>,
        videoCount: result.data.videoCount,
        videos: result.data.videos,
      };
    } catch {
      return { ok: false, status: "api_error" };
    }
  });
