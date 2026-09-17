/**
 * Client-callable server functions for the TikTok integration.
 *
 * All secrets and tokens stay inside the handlers (server-only modules are
 * dynamically imported so they never enter the client bundle).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AccountData, ConnectionState } from "./types";

function originFrom(): string {
  const request = getRequest();
  return request ? new URL(request.url).origin : "";
}

export interface StartOAuthResult {
  ok: boolean;
  authorizationUrl?: string;
  status: ConnectionState["status"];
  message?: string;
}

/** Step 1 of OAuth: mint signed state, set httpOnly cookie, return TikTok URL. */
export const startTikTokOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StartOAuthResult> => {
    const api = await import("./tiktok-api.server");
    if (!api.hasCredentials()) {
      return {
        ok: false,
        status: "missing_credentials",
        message:
          "لم تُضف بيانات تطبيق تيك توك (Client Key / Client Secret) بعد، فلا يمكن بدء الربط الرسمي.",
      };
    }

    const store = await import("./tiktok-connection.server");
    const { state, cookieValue } = store.createStateToken(context.userId);
    const origin = originFrom();
    setResponseHeader(
      "Set-Cookie",
      `${store.OAUTH_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`,
    );
    return { ok: true, status: "connecting", authorizationUrl: api.buildAuthorizeUrl(origin, state) };
  });

/** Current connection state for the signed-in user. Never returns tokens. */
export const getConnectionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConnectionState> => {
    const api = await import("./tiktok-api.server");
    if (!api.hasCredentials()) {
      return {
        status: "missing_credentials",
        message: "التكامل الرسمي مع تيك توك يحتاج إعداد بيانات التطبيق على الخادم أولاً.",
      };
    }
    const store = await import("./tiktok-connection.server");
    return store.readConnectionState(context.userId);
  });

export interface AccountDataResult {
  ok: boolean;
  data?: AccountData;
  status: ConnectionState["status"];
  message?: string;
}

/** Fetches the real profile + own videos. No fallback data, ever. */
export const fetchTikTokAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountDataResult> => {
    const api = await import("./tiktok-api.server");
    if (!api.hasCredentials()) {
      return {
        ok: false,
        status: "missing_credentials",
        message: "بيانات تطبيق تيك توك غير مهيأة على الخادم.",
      };
    }
    const store = await import("./tiktok-connection.server");
    try {
      const token = await store.getValidAccessToken(context.userId);
      const data = await api.fetchAccountData(token);
      if (data.videos.length === 0) {
        return {
          ok: false,
          status: "connected",
          message: "تم الربط بنجاح، لكن لا توجد فيديوهات في الحساب لتحليلها بعد.",
        };
      }
      return { ok: true, status: "connected", data };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "expired") {
        return { ok: false, status: "expired", message: "انتهت صلاحية الربط. أعد ربط الحساب." };
      }
      if (code === "permission_denied") {
        return {
          ok: false,
          status: "permission_denied",
          message: "إحدى الصلاحيات المطلوبة غير ممنوحة. أعد الربط ووافق على الصلاحيات.",
        };
      }
      if (code === "rate_limited") {
        return { ok: false, status: "api_error", message: "تم تجاوز حد الطلبات لدى تيك توك. أعد المحاولة بعد قليل." };
      }
      await store.markConnectionState(context.userId, "api_error", "تعذّر جلب بيانات الحساب من تيك توك.");
      return { ok: false, status: "api_error", message: "تعذّر جلب بيانات الحساب من تيك توك." };
    }
  });

export const disconnectTikTok = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const store = await import("./tiktok-connection.server");
    await store.deleteConnection(context.userId);
    return { ok: true };
  });
