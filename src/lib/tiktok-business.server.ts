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

const SENSITIVE = /token|secret|key|signature|open_id|union_id/i;

/** Flattens nested objects one level and keeps only safe scalar fields. */
function collectScalars(source: Record<string, unknown>, out: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(source)) {
    if (SENSITIVE.test(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      if (typeof value === "string" && value.length > 300) continue;
      out[key] = value;
    }
  }
}

function collectStructures(source: Record<string, unknown>, out: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (SENSITIVE.test(key)) continue;
    if (Array.isArray(value) || (value && typeof value === "object")) out[key] = value;
  }
}

const AUDIENCE_HINT = /gender|age|country|countries|region|city|cities|audience|location|device|language|interest/i;

export interface BusinessVideoMetrics {
  id: string | null;
  scalars: Record<string, string | number>;
}

export interface BusinessDerived {
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

export interface BusinessCreatorData {
  scopes: string[];
  creator: Record<string, string | number>;
  audience: Record<string, unknown>;
  insights: Record<string, unknown>;
  videos: BusinessVideoMetrics[];
  videoCount: number | null;
  derived: BusinessDerived | null;
}

const METRIC_KEYS = ["view_count", "like_count", "comment_count", "share_count", "play_count", "duration", "reach"];

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function derive(videos: BusinessVideoMetrics[], followers: number | null): BusinessDerived | null {
  if (videos.length === 0) return null;
  const totals: Record<string, number> = {};
  const averages: Record<string, number> = {};
  const medians: Record<string, number> = {};
  for (const key of METRIC_KEYS) {
    const values = videos
      .map((v) => v.scalars[key])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) continue;
    totals[key] = values.reduce((a, b) => a + b, 0);
    averages[key] = Math.round((totals[key]! / values.length) * 100) / 100;
    medians[key] = median(values);
  }

  const views = totals["view_count"] ?? totals["play_count"] ?? 0;
  const interactions = (totals["like_count"] ?? 0) + (totals["comment_count"] ?? 0) + (totals["share_count"] ?? 0);
  const engagementRate =
    views > 0
      ? Math.round((interactions / views) * 10000) / 100
      : followers && followers > 0
        ? Math.round((interactions / (followers * videos.length)) * 10000) / 100
        : null;

  const times = videos
    .map((v) => {
      const raw = v.scalars["create_time"] ?? v.scalars["created_at"] ?? v.scalars["publish_time"];
      if (typeof raw === "number") return raw > 1e12 ? raw : raw * 1000;
      if (typeof raw === "string") {
        const t = Date.parse(raw);
        return Number.isNaN(t) ? null : t;
      }
      return null;
    })
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  let postingCadencePerWeek: number | null = null;
  let consistency: number | null = null;
  if (times.length >= 2) {
    const spanDays = (times[times.length - 1]! - times[0]!) / 86400000;
    if (spanDays > 0) postingCadencePerWeek = Math.round((times.length / spanDays) * 7 * 100) / 100;
    const gaps: number[] = [];
    for (let i = 1; i < times.length; i += 1) gaps.push((times[i]! - times[i - 1]!) / 86400000);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean > 0) {
      const variance = gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length;
      consistency = Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / mean) * 100)));
    }
  }

  const metricOf = (v: BusinessVideoMetrics): number => {
    const value = v.scalars["view_count"] ?? v.scalars["play_count"] ?? v.scalars["like_count"];
    return typeof value === "number" ? value : 0;
  };
  const ranked = [...videos].sort((a, b) => metricOf(b) - metricOf(a));

  let trend: BusinessDerived["trend"] = null;
  if (videos.length >= 4) {
    const half = Math.floor(videos.length / 2);
    const recent = videos.slice(0, half).map(metricOf);
    const older = videos.slice(half).map(metricOf);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const r = avg(recent);
    const o = avg(older);
    trend = o === 0 ? null : r > o * 1.1 ? "up" : r < o * 0.9 ? "down" : "flat";
  }

  return {
    videos: videos.length,
    totals,
    averages,
    medians,
    engagementRate,
    postingCadencePerWeek,
    consistency,
    topVideoId: ranked[0]?.id ?? null,
    bottomVideoId: ranked[ranked.length - 1]?.id ?? null,
    trend,
  };
}

export async function fetchBusinessCreator(
  session: BusinessSession,
): Promise<{ ok: boolean; data?: BusinessCreatorData; message?: string }> {
  const info = await call("/tto/creator/authorized/", session.accessToken);
  if (!info.ok) return { ok: false, ...(info.message ? { message: info.message } : {}) };

  const root = info.data ?? {};
  const nested = (root["creator"] ?? root["user"] ?? {}) as Record<string, unknown>;

  const creator: Record<string, string | number> = {};
  collectScalars(root, creator);
  collectScalars(nested, creator);

  const structures: Record<string, unknown> = {};
  collectStructures(root, structures);
  collectStructures(nested, structures);

  const audience: Record<string, unknown> = {};
  const insights: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(structures)) {
    if (key === "creator" || key === "user") continue;
    if (AUDIENCE_HINT.test(key)) audience[key] = value;
    else insights[key] = value;
  }

  const videos: BusinessVideoMetrics[] = [];
  let videoCount: number | null = null;
  const list = await call("/tto/creator/authorized/video/list/", session.accessToken, { max_count: "20" });
  if (list.ok) {
    const raw = list.data?.["videos"] ?? list.data?.["video_list"] ?? list.data?.["list"];
    if (Array.isArray(raw)) {
      videoCount = raw.length;
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const scalars: Record<string, string | number> = {};
        collectScalars(record, scalars);
        for (const [k, v] of Object.entries(record)) {
          if (v && typeof v === "object" && !Array.isArray(v) && /stat|metric|insight/i.test(k)) {
            collectScalars(v as Record<string, unknown>, scalars);
          }
        }
        const id = record["item_id"] ?? record["video_id"] ?? record["id"];
        videos.push({ id: typeof id === "string" || typeof id === "number" ? String(id) : null, scalars });
      }
    }
  }

  const followers = typeof creator["follower_count"] === "number" ? creator["follower_count"] : null;

  return {
    ok: true,
    data: {
      scopes: session.scopes,
      creator,
      audience,
      insights,
      videos,
      videoCount,
      derived: derive(videos, followers),
    },
  };
}
