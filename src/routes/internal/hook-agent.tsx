import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { analyzeLatestVideo, type HookAgentResult } from "@/lib/hook-agent.functions";

export const Route = createFileRoute("/internal/hook-agent")({ component: HookAgentPage });

function HookAgentPage() {
  const { user } = useAuth(); const [result, setResult] = useState<HookAgentResult | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); setError(null); try { setResult(await analyzeLatestVideo()); } catch (e) { setError(e instanceof Error ? e.message : "analysis_failed"); } finally { setLoading(false); } };
  return <AppShell><main className="mx-auto w-full max-w-5xl px-4 py-10" dir="rtl"><h1 className="text-2xl font-bold">HookAnalyzerAgent</h1><p className="mt-2 text-sm text-muted-foreground">مختبر داخلي: يحلل أول ٥ ثوانٍ من أحدث فيديو حقيقي فقط.</p>{!user ? <p className="panel mt-6 p-4">سجّل دخولك واربط TikTok أولًا.</p> : <Button className="mt-6" onClick={run} disabled={loading}>{loading ? <><Loader2 className="ml-2 size-4 animate-spin" /> جارِ التحليل…</> : "Analyze latest video"}</Button>}{error ? <p className="mt-6 rounded-md border border-destructive/40 p-4 text-sm text-destructive">فشل التحليل: {error}</p> : null}{result ? <section className="mt-8 grid gap-5"><div className="panel p-5"><h2 className="font-semibold">{result.video.title}</h2><p className="mt-2 text-sm">الحالة: {result.status} · الثقة: {Math.round(result.confidence * 100)}%</p><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-muted-foreground">الكلام المسموع</dt><dd>{result.spoken_text ?? "لا يوجد/لم يتضح"}</dd></div><div><dt className="text-muted-foreground">النص على الشاشة</dt><dd>{result.onscreen_text ?? "لم يُرصد"}</dd></div><div><dt className="text-muted-foreground">بداية المشهد</dt><dd>{result.visual_opening ?? "غير متاح"}</dd></div><div><dt className="text-muted-foreground">فهم الهوك</dt><dd>{result.hook_summary ?? "غير متاح"}</dd></div></dl>{result.error_code ? <p className="mt-4 text-xs text-destructive">{result.error_code}</p> : null}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{result.frames.map((frame, i) => <img key={frame} src={frame} alt={`Frame ${i + 1}`} className="aspect-[9/16] w-full rounded-md object-cover" />)}</div></section> : null}</main></AppShell>;
}
