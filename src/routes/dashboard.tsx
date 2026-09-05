import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Link2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  BestWorst,
  ContentDna,
  KeyMetrics,
  Recommendations,
  ScoreCard,
  Subscores,
  WeeklyPlan,
} from "@/components/dashboard/sections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useConnection } from "@/hooks/useConnection";
import { AnalysisUnavailableError, readCachedReport, runAnalysis } from "@/lib/report";
import type { AnalysisReport } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة تحليل الحساب — TikTok Growth AI" },
      {
        name: "description",
        content: "درجة الحساب، محاور الوصول والتفاعل والاستمرارية، أفضل وأضعف الفيديوهات، وخطة أسبوعية.",
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
          error instanceof AnalysisUnavailableError ? error.message : "تعذّر تحميل التحليل من تيك توك.",
        );
      })
      .finally(() => setBusy(false));
  }, [connected]);

  const refresh = async () => {
    setBusy(true);
    try {
      setReport(await runAnalysis());
      setProblem(null);
      toast.success("تم تحديث التحليل من تيك توك");
    } catch (error) {
      const message =
        error instanceof AnalysisUnavailableError ? error.message : "تعذّر تحديث التحليل";
      setProblem(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <EmptyState
        title="سجّل الدخول لعرض تحليل حسابك"
        body="نربط تحليلك بحسابك حتى نحفظ السجل ونقارن الدرجة عبر الوقت."
        cta={{ to: "/auth", label: "تسجيل الدخول" }}
      />
    );
  }

  if (connLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          نتحقق من حالة الربط…
        </div>
      </AppShell>
    );
  }

  if (!connected) {
    return (
      <EmptyState
        title="اربط حساب تيك توك لبدء التحليل"
        body={
          connection.message ??
          "لا توجد بيانات لعرضها قبل الربط. التحليل يعمل على حسابك الحقيقي فقط، ولا نعرض أي أرقام افتراضية."
        }
        cta={{ to: "/connect", label: "ربط حساب TikTok" }}
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
              <h1 className="mt-5 text-xl font-bold">التحليل غير متاح حالياً</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{problem}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => void refresh()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  إعادة المحاولة
                </Button>
                <Button asChild variant="outline">
                  <Link to="/connect">إدارة الربط</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              نجلب بيانات حسابك من تيك توك…
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
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                بيانات حسابك مسحوبة عبر تكامل تيك توك الرسمي — آخر تحديث{" "}
                {new Date(report.generatedAt).toLocaleString("ar-SA")}.
              </p>
              {report.limitedData ? (
                <p className="mt-2 text-xs text-warning">
                  عدد الفيديوهات المتاح قليل، فبعض المحاور تُحسب بثقة أقل.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              تحديث
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/connect">إدارة الربط</Link>
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-6">
          <ScoreCard report={report} />
          <Subscores report={report} />

          <Tabs defaultValue="metrics" className="mt-2">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface p-1">
              <TabsTrigger value="metrics">المقاييس</TabsTrigger>
              <TabsTrigger value="content">أفضل وأضعف</TabsTrigger>
              <TabsTrigger value="dna">بصمة المحتوى</TabsTrigger>
              <TabsTrigger value="actions">التوصيات</TabsTrigger>
              <TabsTrigger value="plan">خطة الأسبوع</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-6">
              <KeyMetrics report={report} />
            </TabsContent>
            <TabsContent value="content" className="mt-6">
              <BestWorst report={report} />
            </TabsContent>
            <TabsContent value="dna" className="mt-6">
              <ContentDna insights={report.dna} />
            </TabsContent>
            <TabsContent value="actions" className="mt-6">
              <Recommendations items={report.recommendations} locked={lockedCount} />
            </TabsContent>
            <TabsContent value="plan" className="mt-6">
              {report.plan.length > 0 ? (
                <WeeklyPlan days={report.plan} />
              ) : (
                <div className="panel flex flex-col items-start gap-4 p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 accent-text" />
                    <h2 className="text-base font-semibold">لا تكفي البيانات لبناء خطة أسبوعية</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    انشر عدداً أكبر من الفيديوهات ثم أعد التحليل لبناء خطة مبنية على أداء حسابك.
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
