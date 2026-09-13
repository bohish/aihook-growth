import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchHistory } from "@/lib/report";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "سجل التقارير — TikTok Growth AI" },
      { name: "description", content: "قارن درجة حسابك ومقاييسه الأساسية بين التقارير السابقة." },
      { property: "og:title", content: "سجل تقارير الحساب" },
      { property: "og:description", content: "تتبّع تطور درجة الحساب عبر الوقت." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { pick, locale, t } = useLanguage();
  const subLabels: Record<string, string> = { reach: pick("الوصول", "Reach"), engagement: pick("التفاعل", "Engagement"), consistency: pick("الاستمرارية", "Consistency"), efficiency: pick("كفاءة المحتوى", "Content efficiency") };
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: fetchHistory,
    enabled: Boolean(user),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-5 accent-text" />
          <h1 className="text-xl font-bold sm:text-2xl">{pick("سجل التقارير", "Report history")}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {pick("كل تحليل يُحفظ كلقطة لتقارن الدرجة والمقاييس عبر الوقت", "Every analysis is saved as a snapshot for comparing scores and metrics over time")}
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </div>
        ) : !user ? (
          <div className="panel mt-8 p-6">
            <h2 className="text-base font-semibold">{pick("السجل يحتاج حساباً", "History requires an account")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pick("أنشئ حساباً مجانياً وسنحفظ كل تحليل تلقائياً", "Create a free account and every analysis will be saved automatically")}
            </p>
            <Button asChild className="mt-4">
              <Link to="/auth">{pick("إنشاء حساب", "Create account")}</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {pick("جاري تحميل السجل…", "Loading history…")}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="panel mt-8 p-6">
            <h2 className="text-base font-semibold">{pick("لا توجد تقارير بعد", "No reports yet")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{pick("شغّل أول تحليل وسيظهر هنا مباشرة", "Run your first analysis and it will appear here")}</p>
            <Button asChild className="mt-4">
              <Link to="/analyzing">{t("analyzeAccount")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            {data.map((row) => {
              const delta = row.score_delta ?? 0;
              return (
                <article key={row.id} className="panel p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-bold accent-text">{row.score}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {delta > 0 ? <TrendingUp className="size-3.5" /> : delta < 0 ? <TrendingDown className="size-3.5" /> : null}
                      {delta === 0 ? pick("بدون تغيير", "No change") : `${delta > 0 ? "+" : ""}${delta}`}
                    </span>
                    <span className="mr-auto text-xs text-muted-foreground" dir="ltr">
                      {new Date(row.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  {row.summary ? (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.summary}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(row.subscores ?? {}).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="font-normal">
                        {subLabels[key] ?? key}: {value}
                      </Badge>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
