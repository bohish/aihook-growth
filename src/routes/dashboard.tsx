import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Link2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  BestWorst,
  ContentDna,
  KeyMetrics,
  NumericPerformance,
  Recommendations,
  ScoreCard,
  WeeklyPlan,
} from "@/components/dashboard/sections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useConnection } from "@/hooks/useConnection";
import { AnalysisUnavailableError, readCachedReport, runAnalysis } from "@/lib/report";
import type { AnalysisReport } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة درجة الهوك — HOOK" },
      {
        name: "description",
        content: "درجة الهوك، الوصول والتفاعل وانتظام النشر، أقوى الهوكات والهوكات التي تحتاج تعديل، وخطة أسبوعية.",
      },
      { property: "og:title", content: "لوحة تحليل حساب تيك توك" },
      { property: "og:description", content: "درجة الحساب ومقاييسه الأساسية مع توصيات مرتبة بالأثر." },
    ],
  }),
  component: Dashboard,
});

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { to: "/connect" | "/auth"; label: string };
}) {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="panel p-6 md:p-8">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 accent-text">
            <Link2 className="size-5" />
          </span>
          <h1 className="mt-5 text-xl font-bold sm:text-2xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          <Button asChild className="mt-6 h-12 px-6 text-base">
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Dashboard() {
  const { pick, locale } = useLanguage();
  const { user } = useAuth();
  const { connection, isLoading: connLoading } = useConnection();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const connected = connection.status === "connected";

  useEffect(() => {
    if (!connected) return;
    const cached = readCachedReport();
    if (cached) {
      setReport(cached);
      return;
    }
    setBusy(true);
    void runAnalysis()
      .then((r) => {
        setReport(r);
        setProblem(null);
      })
      .catch((error: unknown) => {
        setProblem(
           error instanceof AnalysisUnavailableError ? error.message.replaceAll(".", "") : pick("تعذّر تحميل التحليل من TikTok", "TikTok analysis could not be loaded"),
        );
      })
      .finally(() => setBusy(false));
   }, [connected, pick]);

  const refresh = async () => {
    setBusy(true);
    try {
      setReport(await runAnalysis());
      setProblem(null);
       toast.success(pick("تم تحديث التحليل من TikTok", "TikTok analysis updated"));
    } catch (error) {
      const message =
         error instanceof AnalysisUnavailableError ? error.message.replaceAll(".", "") : pick("تعذّر تحديث التحليل", "Analysis could not be updated");
      setProblem(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <EmptyState
         title={pick("سجّل الدخول لعرض تحليل حسابك", "Sign in to view your account analysis")}
         body={pick("نربط التحليل بحسابك لحفظ السجل ومقارنة الدرجة عبر الوقت", "We link analysis to your account to save history and compare scores over time")}
         cta={{ to: "/auth", label: pick("تسجيل الدخول", "Sign in") }}
      />
    );
  }

  if (connLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
           {pick("نتحقق من حالة الربط…", "Checking connection…")}
        </div>
      </AppShell>
    );
  }

  if (!connected) {
    return (
      <EmptyState
         title={pick("اربط حساب TikTok لبدء التحليل", "Connect TikTok to start analysis")}
        body={
          connection.message ??
           pick("لا توجد بيانات قبل الربط، فالتحليل يعمل على حسابك الحقيقي فقط ولا يعرض أرقاماً افتراضية", "There is no data before connection because analysis uses your real account only and shows no placeholder numbers")
        }
         cta={{ to: "/connect", label: pick("ربط حساب TikTok", "Connect TikTok") }}
      />
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-16">
          {problem ? (
            <div className="panel p-6 md:p-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
               <h1 className="mt-5 text-xl font-bold">{pick("التحليل غير متاح حالياً", "Analysis is currently unavailable")}</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{problem}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => void refresh()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                   {pick("إعادة المحاولة", "Try again")}
                </Button>
                <Button asChild variant="outline">
                   <Link to="/connect">{pick("إدارة الربط", "Manage connection")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
               {pick("نجلب بيانات حسابك من TikTok…", "Fetching your TikTok account data…")}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // Free plan: full score + 3 insights. The remaining two recommendations stay
  // locked until Pro (no payments wired yet).
  const lockedCount = 0;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {report.account.avatarUrl ? (
              <img
                src={report.account.avatarUrl}
                alt={report.account.displayName}
                width={48}
                height={48}
                className="size-12 rounded-full border border-border object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{report.account.displayName}</h1>
               <p className="mt-1 text-xs text-muted-foreground">{pick("آخر تحديث", "Last updated")} {new Date(report.generatedAt).toLocaleString(locale)}</p>
              {report.limitedData ? (
                <p className="mt-2 text-xs text-warning">
                   {pick("عدد الفيديوهات المتاح قليل، لذلك تُحسب بعض المحاور بثقة أقل", "Few videos are available, so some dimensions have lower confidence")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
               {pick("تحديث", "Refresh")}
            </Button>
            <Button asChild size="sm" variant="outline">
               <Link to="/connect">{pick("إدارة الربط", "Manage connection")}</Link>
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-6">
          <ScoreCard report={report} />

          <Tabs defaultValue="metrics" className="mt-2">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface p-1">
               <TabsTrigger value="metrics">{pick("نظرة عامة", "Overview")}</TabsTrigger>
               <TabsTrigger value="content">{pick("أقوى الهوكات", "Strongest hooks")}</TabsTrigger>
               <TabsTrigger value="dna">{pick("نمطك", "Your pattern")}</TabsTrigger>
               <TabsTrigger value="actions">{pick("الخطة التسويقية", "Marketing plan")}</TabsTrigger>
               <TabsTrigger value="plan">{pick("خطة الأسبوع", "Weekly plan")}</TabsTrigger>

            </TabsList>

            <TabsContent value="metrics" className="mt-6">
              <div className="grid gap-8">
                <KeyMetrics report={report} />
                <NumericPerformance report={report} />
              </div>
            </TabsContent>
            <TabsContent value="content" className="mt-6">
              <BestWorst report={report} />
            </TabsContent>
            <TabsContent value="dna" className="mt-6">
              <ContentDna insights={report.dna} />
            </TabsContent>
            <TabsContent value="actions" className="mt-6">
              <Recommendations items={report.recommendations} locked={lockedCount} contextNote={report.contextNote} />
            </TabsContent>
            <TabsContent value="plan" className="mt-6">
              {report.plan.length > 0 ? (
                <WeeklyPlan days={report.plan} focus={report.planFocus} />

              ) : (
                <div className="panel flex flex-col items-start gap-4 p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 accent-text" />
                     <h2 className="text-base font-semibold">{pick("لا تكفي البيانات لبناء خطة أسبوعية", "Not enough data for a weekly plan")}</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                     {pick("انشر فيديوهات أكثر ثم أعد التحليل لبناء خطة من أداء حسابك", "Publish more videos, then rerun analysis to build a plan from your performance")}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
