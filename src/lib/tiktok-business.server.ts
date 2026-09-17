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

/** Safe diagnostics: no tokens, secrets, or IDs — only status/code/message/endpoint. */
export interface BusinessApiDiag {
  endpoint: string;
  httpStatus: number;
  code: number | null;
  message: string;
}

async function call(
  path: string,
  token: string,
  query: Record<string, string> = {},
): Promise<{ ok: boolean; data?: Record<string, unknown>; message?: string; diag?: BusinessApiDiag }> {
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
    return {
      ok: false,
      message: payload.message ?? `HTTP ${response.status}`,
      diag: {
        endpoint: path,
        httpStatus: response.status,
        code: typeof payload.code === "number" ? payload.code : null,
        message: payload.message ?? "",
      },
    };
  }
  return { ok: true, ...(payload.data ? { data: payload.data } : {}) };
}

/** Official /business/get/ metric fields (organic account insights). */
const STAT_FIELDS = [
  "followers_count",
  "profile_views",
  "video_views",
  "likes",
  "comments",
  "shares",
];

/** Official /business/video/list/ insight fields. */
const VIDEO_INSIGHT_FIELDS = [
  "item_id",
  "create_time",
  "caption",
  "share_url",
  "video_views",
  "likes",
  "comments",
  "shares",
  "reach",
  "full_video_watched_rate",
  "total_time_watched",
  "average_time_watched",
  "video_duration",
];

/**
 * Every optional source is independent: a rejected endpoint yields nothing and
 * never breaks the rest of the snapshot. No values are ever invented.
 */
export interface BusinessSnapshot {
  /** Real numeric account insights returned by /business/get/ */
  accountStats: Record<string, number>;
  /** Per-video insight rows returned by /business/video/list/ */
  videoInsights: Array<Record<string, string | number>>;
  /** Comment count actually returned for the newest authorized video */
  commentsCount: number | null;
  /** Sources TikTok refused for this token (endpoint names only) */
  unavailable: string[];
}

async function fetchAccountStats(
  token: string,
  businessId: string,
  start: string,
  end: string,
): Promise<Record<string, number>> {
  const result = await call("/business/get/", token, {
    business_id: businessId,
    fields: JSON.stringify(STAT_FIELDS),
    start_date: start,
    end_date: end,
  });
  const stats: Record<string, number> = {};
  if (!result.ok || !result.data) return stats;
  for (const key of STAT_FIELDS) {
    const value = result.data[key];
    if (typeof value === "number") stats[key] = value;
    else if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      stats[key] = Number(value);
    }
  }
  return stats;
}

async function fetchVideoInsights(
  token: string,
  businessId: string,
): Promise<Array<Record<string, string | number>>> {
  const result = await call("/business/video/list/", token, {
    business_id: businessId,
    fields: JSON.stringify(VIDEO_INSIGHT_FIELDS),
    max_count: "20",
  });
  const rows: Array<Record<string, string | number>> = [];
  if (!result.ok || !result.data) return rows;
  const list = result.data["videos"];
  if (!Array.isArray(list)) return rows;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number") row[k] = v;
    }
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return rows;
}

async function fetchCommentCount(
  token: string,
  businessId: string,
  videoId: string,
): Promise<number | null> {
  const result = await call("/business/comment/list/", token, {
    business_id: businessId,
    video_id: videoId,
    max_count: "20",
  });
  if (!result.ok || !result.data) return null;
  const comments = result.data["comments"];
  return Array.isArray(comments) ? comments.length : null;
}

export interface BusinessCreatorData {
  scopes: string[];
  creator: Record<string, string | number>;
  audience: Record<string, unknown>;
  videoCount: number | null;
  videos: Array<Record<string, string | number>>;
  /** Safe key names TikTok actually returned (no tokens/IDs), for diagnostics. */
  fieldKeys: string[];
  /** Scopes the token itself actually carries, per /tt_user/token_info/get/ */
  tokenScopes: string[];
  /** Whether the official organic audience endpoint answered for this token */
  audienceAvailable: boolean;
  audienceDiag?: BusinessApiDiag;
  /** Unified snapshot of every optional Business source that actually answered */
  snapshot: BusinessSnapshot;
}

/**
 * Official token introspection: POST /tt_user/token_info/get/ with app_id +
 * access_token returns { app_id, creator_id, scope }. Only the scope list is
 * surfaced — creator_id is never returned to the browser.
 */
async function fetchTokenScopes(token: string): Promise<string[]> {
  const appId = process.env["TIKTOK_BUSINESS_APP_ID"];
  if (!appId) return [];
  try {
    const response = await fetch(`${BASE}/tt_user/token_info/get/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, access_token: token }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      code?: number;
      data?: { scope?: string };
    };
    if (payload.code !== 0) return [];
    const scope = payload.data?.scope;
    return typeof scope === "string" ? scope.split(/[,\s]+/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Official organic audience data for a business account:
 * GET /business/get/ with fields audience_ages / audience_genders /
 * audience_countries / audience_cities. Requires a Business Account token with
 * the audience insight permission; creator-only tokens get rejected here.
 */
const AUDIENCE_FIELDS = ["audience_ages", "audience_genders", "audience_countries", "audience_cities"];

async function fetchOrganicAudience(
  token: string,
  businessId: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>; diag?: BusinessApiDiag }> {
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const result = await call("/business/get/", token, {
    business_id: businessId,
    fields: JSON.stringify(AUDIENCE_FIELDS),
    start_date: iso(start),
    end_date: iso(end),
  });
  if (!result.ok) return { ok: false, ...(result.diag ? { diag: result.diag } : {}) };
  return { ok: true, ...(result.data ? { data: result.data } : {}) };
}

export async function fetchBusinessCreator(
  session: BusinessSession,
): Promise<{ ok: boolean; data?: BusinessCreatorData; message?: string; diag?: BusinessApiDiag }> {
  // Per TikTok's official docs, creator_id for /tto/creator/* is the open_id
  // returned by /tt_user/oauth2/token/ — already stored in the session.
  const creatorId = session.openId;
  if (!creatorId) {
    return { ok: false, message: "جلسة العمل لا تحتوي معرّف المنشئ — أعد ربط الحساب" };
  }
  const idQuery = { creator_id: creatorId };

  const info = await call("/tto/creator/authorized/", session.accessToken, idQuery);
  if (!info.ok)
    return {
      ok: false,
      ...(info.message ? { message: info.message } : {}),
      ...(info.diag ? { diag: info.diag } : {}),
    };

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

  // Flexible, read-only scan of the real response: collect safe key names and
  // any audience-like fields wherever TikTok placed them. No invented fields.
  // Matching is segment-based (split on _ - . /) so "image" never matches "age".
  const SENSITIVE = /token|secret|open_id|union_id|signature|credential/i;
  const ASSET_RE = /^(image|avatar|photo|cover|thumbnail|url|icon|logo|picture|asset|link|href|src)$/i;
  const DEMOGRAPHIC = new Set([
    "audience", "gender", "age", "country", "countries", "region",
    "regions", "city", "cities", "location", "language", "languages",
    "device", "devices", "interest", "interests", "demographic", "demographics",
  ]);
  const segments = (key: string) => key.split(/[_\-.\/\s]+/).filter(Boolean);
  const isAudienceKey = (key: string) => {
    const segs = segments(key);
    return segs.some((s) => DEMOGRAPHIC.has(s.toLowerCase()));
  };
  const isAssetKey = (key: string) => segments(key).some((s) => ASSET_RE.test(s));
  const isUrlValue = (v: unknown) =>
    typeof v === "string" && /^https?:\/\//i.test(v);
  const audience: Record<string, unknown> = {};
  const keySet = new Set<string>();
  const isSafeValue = (v: unknown): boolean =>
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    Array.isArray(v) ||
    (v !== null && typeof v === "object");
  const walk = (node: unknown, prefix: string, depth: number) => {
    if (!node || typeof node !== "object" || Array.isArray(node) || depth > 3) return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (SENSITIVE.test(key)) continue;
      keySet.add(prefix ? `${prefix}.${key}` : key);
      if (
        isAudienceKey(key) &&
        !isAssetKey(key) &&
        !isUrlValue(value) &&
        isSafeValue(value)
      ) {
        audience[prefix ? `${prefix}.${key}` : key] = value;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value, key, depth + 1);
      }
    }
  };
  walk(info.data, "", 0);
  const fieldKeys = [...keySet].sort();

  let videoCount: number | null = null;
  const videoRows: Array<Record<string, string | number>> = [];
  const list = await call("/tto/creator/authorized/video/list/", session.accessToken, { ...idQuery, max_count: "20" });
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

  const tokenScopes = await fetchTokenScopes(session.accessToken);
  const organic = await fetchOrganicAudience(session.accessToken, creatorId);
  if (organic.ok && organic.data) {
    for (const [key, value] of Object.entries(organic.data)) {
      if (isAudienceKey(key) && !isAssetKey(key) && !isUrlValue(value) && isSafeValue(value)) {
        audience[key] = value;
      }
    }
  }

  // Optional sources: each one is independent and silent on refusal.
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const accountStats = await fetchAccountStats(session.accessToken, creatorId, iso(start), iso(end));
  const videoInsights = await fetchVideoInsights(session.accessToken, creatorId);
  const newestId = videoInsights[0]?.["item_id"] ?? videoRows[0]?.["item_id"];
  const commentsCount =
    typeof newestId === "string" || typeof newestId === "number"
      ? await fetchCommentCount(session.accessToken, creatorId, String(newestId))
      : null;
  const unavailable: string[] = [];
  if (Object.keys(accountStats).length === 0) unavailable.push("/business/get/ (stats)");
  if (videoInsights.length === 0) unavailable.push("/business/video/list/");
  if (commentsCount === null) unavailable.push("/business/comment/list/");
  if (!organic.ok) unavailable.push("/business/get/ (audience)");

  return {
    ok: true,
    data: {
      scopes: session.scopes,
      creator,
      audience,
      videoCount,
      videos: videoRows,
      fieldKeys,
      tokenScopes,
      audienceAvailable: organic.ok,
      ...(organic.diag ? { audienceDiag: organic.diag } : {}),
      snapshot: { accountStats, videoInsights, commentsCount, unavailable },
    },
  };
}
