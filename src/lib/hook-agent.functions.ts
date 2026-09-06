import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


export type HookAgentStatus = {
  configured: boolean;
  missing: string[];
};

/** Reports whether the external hook processor is wired up (no secret values leak). */
export const getHookAgentStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<HookAgentStatus> => {
    const missing: string[] = [];
    if (!process.env["HOOK_PROCESSOR_URL"]) missing.push("HOOK_PROCESSOR_URL");
    if (!process.env["HOOK_SHARED_SECRET"]) missing.push("HOOK_SHARED_SECRET");
    return { configured: missing.length === 0, missing };
  },
);

const inputSchema = z
  .object({
    hook: z.string().min(3).max(2000).optional(),
    video_id: z.string().min(1).max(64).optional(),
    share_url: z.string().url().max(500).optional(),
  })
  .refine((v) => Boolean(v.hook || v.video_id || v.share_url), {
    message: "hook, video_id or share_url is required",
  });

export type HookAnalysis = {
  spoken_text?: string;
  onscreen_text?: string;
  visual_description?: string;
  hook_summary?: string;
};

export type HookAgentResult =
  | { ok: true; json: string; analysis?: HookAnalysis }
  | { ok: false; error: string; missing?: string[] };

/** Sends Lovable hook-analysis requests to Railway's HookAnalyzerAgent. */
export const analyzeHook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<HookAgentResult> => {
    const url = process.env["HOOK_PROCESSOR_URL"];
    const secret = process.env["HOOK_SHARED_SECRET"];
    const missing: string[] = [];
    if (!url) missing.push("HOOK_PROCESSOR_URL");
    if (!secret) missing.push("HOOK_SHARED_SECRET");
    if (!url || !secret) return { ok: false, error: "الوكيل غير مضبوط بعد", missing };
    try {
      const { resolveMedia } = await import("./media-resolver.server");
      const media = data.video_id || data.share_url
        ? await resolveMedia({ videoId: data.video_id, shareUrl: data.share_url })
        : null;

      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-hook-secret": secret },
        body: JSON.stringify({
          source: "lovable-aihook",
          event: "hook_analysis",
          payload: {
            ...(data.hook ? { hook: data.hook } : {}),
            ...(data.video_id ? { video_id: data.video_id } : {}),
            ...(data.share_url ? { share_url: data.share_url } : {}),
            ...(media ? { media_url: media.media_url } : {}),
          },
        }),
      });
      if (!response.ok) return { ok: false, error: `فشل الوكيل الخارجي (HTTP ${response.status})` };
      const text = await response.text();
      let analysis: HookAnalysis | undefined;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const src = (parsed["analysis"] ?? parsed["result"] ?? parsed) as Record<string, unknown>;
        const pick = (k: string) => (typeof src[k] === "string" ? (src[k] as string) : undefined);
        const found: HookAnalysis = {};
        for (const k of ["spoken_text", "onscreen_text", "visual_description", "hook_summary"] as const) {
          const v = pick(k);
          if (v) found[k] = v;
        }
        if (Object.keys(found).length > 0) analysis = found;
      } catch {
        // non-JSON response: return raw text only
      }
      return analysis ? { ok: true, json: text, analysis } : { ok: true, json: text };
    } catch {
      return { ok: false, error: "تعذّر الوصول إلى الوكيل الخارجي" };
    }
  });

/* ------------------------- cached per-video analysis ---------------------- */

/** Text fields returned by the agent (nullable = not provided, never invented). */
const TEXT_FIELDS = [
  "spoken_text",
  "onscreen_text",
  "visual_description",
  "hook_summary",
  "hook_type",
  "attention_trigger",
  "hook_structure_0_1s",
  "hook_structure_1_3s",
  "hook_structure_3_5s",
  "spoken_hook",
  "visual_hook",
  "onscreen_hook",
  "curiosity_gap",
  "value_promise",
  "pattern_interrupt",
  "audio_visual_match",
  "target_audience_signal",
  "commercial_intent",
  "cta_readiness",
  "retention_risk",
  "best_moment",
  "weakest_moment",
  "replicate_this",
  "avoid_this",
  "verdict",
] as const;

const SCORE_FIELDS = ["hook_score", "clarity_score", "pacing_score"] as const;

export type StoredHookAnalysis = {
  status: "pending" | "completed" | "failed";
  video_id: string;
  confidence: number | null;
  analyzed_at: string | null;
  error_message: string | null;
  three_rewrites: string[];
} & { [K in (typeof TEXT_FIELDS)[number]]: string | null } & {
  [K in (typeof SCORE_FIELDS)[number]]: number | null;
};

const videoInput = z.object({
  video_id: z.string().min(1).max(64),
  share_url: z.string().url().max(500).optional(),
  force: z.boolean().optional(),
  cache_only: z.boolean().optional(),
});

function pickStr(src: Record<string, unknown>, key: string): string | null {
  const v = src[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function pickNum(src: Record<string, unknown>, key: string): number | null {
  const v = src[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

const SELECT_COLS = [
  "status",
  "video_id",
  "confidence",
  "analyzed_at",
  "error_message",
  "three_rewrites",
  ...TEXT_FIELDS,
  ...SCORE_FIELDS,
].join(", ");

function emptyRow(videoId: string): StoredHookAnalysis {
  const row = {
    status: "pending" as const,
    video_id: videoId,
    confidence: null,
    analyzed_at: null,
    error_message: null,
    three_rewrites: [] as string[],
  } as StoredHookAnalysis;
  for (const k of TEXT_FIELDS) row[k] = null;
  for (const k of SCORE_FIELDS) row[k] = null;
  return row;
}

function normalize(row: Record<string, unknown> | null, videoId: string): StoredHookAnalysis {
  const out = emptyRow(videoId);
  if (!row) return out;
  const merged = { ...out, ...row } as StoredHookAnalysis;
  const rw = row["three_rewrites"];
  merged.three_rewrites = Array.isArray(rw) ? rw.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
  return merged;
}

/**
 * Cache-first hook analysis for a single TikTok video.
 * Returns the stored row when completed; otherwise calls the external agent
 * once and persists the result (failures are stored, never auto-retried).
 */
export const getVideoHookAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => videoInput.parse(data))
  .handler(async ({ data, context }): Promise<StoredHookAnalysis> => {
    const table = context.supabase.from("hook_analyses");

    const { data: existing } = await table
      .select(SELECT_COLS)
      .eq("user_id", context.userId)
      .eq("video_id", data.video_id)
      .maybeSingle();

    const existingRow = existing as Record<string, unknown> | null;

    if (
      existingRow &&
      !data.force &&
      (existingRow["status"] === "completed" || existingRow["status"] === "failed")
    ) {
      return normalize(existingRow, data.video_id);
    }


    if (data.cache_only) return normalize(existingRow, data.video_id);

    const url = process.env["HOOK_PROCESSOR_URL"];
    const secret = process.env["HOOK_SHARED_SECRET"];
    const save = async (row: Record<string, unknown>) => {
      await table.upsert(
        {
          user_id: context.userId,
          video_id: data.video_id,
          share_url: data.share_url ?? null,
          ...row,
        },
        { onConflict: "user_id,video_id" },
      );
    };

    const failWith = async (message: string): Promise<StoredHookAnalysis> => {
      await save({ status: "failed", error_message: message });
      return { ...emptyRow(data.video_id), status: "failed", error_message: message };
    };

    if (!url || !secret) return failWith("الوكيل غير مضبوط بعد");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-hook-secret": secret },
        body: JSON.stringify({
          source: "lovable-aihook",
          event: "hook_analysis",
          payload: {
            video_id: data.video_id,
            ...(data.share_url ? { share_url: data.share_url } : {}),
            output_language: "ar",
            locale: "ar-SA",
            analysis_version: "marketing-v2",
            ...(data.force ? { force: true } : {}),
            instruction:
              "Marketing Expert Analysis of the first 5 seconds: why the hook works or fails, link audio/visual/on-screen text, actionable takeaways. Not a raw vision/OCR dump; ignore sponsor logos, HUD and irrelevant on-screen text.",

          },
        }),
      });
      if (!response.ok) return failWith(`فشل الوكيل الخارجي (HTTP ${response.status})`);

      const parsed = (await response.json()) as Record<string, unknown>;
      const src = (parsed["analysis"] ?? parsed["result"] ?? parsed) as Record<string, unknown>;

      const row: Record<string, unknown> = {
        status: "completed",
        analyzed_at: new Date().toISOString(),
        error_message: null,
        confidence: pickNum(src, "confidence"),
      };
      for (const k of TEXT_FIELDS) row[k] = pickStr(src, k);
      for (const k of SCORE_FIELDS) row[k] = pickNum(src, k);
      const rewrites = src["three_rewrites"];
      row["three_rewrites"] = Array.isArray(rewrites)
        ? rewrites.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, 3)
        : [];

      const { arabizeAnalysis } = await import("./hook-arabic.server");
      const arabic = await arabizeAnalysis(row);

      await save(arabic);
      return normalize({ ...arabic, video_id: data.video_id }, data.video_id);
    } catch {
      return failWith("تعذّر الوصول إلى الوكيل الخارجي");
    }
  });
