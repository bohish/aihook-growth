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
    if (!process.env["PROCESSOR_SHARED_SECRET"]) missing.push("PROCESSOR_SHARED_SECRET");
    return { configured: missing.length === 0, missing };
  },
);

const inputSchema = z.object({
  hook: z.string().min(3).max(2000),
});

export type HookAgentResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; missing?: string[] };

/** Calls the external HookAnalyzerAgent backend. */
export const analyzeHook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<HookAgentResult> => {
    const url = process.env["HOOK_PROCESSOR_URL"];
    const secret = process.env["PROCESSOR_SHARED_SECRET"];
    const missing: string[] = [];
    if (!url) missing.push("HOOK_PROCESSOR_URL");
    if (!secret) missing.push("PROCESSOR_SHARED_SECRET");
    if (!url || !secret) {
      return { ok: false, error: "الوكيل غير مضبوط بعد", missing };
    }

    try {
      const response = await fetch(`${url.replace(/\/+$/, "")}/analyze`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-processor-secret": secret,
        },
        body: JSON.stringify({ hook: data.hook }),
      });

      if (!response.ok) {
        return { ok: false, error: `فشل الوكيل الخارجي (HTTP ${response.status})` };
      }

      return { ok: true, data: await response.json() };
    } catch {
      return { ok: false, error: "تعذّر الوصول إلى الوكيل الخارجي" };
    }
  });
