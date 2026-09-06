import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getVideoHookAnalysis, type StoredHookAnalysis } from "@/lib/hook-agent.functions";

/**
 * Small per-video "hook analysis" block. Reads the stored result first and only
 * calls the external agent when the user asks for it (one request at a time).
 */
export function HookAnalysisPanel({ videoId, shareUrl }: { videoId: string; shareUrl: string | null }) {
  const run = useServerFn(getVideoHookAnalysis);
  const [data, setData] = useState<StoredHookAnalysis | null>(null);
  const [busy, setBusy] = useState(false);

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
      setData({
        status: "failed",
        video_id: videoId,
        spoken_text: null,
        onscreen_text: null,
        visual_description: null,
        hook_summary: null,
        hook_type: null,
        confidence: null,
        analyzed_at: null,
        error_message: "تعذّر تنفيذ التحليل",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-surface/50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Sparkles className="size-3.5 text-primary" /> تحليل الهوك
      </p>

      {busy ? (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> جاري تحليل أول ثوانٍ من الفيديو…
        </p>
      ) : data?.status === "completed" ? (
        <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {data.hook_type ? (
            <p>
              النوع: <span className="font-medium text-foreground">{data.hook_type}</span>
            </p>
          ) : null}
          {data.hook_summary ? (
            <p>
              الملخص: <span className="text-foreground">{data.hook_summary}</span>
            </p>
          ) : null}
          {data.spoken_text ? <p>الكلام: {data.spoken_text}</p> : null}
          {data.onscreen_text ? <p>النص على الشاشة: {data.onscreen_text}</p> : null}
          {data.visual_description ? <p>المشهد: {data.visual_description}</p> : null}
          {data.confidence !== null ? <p>الثقة: {Math.round(data.confidence * 100) / 100}</p> : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => void analyze(true)}
          >
            <RefreshCw className="size-3" /> إعادة التحليل
          </Button>
        </div>
      ) : data?.status === "failed" ? (
        <div className="mt-2 text-[11px]">
          <p className="text-destructive">{data.error_message ?? "فشل تحليل الهوك"}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 px-2 text-[11px]"
            onClick={() => void analyze(true)}
          >
            <RefreshCw className="size-3" /> إعادة المحاولة
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 px-2 text-[11px]"
          onClick={() => void analyze(false)}
        >
          تحليل الهوك
        </Button>
      )}
    </div>
  );
}
