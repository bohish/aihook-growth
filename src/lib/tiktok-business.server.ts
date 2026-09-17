/**
 * Server-only storage + reads for the TikTok for Business connection.
 *
 * The Business token is kept COMPLETELY separate from the Display API token:
 * it lives in an encrypted httpOnly cookie (AES-256-GCM, same server key as the
 * Display store), so it can never overwrite the Display connection row.
 * Tokens are never logged and never returned to the browser.
 */
import { decryptToken, encryptToken } from "./tiktok-connection.server";

export const BUSINESS_COOKIE = "tt_biz_session";
const BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface BusinessSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scopes: string[];
  openId: string | null;
}

export function buildBusinessCookie(session: BusinessSession): string {
  const value = encryptToken(JSON.stringify(session));
  return `${BUSINESS_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  return (cookieHeader ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function readBusinessSession(cookieHeader: string | null): BusinessSession | null {
  const raw = readCookie(cookieHeader, BUSINESS_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decryptToken(raw)) as BusinessSession;
    if (!parsed.accessToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function call(
  path: string,
  token: string,
  query: Record<string, string> = {},
): Promise<{ ok: boolean; data?: Record<string, unknown>; message?: string }> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Access-Token": token, "Content-Type": "application/json" },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
    data?: Record<string, unknown>;
  };
  if (!response.ok || payload.code !== 0) {
    console.error(`TikTok Business API ${path} failed [${response.status}] ${payload.message ?? ""}`);
    return { ok: false, message: payload.message ?? `HTTP ${response.status}` };
  }
  return { ok: true, ...(payload.data ? { data: payload.data } : {}) };
}

export interface BusinessCreatorData {
  scopes: string[];
  creator: Record<string, string | number>;
  audience: Record<string, unknown>;
  videoCount: number | null;
}

export async function fetchBusinessCreator(
  session: BusinessSession,
): Promise<{ ok: boolean; data?: BusinessCreatorData; message?: string }> {
  const info = await call("/tto/creator/authorized/", session.accessToken);
  if (!info.ok) return { ok: false, ...(info.message ? { message: info.message } : {}) };

  const creator: Record<string, string | number> = {};
  const source = (info.data?.["creator"] ?? info.data ?? {}) as Record<string, unknown>;
  for (const key of [
    "display_name",
    "username",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
    "profile_deep_link",
  ]) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") creator[key] = value;
  }

  const audience: Record<string, unknown> = {};
  for (const key of [
    "audience_gender",
    "audience_genders",
    "gender_distribution",
    "audience_age",
    "audience_ages",
    "age_distribution",
    "audience_country",
    "audience_countries",
    "country_distribution",
    "audience_region",
    "audience_regions",
    "region_distribution",
    "audience_city",
    "audience_cities",
    "city_distribution",
  ]) {
    const value = source[key] ?? info.data?.[key];
    if (Array.isArray(value) || (value && typeof value === "object")) audience[key] = value;
  }

  let videoCount: number | null = null;
  const videoRows: Array<Record<string, string | number>> = [];
  const list = await call("/tto/creator/authorized/video/list/", session.accessToken, { max_count: "20" });
  if (list.ok) {
    const videos = list.data?.["videos"];
    if (Array.isArray(videos)) {
      videoCount = videos.length;
      for (const item of videos) {
        if (!item || typeof item !== "object") continue;
        const row: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          if (typeof v === "string" || typeof v === "number") row[k] = v;
        }
        if (Object.keys(row).length > 0) videoRows.push(row);
      }
    }
  }

  return { ok: true, data: { scopes: session.scopes, creator, audience, videoCount, videos: videoRows } };
}
