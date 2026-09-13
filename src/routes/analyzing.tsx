import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { AnalysisUnavailableError, runAnalysis } from "@/lib/report";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/analyzing")({
  head: () => ({
    meta: [
      { title: "جاري تحليل الحساب — TikTok Growth AI" },
      { name: "description", content: "نجمع بيانات الحساب، نقارن أداء الفيديوهات، ونبني خطة التحسين." },
      { property: "og:title", content: "جاري تحليل الحساب" },
      { property: "og:description", content: "مراحل التحليل: البيانات، المقارنة، نمط المحتوى، خطة التحسين." },
    ],
  }),
  component: AnalyzingPage,
});

function AnalyzingPage() {
  const { pick } = useLanguage();
  const stages = [pick("نجمع بيانات الحساب", "Collecting account data"), pick("نقارن أداء الفيديوهات", "Comparing video performance"), pick("نحلل نمط المحتوى", "Analyzing content patterns"), pick("نبني خطة التحسين", "Building your improvement plan")];
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Short, deterministic progression: the real work is instant, so we only
    // give each stage enough time to be readable — no fake long process.
    const timers = [
      window.setTimeout(() => setStage(1), 420),
      window.setTimeout(() => setStage(2), 840),
      window.setTimeout(() => setStage(3), 1260),
    ];

    void runAnalysis()
      .then(() => {
        window.setTimeout(() => {
          setStage(4);
          void navigate({ to: "/dashboard" });
        }, 1500);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof AnalysisUnavailableError
            ? error.message
            : pick("تعذّر إكمال التحليل، حاول مرة أخرى", "Analysis could not be completed, try again");
        toast.error(message);
        void navigate({ to: "/connect" });
      });

    return () => timers.forEach(window.clearTimeout);
  }, [navigate, pick]);

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-4 py-12">
        <div className="panel p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold sm:text-xl">{pick("جاري تحليل الحساب", "Analyzing your account")}</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {pick("كل المقاييس تُحسب من بيانات حسابك المسحوبة من تيك توك مباشرة", "Every metric is calculated directly from your TikTok account data")}
          </p>

          <ol className="mt-7 grid gap-3">
            {stages.map((label, i) => {
              const done = stage > i;
              const active = stage === i;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    done
                      ? "border-success/35 bg-success/8 text-foreground"
                      : active
                        ? "border-primary/45 bg-primary/8 text-foreground"
                        : "border-border bg-surface/50 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-success text-success-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : active ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span className="text-[11px]">{i + 1}</span>
                    )}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(Math.min(stage, 4) / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
