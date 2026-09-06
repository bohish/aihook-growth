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
