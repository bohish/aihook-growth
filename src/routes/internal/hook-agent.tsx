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
      setResult({ ok: false, error: "تعذّر تنفيذ التحليل" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold sm:text-2xl">وكيل تحليل الهوك</h1>

        {status === null ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> نتحقق من حالة الربط…
          </p>
        ) : status.configured ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> الربط مع الوكيل الخارجي جاهز
          </p>
        ) : (
          <div className="panel mt-4 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="size-4" /> الوكيل غير مضبوط
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              أضف القيم التالية في إعدادات المشروع (الأسرار) ثم أعد المحاولة:
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
            placeholder="اكتب نص الهوك المراد تحليله…"
            className="min-h-28"
          />
          <Button
            className="mt-4"
            onClick={() => void run()}
            disabled={busy || hook.trim().length < 3 || !status?.configured}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            تحليل الهوك
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
