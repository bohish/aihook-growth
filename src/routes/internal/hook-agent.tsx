import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeHook,
  getHookAgentStatus,
  type HookAgentResult,
  type HookAgentStatus,
} from "@/lib/hook-agent.functions";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/internal/hook-agent")({
  head: () => ({
    meta: [
      { title: "وكيل تحليل الهوك — TikTok Growth AI" },
      { name: "description", content: "أداة داخلية لتحليل نص الهوك عبر الوكيل الخارجي HookAnalyzerAgent." },
      { property: "og:title", content: "وكيل تحليل الهوك" },
      { property: "og:description", content: "فحص حالة الربط وتشغيل تحليل الهوك." },
    ],
  }),
  component: HookAgentPage,
});

function HookAgentPage() {
  const { pick } = useLanguage();
  const statusFn = useServerFn(getHookAgentStatus);
  const runFn = useServerFn(analyzeHook);
  const [status, setStatus] = useState<HookAgentStatus | null>(null);
  const [hook, setHook] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HookAgentResult | null>(null);

  useEffect(() => {
    void statusFn()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, missing: ["HOOK_PROCESSOR_URL", "HOOK_SHARED_SECRET"] }));
  }, [statusFn]);

  const run = async () => {
    setBusy(true);
    try {
      setResult(await runFn({ data: { hook } }));
    } catch {
      setResult({ ok: false, error: pick("تعذّر تنفيذ التحليل", "Analysis could not be completed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold sm:text-2xl">{pick("وكيل تحليل الهوك", "Hook Analysis Agent")}</h1>

        {status === null ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {pick("نتحقق من حالة الربط…", "Checking connection…")}
          </p>
        ) : status.configured ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> {pick("الربط مع الوكيل الخارجي جاهز", "External agent connection is ready")}
          </p>
        ) : (
          <div className="panel mt-4 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="size-4" /> {pick("الوكيل غير مضبوط", "Agent is not configured")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {pick("أضف القيم التالية في إعدادات المشروع ثم أعد المحاولة", "Add these values in Project Settings, then try again")}:
            </p>
            <ul className="mt-2 list-disc pr-5 text-sm text-muted-foreground">
              {status.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="panel mt-6 p-5">
          <Textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder={pick("اكتب نص الهوك المراد تحليله…", "Enter the hook text to analyze…")}
            className="min-h-28"
          />
          <Button
            className="mt-4"
            onClick={() => void run()}
            disabled={busy || hook.trim().length < 3 || !status?.configured}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {pick("تحليل الهوك", "Analyze hook")}
          </Button>
        </div>

        {result ? (
          <div className="panel mt-6 p-5 text-sm">
            {result.ok ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
                {result.json}
              </pre>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
