/**
 * Official TikTok API client — SERVER ONLY.
 *
 * Uses the TikTok Login Kit / Display API v2 endpoints and the minimum scopes
 * the product needs:
 *   user.info.basic  → open_id, display_name, avatar, bio, profile link
 *   user.info.stats  → follower_count, following_count, likes_count, video_count
 *   video.list       → the authenticated user's own videos + public metrics
 *
 * Everything here requires the client secret or an access token, so this module
 * must never reach the browser bundle (enforced by the `.server.ts` suffix).
 *
 * The API does NOT expose retention, watch time, traffic sources, follower
 * identities or demographics through these scopes, so nothing of the sort is
 * requested, derived or returned.
 */
import { inferFeatures } from "./features";
import type { AccountData, AccountRecord, VideoRecord } from "./types";

export const TIKTOK_SCOPES = ["user.info.basic", "user.info.stats", "video.list"] as const;

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

// NOTE: `bio_description` and `profile_deep_link` require the extra
// `user.info.profile` scope, which this app does not request. Asking for them
// makes TikTok reject the whole request with 401 scope_not_authorized.
const USER_FIELDS = [
  "open_id",
  "display_name",
  "avatar_url",
  "follower_count",
  "following_count",
  "likes_count",
  "video_count",
].join(",");

const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "duration",
  "cover_image_url",
  "share_url",
  "create_time",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
].join(",");

/** Stable machine codes surfaced to the UI as explicit states (never faked). */
export type TikTokErrorCode =
  | "missing_credentials"
  | "permission_denied"
  | "expired"
  | "rate_limited"
  | "api_error"
  | "no_videos";

export class TikTokError extends Error {
  constructor(
    readonly code: TikTokErrorCode,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "TikTokError";
  }
}

export interface TikTokCredentials {
  clientKey: string;
  clientSecret: string;
}

/** Reads the developer credentials. Throws an explicit, safe error if absent. */
export function readCredentials(): TikTokCredentials {
  const clientKey = process.env["TIKTOK_CLIENT_KEY"];
  const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];
  if (!clientKey || !clientSecret) {
    throw new TikTokError(
      "missing_credentials",
      "TikTok app credentials are not configured on the server.",
    );
  }
  return { clientKey, clientSecret };
}

export function hasCredentials(): boolean {
  return Boolean(process.env["TIKTOK_CLIENT_KEY"] && process.env["TIKTOK_CLIENT_SECRET"]);
}

export function redirectUriFor(origin: string): string {
  return `${origin}/api/public/tiktok/callback`;
}

export function buildAuthorizeUrl(origin: string, state: string): string {
  const { clientKey } = readCredentials();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUriFor(origin));
  url.searchParams.set("state", state);
  return url.toString();
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  openId: string | null;
  scopes: string[];
  /** Absolute expiry, ISO string. */
  expiresAt: string;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

function parseTokenResponse(raw: RawTokenResponse): TokenSet {
  if (raw.error || !raw.access_token) {
    const description = raw.error_description ?? raw.error ?? "unknown_error";
    const code: TikTokErrorCode =
      raw.error === "invalid_grant" || raw.error === "access_denied" ? "permission_denied" : "api_error";
    throw new TikTokError(code, "TikTok rejected the token request.", description);
  }
  const expiresIn = typeof raw.expires_in === "number" ? raw.expires_in : 86_400;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? null,
    openId: raw.open_id ?? null,
    scopes: raw.scope ? raw.scope.split(/[,\s]+/).filter(Boolean) : [],
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

async function postForm(body: Record<string, string>): Promise<RawTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams(body),
  });
  const text = await res.text();
  let json: RawTokenResponse;
  try {
    json = JSON.parse(text) as RawTokenResponse;
  } catch {
    throw new TikTokError("api_error", "Unexpected response from TikTok token endpoint.", `HTTP ${res.status}`);
  }
  if (!res.ok && !json.error) {
    throw new TikTokError("api_error", "TikTok token endpoint failed.", `HTTP ${res.status}`);
  }
  return json;
}

export async function exchangeCodeForToken(code: string, origin: string): Promise<TokenSet> {
  const { clientKey, clientSecret } = readCredentials();
  return parseTokenResponse(
    await postForm({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUriFor(origin),
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const { clientKey, clientSecret } = readCredentials();
  const next = parseTokenResponse(
    await postForm({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
  return { ...next, refreshToken: next.refreshToken ?? refreshToken };
}

export async function revokeAccessToken(accessToken: string): Promise<void> {
  const { clientKey, clientSecret } = readCredentials();
  await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    }),
  }).catch(() => undefined);
}

/* ------------------------------- data reads ------------------------------- */

interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
}

function assertOk(status: number, error?: { code?: string; message?: string }): void {
  const code = error?.code;
  if (!code || code === "ok") {
    if (status >= 400) {
      throw new TikTokError("api_error", "TikTok API request failed.", `HTTP ${status}`);
    }
    return;
  }
  const message = error?.message ?? code;
  // Scope errors must be checked first: TikTok returns them with HTTP 401,
  // which would otherwise be misreported as an expired connection.
  if (status === 403 || code === "scope_not_authorized" || code === "scope_permission_missed") {
    throw new TikTokError("permission_denied", "A required TikTok permission was not granted.", message);
  }
  if (status === 401 || code === "access_token_invalid" || code === "access_token_expired") {
    throw new TikTokError("expired", "The TikTok access token is no longer valid.", message);
  }
  if (status === 429 || code === "rate_limit_exceeded") {
    throw new TikTokError("rate_limited", "TikTok rate limit reached, try again shortly.", message);
  }
  throw new TikTokError("api_error", "TikTok API returned an error.", message);
}

interface RawUser {
  open_id?: string;
  display_name?: string;
  avatar_url?: string;
  bio_description?: string;
  profile_deep_link?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export async function fetchUserInfo(accessToken: string): Promise<AccountRecord> {
  const res = await fetch(`${USER_INFO_URL}?fields=${encodeURIComponent(USER_FIELDS)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<{ user?: RawUser }>;
  assertOk(res.status, json.error);
  const user = json.data?.user;
  if (!user) throw new TikTokError("api_error", "TikTok did not return a user profile.");

  // `display_name` is the only name the Display API returns; the @handle is not
  // part of these scopes, so the profile deep link is used for identity instead.
  return {
    displayName: user.display_name ?? "حسابي على تيك توك",
    avatarUrl: user.avatar_url ?? null,
    profileUrl: user.profile_deep_link ?? null,
    bio: user.bio_description ?? "",
    followerCount: user.follower_count ?? 0,
    followingCount: user.following_count ?? 0,
    likesCount: user.likes_count ?? 0,
    videoCount: user.video_count ?? 0,
  };
}

interface RawVideo {
  id?: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  share_url?: string;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

function mapVideo(raw: RawVideo): VideoRecord | null {
  if (!raw.id) return null;
  const caption = (raw.title || raw.video_description || "").trim();
  const durationSeconds = Math.max(0, Math.round(raw.duration ?? 0));
  const publishedAt = raw.create_time
    ? new Date(raw.create_time * 1000).toISOString()
    : new Date().toISOString();
  return {
    id: raw.id,
    caption: caption || "فيديو بدون وصف",
    publishedAt,
    durationSeconds,
    thumbnailUrl: raw.cover_image_url ?? null,
    shareUrl: raw.share_url ?? null,
    views: raw.view_count ?? 0,
    likes: raw.like_count ?? 0,
    comments: raw.comment_count ?? 0,
    shares: raw.share_count ?? 0,
    features: inferFeatures(caption, durationSeconds),
  };
}

/** Pages through video.list (20 per page) up to `maxVideos`. */
export async function fetchVideos(accessToken: string, maxVideos = 100): Promise<VideoRecord[]> {
  const videos: VideoRecord[] = [];
  let cursor: number | undefined;
  let guard = 0;

  while (videos.length < maxVideos && guard < 10) {
    guard += 1;
    const res = await fetch(`${VIDEO_LIST_URL}?fields=${encodeURIComponent(VIDEO_FIELDS)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
    });
    const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<{
      videos?: RawVideo[];
      cursor?: number;
      has_more?: boolean;
    }>;
    assertOk(res.status, json.error);

    for (const raw of json.data?.videos ?? []) {
      const mapped = mapVideo(raw);
      if (mapped) videos.push(mapped);
    }
    if (!json.data?.has_more) break;
    cursor = json.data.cursor;
    if (!cursor) break;
  }

  return videos;
}

/** Full read of everything the approved scopes legitimately expose. */
export async function fetchAccountData(accessToken: string): Promise<AccountData> {
  const [account, videos] = await Promise.all([
    fetchUserInfo(accessToken),
    fetchVideos(accessToken),
  ]);
  return { account, videos, fetchedAt: new Date().toISOString() };
}
