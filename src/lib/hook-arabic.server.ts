/**
 * Backend-only "marketing expert" pass over HookAnalyzerAgent output.
 * It does not translate word-by-word: it rewrites the structured fields as a
 * practical TikTok marketing expert would, in short simple Arabic.
 * Raw transcript fields (spoken_text / onscreen_text) are kept as-is,
 * and on any failure the original values are preserved (nothing invented).
 */

/** Fields that must always read as Arabic marketing copy (verdict stays an enum key). */
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

const SYSTEM_PROMPT = `أنت خبير تسويق محتوى على تيك توك، عملي وصريح.
تستلم تحليلًا خامًا لأول 5 ثوانٍ من فيديو، وتعيد صياغته كخبير لا كآلة.
القواعد:
- عربية بسيطة وواضحة وقريبة من المستخدم، لا فصحى ثقيلة ولا عامية مبالغ فيها.
- لا تخترع أي معلومة غير موجودة في المدخل. إذا الحقل غير واضح، اتركه كما هو أو اجعله موجزًا جدًا.
- hook_summary جملة أو جملتين فقط: لماذا شدّ الانتباه أو لماذا لم يشدّ، مع ربط الصوت والصورة والنص.
- hook_type اسم عربي قصير مثل: تشويق، سؤال مباشر، وعد بنتيجة، صدمة، كشف تدريجي، قصة.
- attention_trigger و curiosity_gap و value_promise و retention_risk و best_moment و weakest_moment و replicate_this و avoid_this: عبارات قصيرة مباشرة قابلة للتنفيذ.
- three_rewrites_N: بدايات بديلة أقوى بالعربية، كل واحدة سطر واحد قابل للقول أمام الكاميرا.
- تجاهل نصوص الشاشة غير المتعلقة بالهوك مثل شعارات الرعاة أو واجهات التطبيقات أو أرقام الواجهة.
- لا نِسب مئوية ولا لغة تقنية ولا شرح طويل.
حافظ على نفس مفاتيح JSON تمامًا، بدون مفاتيح جديدة، وأعد JSON فقط.`;

export async function arabizeAnalysis(
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return row;

  const items: Record<string, string> = {};
  for (const key of ARABIC_FIELDS) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) items[key] = v;
  }
  const rewrites = Array.isArray(row["three_rewrites"])
    ? (row["three_rewrites"] as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim() !== "",
      )
    : [];
  rewrites.forEach((r, i) => {
    items[`three_rewrites_${i}`] = r;
  });

  if (Object.keys(items).length === 0) return row;

  // Light context so the rewrite is grounded, never invented.
  const context = {
    spoken_text: typeof row["spoken_text"] === "string" ? row["spoken_text"] : "",
    onscreen_text: typeof row["onscreen_text"] === "string" ? row["onscreen_text"] : "",
    verdict: typeof row["verdict"] === "string" ? row["verdict"] : "",
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({ context, fields: items }),
          },
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
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const translated = (
      typeof parsed["fields"] === "object" && parsed["fields"] !== null
        ? parsed["fields"]
        : parsed
    ) as Record<string, unknown>;

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
