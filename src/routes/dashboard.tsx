import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Link2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  BestWorst,
  ContentHealth,
  KeyMetrics,
  NumericPerformance,
  Opportunities,
  Recommendations,
  ScoreCard,
  WeeklyPlan,
} from "@/components/dashboard/sections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useConnection } from "@/hooks/useConnection";
import { AnalysisUnavailableError, readCachedReport, runAnalysis } from "@/lib/report";
import { getBusinessCreatorData, type BusinessCreatorResult } from "@/lib/tiktok-business.functions";
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

/** TikTok for Business creator card. Shows only fields TikTok actually returned. */
function BusinessCreatorCard({ onReach }: { onReach: (value: number | null) => void }) {
  const { pick } = useLanguage();
  const [state, setState] = useState<BusinessCreatorResult | null>(null);

  useEffect(() => {
    let alive = true;
    void getBusinessCreatorData()
      .then((r) => {
        if (alive) setState(r);
      })
      .catch(() => {
        if (alive) setState({ ok: false, status: "api_error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const LABELS: Record<string, [string, string]> = {
    display_name: ["الاسم", "Name"],
    username: ["المعرّف", "Username"],
    follower_count: ["المتابعون", "Followers"],
    following_count: ["يتابع", "Following"],
    likes_count: ["الإعجابات", "Likes"],
    video_count: ["الفيديوهات", "Videos"],
  };

  const entries = Object.entries(state.creator ?? {}).filter(([k]) => k in LABELS);

  useEffect(() => {
    const rows = state?.snapshot?.videoInsights ?? [];
    const reach = rows
      .map((row) => {
        const value = row["reach"];
        return typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
      })
      .filter(Number.isFinite);
    onReach(reach.length > 0 ? reach.reduce((sum, value) => sum + value, 0) : null);
  }, [onReach, state]);

  if (!state || state.status === "not_connected") return null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">{pick("مصدر البيانات", "Data source")}</p>
          <h2 className="mt-1 text-sm font-semibold">TikTok for Business</h2>
        </div>
        <span className="size-2 bg-primary" aria-label={pick("متصل", "Connected")} />
      </div>
      {state.ok && entries.length > 0 ? (
        <div className="p-5">
          <dl className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {entries.map(([key, value]) => (
              <div key={key} className="bg-card p-3">
                <dt className="text-xs text-muted-foreground">
                  {pick(LABELS[key]![0], LABELS[key]![1])}
                </dt>
                <dd className="mt-1 text-sm font-medium tabular-nums" dir="ltr">
                  {typeof value === "number" ? value.toLocaleString("en-US") : value}
                </dd>
              </div>
            ))}
          </dl>
          {state.videoCount !== null && state.videoCount !== undefined ? <p className="mt-3 text-[11px] text-muted-foreground">{pick("فيديوهات مصرّح بها", "Authorized videos")} <span dir="ltr" className="tabular-nums text-foreground">{state.videoCount.toLocaleString("en-US")}</span></p> : null}
          {(() => {
            const noData = pick("لا توجد بيانات متاحة", "No data available");
            const toPercent = (v: unknown): number | null => {
              if (typeof v === "number") return v >= 0 && v <= 1 ? v * 100 : v;
              if (typeof v === "string") {
                const n = Number(v.trim().replace(/%$/, ""));
                if (Number.isNaN(n)) return null;
                return n >= 0 && n <= 1 ? n * 100 : n;
              }
              return null;
            };
            const LABEL_KEYS = [
              "name", "label", "city", "city_name", "region", "region_name", "age",
              "gender", "language", "language_name", "device", "device_name",
              "interest", "category", "country", "country_code", "country_name", "key",
            ];
            const VALUE_KEYS = ["value", "percentage", "percent", "ratio", "share", "count", "pct"];
            const pickStr = (obj: Record<string, unknown>, keys: string[]): string | null => {
              for (const k of keys) {
                if (obj[k] !== null && obj[k] !== undefined && obj[k] !== "") return String(obj[k]);
              }
              return null;
            };
            const pickNum = (obj: Record<string, unknown>, keys: string[]): number | null => {
              for (const k of keys) {
                if (k in obj) {
                  const n = toPercent(obj[k]);
                  if (n !== null) return n;
                }
              }
              return null;
            };
            type Entry = { label: string; percent: number | null; sub?: string };
            const normalize = (v: unknown): Entry[] => {
              if (v == null) return [];
              if (Array.isArray(v)) {
                return v.flatMap((item): Entry[] => {
                  if (item && typeof item === "object") {
                    const obj = item as Record<string, unknown>;
                    const label = pickStr(obj, LABEL_KEYS) ?? "";
                    const percent = pickNum(obj, VALUE_KEYS);
                    const sub = pickStr(obj, ["country", "country_code", "country_name"]);
                    const e: Entry = { label, percent };
                    if (sub && sub !== label) e.sub = sub;
                    return [e];
                  }
                  return [{ label: String(item), percent: null }];
                });
              }
              if (typeof v === "object") {
                return Object.entries(v as Record<string, unknown>).map(([k, val]) => ({
                  label: String(k),
                  percent: toPercent(val),
                }));
              }
              return [{ label: String(v), percent: null }];
            };
            const GENDER_MAP: Record<string, [string, string]> = {
              m: ["ذكر", "Male"], male: ["ذكر", "Male"],
              f: ["أنثى", "Female"], female: ["أنثى", "Female"],
              u: ["أخرى", "Other"], o: ["أخرى", "Other"],
              other: ["أخرى", "Other"], unknown: ["أخرى", "Other"],
            };
            const fmtPct = (p: number | null): string => (p === null ? "—" : `${p.toFixed(1)}%`);
            const GROUPS: Array<{ match: RegExp; labels: [string, string]; gender?: boolean }> = [
              { match: /gender/i, labels: ["الجنس", "Gender"], gender: true },
              { match: /age/i, labels: ["العمر", "Age"] },
              { match: /countr/i, labels: ["الدول", "Countries"] },
              { match: /city|cities/i, labels: ["المدن", "Cities"] },
              { match: /region/i, labels: ["المناطق", "Regions"] },
              { match: /language/i, labels: ["اللغة", "Language"] },
              { match: /device/i, labels: ["الأجهزة", "Devices"] },
              { match: /interest/i, labels: ["الاهتمامات", "Interests"] },
            ];
            const audience = state.audience ?? {};
            const tiles = GROUPS.map((g, idx) => {
              const entries: Entry[] = [];
              for (const [key, value] of Object.entries(audience)) {
                if (g.match.test(key)) entries.push(...normalize(value));
              }
              const sorted = entries
                .filter((e) => e.label !== "")
                .sort((a, b) => {
                  if (a.percent === null && b.percent === null) return a.label.localeCompare(b.label);
                  if (a.percent === null) return 1;
                  if (b.percent === null) return -1;
                  return b.percent - a.percent;
                });
              const hasData = sorted.length > 0;
              const isMain = idx < 5;
              if (!hasData && !isMain) return null;
              return { g, sorted, hasData };
            });
            const visible = tiles.filter((t): t is NonNullable<typeof t> => t !== null);
            if (visible.length === 0) return null;
            return (
              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-base font-bold">{pick("الجمهور", "Audience")}</p>
                  <span className="text-[10px] uppercase text-muted-foreground">TikTok Insights</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map(({ g, sorted, hasData }, i) => (
                    <article key={i} className="panel min-h-40 p-4">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                        {pick(g.labels[0], g.labels[1])}
                      </p>
                      {hasData ? (
                        g.gender ? (
                          <div className="mt-2 grid grid-cols-[7rem_1fr] items-center gap-2" dir="ltr">
                            <div className="h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={sorted} dataKey="percent" nameKey="label" innerRadius={30} outerRadius={47} stroke="var(--color-card)">
                                    {sorted.map((_, index) => <Cell key={index} fill={`var(--color-chart-${Math.min(index + 1, 5)})`} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 4 }} formatter={(value) => fmtPct(Number(value))} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <ul className="space-y-2">
                              {sorted.map((entry, index) => (
                                <li key={index} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                    <span className="size-2 shrink-0" style={{ backgroundColor: `var(--color-chart-${Math.min(index + 1, 5)})` }} />
                                    <span className="truncate">{pick(...(GENDER_MAP[entry.label.trim().toLowerCase()] ?? [entry.label, entry.label]))}</span>
                                  </span>
                                  <span className="font-semibold tabular-nums">{fmtPct(entry.percent)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <ul className="mt-4 space-y-3">
                            {sorted.map((entry, index) => {
                              const width = entry.percent === null ? 0 : Math.min(100, Math.max(0, entry.percent));
                              return (
                                <li key={index}>
                                  <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="truncate text-muted-foreground" dir="auto">{entry.label}{entry.sub ? ` (${entry.sub})` : ""}</span>
                                    <span className="font-semibold tabular-nums" dir="ltr">{fmtPct(entry.percent)}</span>
                                  </div>
                                  <div className="mt-1.5 h-1 overflow-hidden bg-muted"><div className="h-full bg-primary" style={{ width: `${width}%` }} /></div>
                                </li>
                              );
                            })}
                          </ul>
                        )
                      ) : (
                        <div className="flex min-h-28 items-center justify-center text-xs text-muted-foreground">{noData}</div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            );
          })()}
          {(() => {
            const snap = state.snapshot;
            const fmt = (v: number | null | undefined, digits = 0) =>
              v == null || !Number.isFinite(v)
                ? "—"
                : v.toLocaleString("en-US", { maximumFractionDigits: digits });
            const num = (v: unknown) =>
              typeof v === "number"
                ? v
                : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
                  ? Number(v)
                  : null;
            const stats = snap?.accountStats ?? {};
            const STAT: Array<[string, string, string]> = [
              ["followers_count", "المتابعون", "Followers"],
              ["profile_views", "زيارات الملف", "Profile views"],
              ["video_views", "مشاهدات الفيديو", "Video views"],
              ["likes", "الإعجابات", "Likes"],
              ["comments", "التعليقات", "Comments"],
              ["shares", "المشاركات", "Shares"],
            ];
            const vi = snap?.videoInsights ?? [];
            const reach = vi.map((r) => num(r["reach"])).filter((v): v is number => v !== null);
            const rates = vi.map((r) => num(r["full_video_watched_rate"])).filter((v): v is number => v !== null);
            const avgWatch = vi.map((r) => num(r["average_time_watched"])).filter((v): v is number => v !== null);
            const totalWatch = vi.map((r) => num(r["total_time_watched"])).filter((v): v is number => v !== null);
            const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
            const avg = (a: number[]) => (a.length ? sum(a) / a.length : null);
            const fullWatchAvg = rates.length ? avg(rates) : null;
            const fullWatchPct = fullWatchAvg === null ? null : fullWatchAvg <= 1 ? fullWatchAvg * 100 : fullWatchAvg;
            const INSIGHT: Array<[string, string, string, string]> = [
              ["reach", "الوصول (إجمالي)", "Total reach", fmt(reach.length ? sum(reach) : null)],
              ["full", "مشاهدة كاملة (متوسط)", "Full watch avg", fullWatchPct === null ? "—" : `${fmt(fullWatchPct, 1)}%`],
              ["avgwatch", "متوسط زمن المشاهدة", "Average watch time avg", fmt(avg(avgWatch), 1)],
              ["totalwatch", "إجمالي زمن المشاهدة", "Total watch time", fmt(totalWatch.length ? sum(totalWatch) : null)],
              ["count", "فيديوهات بتحليلات", "Videos with insights", vi.length > 0 ? fmt(vi.length) : "—"],
            ];
            const commentsOnLatest = snap?.commentsCount ?? null;
            return (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-semibold">{pick("إحصاءات الحساب", "Account stats")}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {STAT.map(([key, ar, enLabel]) => {
                      const v = typeof stats[key] === "number" ? stats[key] : num(stats[key]);
                      return (
                        <div key={key} className="panel p-3">
                          <dt className="text-[11px] text-muted-foreground">{pick(ar, enLabel)}</dt>
                          <dd className="mt-1 text-sm font-medium tabular-nums" dir="ltr">{fmt(v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                <div>
                  <p className="text-xs font-semibold">{pick("تحليلات الفيديو", "Video insights")}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {INSIGHT.map(([key, ar, enLabel, value]) => (
                      <div key={key} className="panel p-3">
                        <dt className="text-[11px] text-muted-foreground">{pick(ar, enLabel)}</dt>
                        <dd className="mt-1 text-sm font-medium tabular-nums" dir="ltr">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <p className="text-xs font-semibold">{pick("التعليقات", "Comments")}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="panel p-3">
                      <dt className="text-[11px] text-muted-foreground">{pick("تعليقات أحدث فيديو", "Comments on latest video")}</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums" dir="ltr">{fmt(commentsOnLatest)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            );
          })()}
          {(() => {
            const rows = state.videos ?? [];
            if (rows.length === 0) return null;
            const num = (row: Record<string, string | number>, keys: string[]): number | null => {
              for (const k of keys) {
                const v = row[k];
                if (typeof v === "number") return v;
                if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
              }
              return null;
            };
            const views = rows.map((r) => num(r, ["view_count", "video_views", "views"])).filter((v): v is number => v !== null);
            const likes = rows.map((r) => num(r, ["like_count", "likes", "digg_count"])).filter((v): v is number => v !== null);
            const comments = rows.map((r) => num(r, ["comment_count", "comments"])).filter((v): v is number => v !== null);
            const shares = rows.map((r) => num(r, ["share_count", "shares"])).filter((v): v is number => v !== null);
            const times = rows.map((r) => num(r, ["create_time", "created_time", "publish_time"])).filter((v): v is number => v !== null);
            const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
            const avg = (a: number[]) => (a.length ? sum(a) / a.length : null);
            const median = (a: number[]) => {
              if (!a.length) return null;
              const s = [...a].sort((x, y) => x - y);
              const mid = Math.floor(s.length / 2);
              return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
            };
            const totalViews = views.length ? sum(views) : null;
            const engagementRate =
              totalViews && totalViews > 0
                ? ((sum(likes) + sum(comments) + sum(shares)) / totalViews) * 100
                : null;
            let postsPerWeek: number | null = null;
            if (times.length >= 2) {
              const spanDays = (Math.max(...times) - Math.min(...times)) / 86400;
              if (spanDays > 0) postsPerWeek = (times.length / spanDays) * 7;
            }
            const fmtNum = (v: number | null, digits = 0) =>
              v === null ? pick("لا توجد بيانات متاحة", "No data available") : v.toLocaleString("en-US", { maximumFractionDigits: digits });
            const stats: Array<[string, string, string]> = [
              ["الفيديوهات المقروءة", "Videos read", rows.length.toLocaleString("en-US")],
              ["إجمالي المشاهدات", "Total views", fmtNum(totalViews)],
              ["متوسط المشاهدات", "Average views", fmtNum(avg(views))],
              ["وسيط المشاهدات", "Median views", fmtNum(median(views))],
              ["إجمالي الإعجابات", "Total likes", fmtNum(likes.length ? sum(likes) : null)],
              ["إجمالي التعليقات", "Total comments", fmtNum(comments.length ? sum(comments) : null)],
              ["إجمالي المشاركات", "Total shares", fmtNum(shares.length ? sum(shares) : null)],
              ["معدل التفاعل %", "Engagement rate %", fmtNum(engagementRate, 2)],
              ["منشورات/أسبوع", "Posts per week", fmtNum(postsPerWeek, 1)],
            ];
            return (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-semibold">{pick("أرقام الفيديوهات الحقيقية", "Real video metrics")}</p>
                <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stats.map(([ar, en, value]) => (
                    <div key={en}>
                      <dt className="text-xs text-muted-foreground">{pick(ar, en)}</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums" dir="ltr">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })()}
        </div>

      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {state.status === "denied"
            ? pick(
                "الربط موجود لكن TikTok لم يسمح بقراءة بيانات المُنشئ حتى الآن، فلا تُعرض أي أرقام",
                "The connection exists, but TikTok has not authorized creator data yet, so no numbers are shown",
              )
            : pick("تعذّر قراءة بيانات TikTok for Business حالياً", "TikTok for Business data is unavailable right now")}
        </p>
      )}
    </section>
  );
}



function Dashboard() {
  const { pick, locale } = useLanguage();
  const { user } = useAuth();
  const { connection, isLoading: connLoading } = useConnection();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [businessReach, setBusinessReach] = useState<number | null>(null);

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
               <p className="mt-1 text-xs text-muted-foreground">{pick("آخر تحديث", "Last updated")} <span dir="ltr" className="tabular-nums">{new Date(report.generatedAt).toLocaleString("en-US")}</span></p>
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

        <div className="mt-6 grid gap-8">
          <ScoreCard report={report} reach={businessReach} />
          <BusinessCreatorCard onReach={setBusinessReach} />
          <Tabs defaultValue="metrics">
            <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-surface p-1">
               <TabsTrigger value="metrics">{pick("نظرة عامة", "Overview")}</TabsTrigger>
               <TabsTrigger value="content">{pick("أقوى الهوكات", "Strongest hooks")}</TabsTrigger>
               <TabsTrigger value="dna">{pick("نمطك", "Your pattern")}</TabsTrigger>
               <TabsTrigger value="actions">{pick("الخطة التسويقية", "Marketing plan")}</TabsTrigger>
               <TabsTrigger value="plan">{pick("خطة الأسبوع", "Weekly plan")}</TabsTrigger>

            </TabsList>

            <TabsContent value="metrics" className="mt-6">
              <div className="grid gap-8">
                <KeyMetrics report={report} />
                <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
                  <NumericPerformance report={report} />
                  <ContentHealth report={report} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="content" className="mt-6">
              <BestWorst report={report} />
            </TabsContent>
            <TabsContent value="dna" className="mt-6">
              <Opportunities report={report} />
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
