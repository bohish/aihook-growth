import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DemoBadge } from "@/components/DemoBadge";
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
import { readCachedReport, runAnalysis } from "@/lib/report";
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

function Dashboard() {
  const { user } = useAuth();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const cached = readCachedReport();
    if (cached) {
      setReport(cached);
      return;
    }
    setBusy(true);
    void runAnalysis()
      .then(setReport)
      .catch(() => toast.error("تعذّر تحميل التحليل"))
      .finally(() => setBusy(false));
  }, []);

  const refresh = async () => {
    setBusy(true);
    try {
      setReport(await runAnalysis());
      toast.success("تم تحديث التحليل");
    } catch {
      toast.error("تعذّر تحديث التحليل");
    } finally {
      setBusy(false);
    }
  };

  if (!report) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جاري تحضير التحليل…
        </div>
      </AppShell>
    );
  }

  // Free plan: full score + 3 insights. The remaining two recommendations stay
  // locked until Pro (no payments wired yet).
  const lockedCount = user ? 0 : 2;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{report.account.displayName}</h1>
              {report.isDemo ? <DemoBadge /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
              @{report.account.username}
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {report.isDemo
                ? "هذه بيانات حساب تجريبي خيالي (متجر عبايات) لعرض التجربة قبل ربط حسابك الحقيقي."
                : "بيانات مأخوذة من حسابك عبر تكامل TikTok الرسمي."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              تحديث
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/connect">ربط حساب حقيقي</Link>
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
              {user ? (
                <WeeklyPlan days={report.plan} />
              ) : (
                <div className="panel flex flex-col items-start gap-4 p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 accent-text" />
                    <h2 className="text-base font-semibold">خطة الأسبوع متاحة في خطة Pro</h2>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    أنشئ حساباً لحفظ التحليل، ومقارنة درجتك عبر الوقت، وفتح خطة المحتوى لسبعة
                    أيام المبنية على أداء حسابك.
                  </p>
                  <Button asChild>
                    <Link to="/auth">إنشاء حساب مجاني</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
