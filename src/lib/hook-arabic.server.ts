/**
 * Backend-only Arabic normalization for HookAnalyzerAgent output.
 * Translates marketing/explanatory fields to Arabic before persistence.
 * Never touches the raw transcript fields (spoken_text / onscreen_text),
 * and never invents content: on any failure the original values are kept.
 */

const LATIN = /[A-Za-z]{3,}/;

/** Fields that must always be Arabic in the UI (verdict stays an enum key). */
export const ARABIC_FIELDS = [
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
] as const;

export async function arabizeAnalysis(
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return row;

  const items: Record<string, string> = {};
  for (const key of ARABIC_FIELDS) {
    const v = row[key];
    if (typeof v === "string" && v.trim() && LATIN.test(v)) items[key] = v;
  }
  const rewrites = Array.isArray(row["three_rewrites"])
    ? (row["three_rewrites"] as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim() !== "",
      )
    : [];
  rewrites.forEach((r, i) => {
    if (LATIN.test(r)) items[`three_rewrites_${i}`] = r;
  });

  if (Object.keys(items).length === 0) return row;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "ترجم قيم JSON إلى عربية تسويقية موجزة وواضحة. حافظ على نفس المفاتيح تمامًا. لا تضف مفاتيح ولا شرحًا. أعد JSON فقط.",
          },
          { role: "user", content: JSON.stringify(items) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return row;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return row;
    const translated = JSON.parse(content) as Record<string, unknown>;

    const out = { ...row };
    for (const key of ARABIC_FIELDS) {
      const v = translated[key];
      if (typeof v === "string" && v.trim()) out[key] = v.trim();
    }
    if (rewrites.length > 0) {
      out["three_rewrites"] = rewrites.map((r, i) => {
        const v = translated[`three_rewrites_${i}`];
        return typeof v === "string" && v.trim() ? v.trim() : r;
      });
    }
    return out;
  } catch {
    return row;
  }
}
