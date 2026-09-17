/**
 * TikTok for Business OAuth (App ID / App Secret), separate from the Display API flow.
 * Tokens are exchanged server-side only and stored apart from the Display token.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AccountData, ConnectionState } from "./types";

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
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", TIKTOK_BUSINESS_REDIRECT_URI);
    url.searchParams.set("scope", TIKTOK_BUSINESS_SCOPES.join(","));

    return { ok: true, authorizationUrl: url.toString() };
  });

export type AudienceValue =
  | string
  | number
  | Array<string | number | Record<string, string | number>>
  | Record<string, string | number>;

export interface BusinessVideo {
  id: string | null;
  scalars: Record<string, string | number>;
}

export interface BusinessDerivedStats {
  videos: number;
  totals: Record<string, number>;
  averages: Record<string, number>;
  medians: Record<string, number>;
  engagementRate: number | null;
  postingCadencePerWeek: number | null;
  consistency: number | null;
  topVideoId: string | null;
  bottomVideoId: string | null;
  trend: "up" | "down" | "flat" | null;
}

export interface BusinessCreatorResult {
  ok: boolean;
  status: "not_connected" | "connected" | "denied" | "api_error";
  message?: string;
  scopes?: string[];
  creator?: Record<string, string | number>;
  audience?: Record<string, AudienceValue>;
  insights?: Record<string, AudienceValue>;
  videos?: BusinessVideo[];
  videoCount?: number | null;
  derived?: BusinessDerivedStats | null;
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
        return { ok: false, status: "denied", ...(result.message ? { message: result.message } : {}) };
      }
      return {
        ok: true,
        status: "connected",
        scopes: result.data.scopes,
        creator: result.data.creator,
        audience: result.data.audience as Record<string, AudienceValue>,
        insights: result.data.insights as Record<string, AudienceValue>,
        videos: result.data.videos,
        videoCount: result.data.videoCount,
        derived: result.data.derived,
      };
    } catch {
      return { ok: false, status: "api_error" };
    }
  });

/* ------------------------------------------------------------------ *
 * Business session is the ONLY source of connection state + data.
 * ------------------------------------------------------------------ */

/** Connection state derived from the Business session only. */
export const getBusinessConnectionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ConnectionState> => {
    if (!process.env["TIKTOK_BUSINESS_APP_ID"] || !process.env["TIKTOK_BUSINESS_APP_SECRET"]) {
      return { status: "missing_credentials", message: "بيانات تطبيق TikTok غير مهيأة على الخادم" };
    }
    const biz = await import("./tiktok-business.server");
    const session = biz.readBusinessSession(getRequest()?.headers.get("cookie") ?? null);
    if (!session) return { status: "disconnected" };
    const result = await biz.fetchBusinessCreator(session);
    if (!result.ok || !result.data) {
      return { status: "api_error", message: "تعذّر قراءة بيانات الحساب من TikTok" };
    }
    const creator = result.data.creator;
    const name = creator["display_name"] ?? creator["username"] ?? creator["nickname"];
    const link = creator["profile_deep_link"] ?? creator["profile_link"];
    return {
      status: "connected",
      displayName: typeof name === "string" ? name : null,
      profileUrl: typeof link === "string" ? link : null,
      scopes: result.data.scopes,
    };
  });

/** Clears the Business session cookie. */
export const disconnectBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ ok: true }> => {
    const biz = await import("./tiktok-business.server");
    setResponseHeader(
      "Set-Cookie",
      `${biz.BUSINESS_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    return { ok: true };
  });

export interface BusinessAccountDataResult {
  ok: boolean;
  status: ConnectionState["status"];
  data?: AccountData;
  message?: string;
}

function numberOf(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

function publishedAt(scalars: Record<string, string | number>): string {
  const raw = scalars["create_time"] ?? scalars["created_at"] ?? scalars["publish_time"] ?? scalars["publish_date"];
  if (typeof raw === "number") return new Date(raw > 1e12 ? raw : raw * 1000).toISOString();
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

/** Real account data for the analysis pipeline, from the Business API only. */
export const fetchBusinessAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BusinessAccountDataResult> => {
    const biz = await import("./tiktok-business.server");
    const session = biz.readBusinessSession(getRequest()?.headers.get("cookie") ?? null);
    if (!session) return { ok: false, status: "disconnected", message: "لم يتم ربط حساب TikTok بعد" };

    const result = await biz.fetchBusinessCreator(session);
    if (!result.ok || !result.data) {
      return { ok: false, status: "api_error", message: "تعذّر جلب بيانات الحساب من TikTok" };
    }
    const { inferFeatures } = await import("./features");
    const creator = result.data.creator;
    const nameValue = creator["display_name"] ?? creator["username"] ?? creator["nickname"];
    const linkValue = creator["profile_deep_link"] ?? creator["profile_link"];
    const avatarValue = creator["avatar_url"] ?? creator["profile_image"];

    const videos = result.data.videos
      .filter((v) => v.id)
      .map((v) => {
        const caption =
          typeof v.scalars["caption"] === "string"
            ? v.scalars["caption"]
            : typeof v.scalars["title"] === "string"
              ? v.scalars["title"]
              : typeof v.scalars["video_description"] === "string"
                ? v.scalars["video_description"]
                : "";
        const durationSeconds = numberOf(v.scalars["duration"]);
        const shareUrl =
          typeof v.scalars["share_url"] === "string"
            ? v.scalars["share_url"]
            : typeof v.scalars["embed_link"] === "string"
              ? v.scalars["embed_link"]
              : null;
        const thumbnailUrl =
          typeof v.scalars["cover_image_url"] === "string"
            ? v.scalars["cover_image_url"]
            : typeof v.scalars["thumbnail_url"] === "string"
              ? v.scalars["thumbnail_url"]
              : null;
        return {
          id: String(v.id),
          caption,
          publishedAt: publishedAt(v.scalars),
          durationSeconds,
          thumbnailUrl,
          shareUrl,
          views: numberOf(v.scalars["view_count"] ?? v.scalars["play_count"]),
          likes: numberOf(v.scalars["like_count"]),
          comments: numberOf(v.scalars["comment_count"]),
          shares: numberOf(v.scalars["share_count"]),
          features: inferFeatures(caption, durationSeconds),
        };
      });

    if (videos.length === 0) {
      return { ok: false, status: "connected", message: "تم الربط بنجاح، لكن TikTok لم يُرجع أي فيديو لتحليله" };
    }

    return {
      ok: true,
      status: "connected",
      data: {
        account: {
          displayName: typeof nameValue === "string" ? nameValue : "",
          avatarUrl: typeof avatarValue === "string" ? avatarValue : null,
          profileUrl: typeof linkValue === "string" ? linkValue : null,
          bio: "",
          followerCount: numberOf(creator["follower_count"]),
          followingCount: numberOf(creator["following_count"]),
          likesCount: numberOf(creator["likes_count"] ?? creator["total_likes"]),
          videoCount: numberOf(creator["video_count"]) || videos.length,
        },
        videos,
        fetchedAt: new Date().toISOString(),
      },
    };
  });
