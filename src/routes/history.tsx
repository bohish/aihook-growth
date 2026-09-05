import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchHistory } from "@/lib/report";

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

const SUB_LABELS: Record<string, string> = {
  reach: "الوصول",
  engagement: "التفاعل",
  consistency: "الاستمرارية",
  efficiency: "كفاءة المحتوى",
};

function HistoryPage() {
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
          <h1 className="text-xl font-bold sm:text-2xl">سجل التقارير</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          كل تحليل يُحفظ كلقطة (snapshot) حتى تقارن الدرجة والمقاييس عبر الوقت.
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري التحميل…
          </div>
        ) : !user ? (
          <div className="panel mt-8 p-6">
            <h2 className="text-base font-semibold">السجل يحتاج حساباً</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              أنشئ حساباً مجانياً وسنحفظ كل تحليل تشغّله تلقائياً.
            </p>
            <Button asChild className="mt-4">
              <Link to="/auth">إنشاء حساب</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري تحميل السجل…
          </div>
        ) : !data || data.length === 0 ? (
          <div className="panel mt-8 p-6">
            <h2 className="text-base font-semibold">لا يوجد تقارير بعد</h2>
            <p className="mt-2 text-sm text-muted-foreground">شغّل أول تحليل وسيظهر هنا مباشرة.</p>
            <Button asChild className="mt-4">
              <Link to="/analyzing">حلّل حسابي</Link>
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
                      {delta === 0 ? "بدون تغيير" : `${delta > 0 ? "+" : ""}${delta}`}
                    </span>
                    <span className="mr-auto text-xs text-muted-foreground" dir="ltr">
                      {new Date(row.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  {row.summary ? (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.summary}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(row.subscores ?? {}).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="font-normal">
                        {SUB_LABELS[key] ?? key}: {value}
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
