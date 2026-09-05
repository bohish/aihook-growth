/**
 * Secure, server-only persistence for TikTok connections.
 *
 * Access/refresh tokens are AES-256-GCM encrypted with a server-side key
 * (TIKTOK_TOKEN_ENC_KEY) before they touch the database, and are only ever
 * decrypted inside server code. They are never returned to the browser.
 *
 * The OAuth `state` is signed with the same key and carried in an httpOnly
 * cookie, so the public callback can verify CSRF and attribute the connection
 * to the signed-in user without trusting any query parameter.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

import {
  TikTokError,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeAccessToken,
  type TokenSet,
} from "./tiktok-api.server";
import type { ConnectionState } from "./types";

function encKey(): Buffer {
  const raw = process.env["TIKTOK_TOKEN_ENC_KEY"];
  if (!raw) throw new Error("TIKTOK_TOKEN_ENC_KEY is not set");
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/* ------------------------------ OAuth state ------------------------------ */

export const OAUTH_COOKIE = "tt_oauth_state";

function sign(payload: string): string {
  return createHmac("sha256", encKey()).update(payload).digest("base64url");
}

/** Opaque, tamper-proof value: base64url(json).signature */
export function createStateToken(userId: string): { state: string; cookieValue: string } {
  const nonce = randomBytes(16).toString("base64url");
  const body = Buffer.from(JSON.stringify({ userId, nonce, ts: Date.now() })).toString("base64url");
  const token = `${body}.${sign(body)}`;
  return { state: nonce, cookieValue: token };
}

export function verifyStateToken(
  cookieValue: string | undefined,
  stateParam: string | null,
): { userId: string } | null {
  if (!cookieValue || !stateParam) return null;
  const [body, signature] = cookieValue.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId?: string;
      nonce?: string;
      ts?: number;
    };
    if (!parsed.userId || !parsed.nonce) return null;
    if (parsed.nonce !== stateParam) return null;
    // 15 minute window for completing consent.
    if (!parsed.ts || Date.now() - parsed.ts > 15 * 60_000) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

/* ------------------------------ persistence ------------------------------ */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

interface ConnectionRow {
  status: string;
  open_id: string | null;
  scopes: string[];
  connected_at: string | null;
  error_message: string | null;
  token_expires_at: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
}

async function loadRow(userId: string): Promise<ConnectionRow | null> {
  const db = await admin();
  const { data } = await db
    .from("tiktok_connections")
    .select(
      "status, open_id, scopes, connected_at, error_message, token_expires_at, access_token_encrypted, refresh_token_encrypted",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

export async function saveTokenSet(userId: string, tokens: TokenSet): Promise<void> {
  const db = await admin();
  const payload = {
    user_id: userId,
    status: "connected",
    open_id: tokens.openId,
    scopes: tokens.scopes,
    access_token_encrypted: encryptToken(tokens.accessToken),
    refresh_token_encrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    token_expires_at: tokens.expiresAt,
    connected_at: new Date().toISOString(),
    error_message: null,
    is_demo: false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("tiktok_connections").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to store TikTok connection: ${error.message}`);
}

export async function markConnectionState(
  userId: string,
  status: string,
  errorMessage: string | null,
): Promise<void> {
  const db = await admin();
  await db
    .from("tiktok_connections")
    .update({ status, error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function deleteConnection(userId: string): Promise<void> {
  const db = await admin();
  const row = await loadRow(userId);
  if (row?.access_token_encrypted) {
    try {
      await revokeAccessToken(decryptToken(row.access_token_encrypted));
    } catch {
      /* revocation is best-effort; local deletion is what matters */
    }
  }
  await db.from("tiktok_connections").delete().eq("user_id", userId);
}

/**
 * Returns a usable access token, refreshing it when close to expiry.
 * Throws a TikTokError with an explicit code when the user must reconnect.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const row = await loadRow(userId);
  if (!row || !row.access_token_encrypted) {
    throw new TikTokError("expired", "No TikTok connection stored for this user.");
  }

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const stillFresh = expiresAt - Date.now() > 120_000;
  if (stillFresh) return decryptToken(row.access_token_encrypted);

  if (!row.refresh_token_encrypted) {
    await markConnectionState(userId, "expired", "انتهت صلاحية الربط، يلزم إعادة الربط.");
    throw new TikTokError("expired", "Access token expired and no refresh token is stored.");
  }

  try {
    const refreshed = await refreshAccessToken(decryptToken(row.refresh_token_encrypted));
    await saveTokenSet(userId, refreshed);
    return refreshed.accessToken;
  } catch (error) {
    await markConnectionState(userId, "expired", "تعذّر تحديث صلاحية الربط، يلزم إعادة الربط.");
    if (error instanceof TikTokError) throw error;
    throw new TikTokError("expired", "Token refresh failed.");
  }
}

export async function completeOAuth(userId: string, code: string, origin: string): Promise<void> {
  const tokens = await exchangeCodeForToken(code, origin);
  await saveTokenSet(userId, tokens);
}

const AR_MESSAGES: Record<string, string> = {
  expired: "انتهت صلاحية الربط مع تيك توك. أعد الربط للمتابعة.",
  permission_denied: "لم تُمنح إحدى الصلاحيات المطلوبة. أعد الربط ووافق على الصلاحيات الثلاث.",
  api_error: "تعذّر الوصول إلى بيانات تيك توك حالياً.",
};

/** Browser-safe view of the connection (never includes tokens). */
export async function readConnectionState(userId: string): Promise<ConnectionState> {
  const row = await loadRow(userId);
  if (!row) return { status: "disconnected" };
  const status = row.status;
  if (status === "connected") {
    return {
      status: "connected",
      scopes: row.scopes ?? [],
      connectedAt: row.connected_at,
    };
  }
  const known: ConnectionState["status"][] = ["expired", "permission_denied", "api_error", "connecting"];
  const mapped = known.includes(status as ConnectionState["status"])
    ? (status as ConnectionState["status"])
    : "disconnected";
  const message = row.error_message ?? AR_MESSAGES[mapped];
  return message ? { status: mapped, message } : { status: mapped };
}
