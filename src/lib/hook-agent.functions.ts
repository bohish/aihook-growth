import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

const inputSchema = z.object({
  hook: z.string().min(3).max(2000),
});

export type HookAgentResult =
  | { ok: true; json: string }
  | { ok: false; error: string; missing?: string[] };

/** Calls the external HookAnalyzerAgent backend. */
export const analyzeHook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<HookAgentResult> => {
    const url = process.env["HOOK_PROCESSOR_URL"];
    const secret = process.env["HOOK_SHARED_SECRET"];
    const missing: string[] = [];
    if (!url) missing.push("HOOK_PROCESSOR_URL");
    if (!secret) missing.push("HOOK_SHARED_SECRET");
    if (!url || !secret) {
      return { ok: false, error: "الوكيل غير مضبوط بعد", missing };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hook-secret": secret,
        },
        body: JSON.stringify({
          source: "lovable-aihook",
          event: "hook_analysis",
          payload: { hook: data.hook },
        }),
      });

      if (!response.ok) {
        return { ok: false, error: `فشل الوكيل الخارجي (HTTP ${response.status})` };
      }

      return { ok: true, json: await response.text() };
    } catch {
      return { ok: false, error: "تعذّر الوصول إلى الوكيل الخارجي" };
    }
  });
