import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getVideoHookAnalysis, type StoredHookAnalysis } from "@/lib/hook-agent.functions";

const VERDICT_AR: Record<string, { label: string; tone: string }> = {
  continue: { label: "استمر", tone: "border-border text-foreground" },
  modify: { label: "عدّل", tone: "border-border text-foreground" },
  avoid: { label: "تجنّب", tone: "border-border text-foreground" },
};

/** Detail rows: Arabic label + field key. Hidden when the agent returned nothing. */
const DETAILS: [string, keyof StoredHookAnalysis][] = [
  ["الثانية 0-1", "hook_structure_0_1s"],
  ["الثانية 1-3", "hook_structure_1_3s"],
  ["الثانية 3-5", "hook_structure_3_5s"],
  ["مثير الانتباه", "attention_trigger"],
  ["الهوك المنطوق", "spoken_hook"],
  ["الهوك البصري", "visual_hook"],
  ["النص على الشاشة", "onscreen_hook"],
  ["فجوة الفضول", "curiosity_gap"],
  ["وعد القيمة", "value_promise"],
  ["كسر النمط", "pattern_interrupt"],
  ["تطابق الصوت والصورة", "audio_visual_match"],
  ["الجمهور المستهدف", "target_audience_signal"],
  ["النية التجارية", "commercial_intent"],
  ["جاهزية الـCTA", "cta_readiness"],
  ["أضعف لحظة", "weakest_moment"],
  ["كرّر هذا", "replicate_this"],
  ["تجنّب هذا", "avoid_this"],
  ["الكلام", "spoken_text"],
  ["نص الشاشة", "onscreen_text"],
  ["المشهد", "visual_description"],
];

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
      {label} <span className="font-semibold text-foreground">{Math.round(value)}</span>
      <span className="opacity-60">/100</span>
    </span>
  );
}

/**
 * Per-video marketing hook analysis. Reads the stored result first and only
 * calls the external agent when the user asks for it (one request at a time).
 */
export function HookAnalysisPanel({ videoId, shareUrl }: { videoId: string; shareUrl: string | null }) {
  const run = useServerFn(getVideoHookAnalysis);
  const [data, setData] = useState<StoredHookAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void run({ data: { video_id: videoId, cache_only: true } })
      .then((r) => {
        if (active) setData(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [run, videoId]);

  const analyze = async (force: boolean) => {
    setBusy(true);
    try {
      setData(
        await run({
          data: { video_id: videoId, ...(shareUrl ? { share_url: shareUrl } : {}), ...(force ? { force: true } : {}) },
        }),
      );
    } catch {
      setData((prev) =>
        prev
          ? { ...prev, status: "failed", error_message: "تعذّر تنفيذ التحليل" }
          : ({ status: "failed", video_id: videoId, error_message: "تعذّر تنفيذ التحليل" } as StoredHookAnalysis),
      );
    } finally {
      setBusy(false);
    }
  };

  const verdict = data?.verdict ? VERDICT_AR[data.verdict.toLowerCase()] : undefined;
  const rows = data ? DETAILS.filter(([, key]) => typeof data[key] === "string" && data[key]) : [];

  return (
    <div className="mt-3 border border-border/60 bg-surface/50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Sparkles className="size-3.5 text-primary" /> تحليل الهوك
      </p>

      {busy ? (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> جاري تحليل أول 5 ثوانٍ…
        </p>
      ) : data?.status === "completed" ? (
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          {/* summary line */}
          <div className="flex flex-wrap items-center gap-1.5">
            {data.hook_score !== null ? (
               <span className="border border-border px-2 py-0.5 text-[11px] font-bold text-foreground">
                {Math.round(data.hook_score)}
                <span className="text-[10px] font-normal opacity-60">/100</span>
              </span>
            ) : null}
            {data.hook_type ? (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {data.hook_type}
              </Badge>
            ) : null}
            {verdict ? (
              <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${verdict.tone}`}>
                {verdict.label}
              </Badge>
            ) : null}
            {data.clarity_score !== null ? <ScorePill label="الوضوح" value={data.clarity_score} /> : null}
            {data.pacing_score !== null ? <ScorePill label="الإيقاع" value={data.pacing_score} /> : null}
          </div>

          {data.hook_summary ? <p className="text-foreground">{data.hook_summary}</p> : null}
          {data.best_moment ? (
            <p>
              أقوى نقطة: <span className="text-foreground">{data.best_moment}</span>
            </p>
          ) : null}
          {data.retention_risk ? (
            <p>
              أكبر خطر: <span className="text-foreground">{data.retention_risk}</span>
            </p>
          ) : null}

          {rows.length > 0 || data.three_rewrites.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium accent-text"
            >
              <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
              {open ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            </button>
          ) : null}

          {open ? (
            <div className="space-y-1 border-t border-border/50 pt-2">
              {rows.map(([label, key]) => (
                <p key={key as string}>
                  {label}: <span className="text-foreground">{data[key] as string}</span>
                </p>
              ))}
              {data.three_rewrites.length > 0 ? (
                <div className="pt-1">
                  <p className="font-medium text-foreground">بدايات بديلة أقوى:</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pe-4">
                    {data.three_rewrites.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {data.confidence !== null ? <p>الثقة: {Math.round(data.confidence * 100) / 100}</p> : null}
            </div>
          ) : null}

          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void analyze(true)}>
            <RefreshCw className="size-3" /> إعادة التحليل
          </Button>
        </div>
      ) : data?.status === "failed" ? (
        <div className="mt-2 text-[11px]">
          <p className="text-destructive">{data.error_message ?? "فشل تحليل الهوك"}</p>
          <Button size="sm" variant="outline" className="mt-2 h-7 px-2 text-[11px]" onClick={() => void analyze(true)}>
            <RefreshCw className="size-3" /> إعادة المحاولة
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-2 h-7 px-2 text-[11px]" onClick={() => void analyze(false)}>
          تحليل الهوك
        </Button>
      )}
    </div>
  );
}
