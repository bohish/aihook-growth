import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Repeat2,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateAr, formatNumber, formatPercent, formatSignedPercent } from "@/lib/metrics";
import { scoreBand } from "@/lib/scoring";
import { HookAnalysisPanel } from "@/components/dashboard/HookAnalysisPanel";
import type { AnalysisReport, DnaInsight, Level, PlanDay, Recommendation, VideoRecord } from "@/lib/types";

/* ------------------------------- score card ------------------------------- */

export function ScoreCard({ report }: { report: AnalysisReport }) {
  const { score, summaryAr } = report.scoring;
  const band = scoreBand(score);
  const delta = report.scoreDelta;

  return (
    <section className="panel">
      <div className="grid md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="border-b border-border p-6 md:border-b-0 md:border-l md:p-8">
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">درجة الهوك</p>
          <p className="mt-4 flex items-end gap-2 font-bold leading-none">
            <span className="text-[5.5rem] tabular-nums tracking-tighter">{score}</span>
            <span className="pb-3 text-lg font-normal text-muted-foreground">/ 100</span>
          </p>
          <p className="mt-4 border-t border-border pt-3 text-sm font-semibold">{band.labelAr}</p>
        </div>
        <div className="flex flex-col justify-between gap-4 p-6 md:p-8">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{summaryAr}</p>
          <p className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            {delta > 0 ? <TrendingUp className="size-3.5" /> : delta < 0 ? <TrendingDown className="size-3.5" /> : null}
            {delta === 0
              ? "الدرجة مستقرة مقارنة بالفترة السابقة"
              : `${delta > 0 ? "+" : ""}${delta} نقطة مقارنة بالفترة السابقة`}
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- subscores ------------------------------- */

export function Subscores({ report }: { report: AnalysisReport }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {report.scoring.subscores.map((s) => (
        <article key={s.key} className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{s.labelAr}</p>
          <p className="mt-2 flex items-end gap-1 font-bold leading-none">
            <span className="text-4xl tabular-nums tracking-tight">{s.value}</span>
            <span className="pb-1 text-xs font-normal text-muted-foreground">/ 100</span>
          </p>
          <div className="mt-3 h-px overflow-hidden bg-muted">
            <div className="h-full bg-primary" style={{ width: `${s.value}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
        </article>
      ))}
    </section>
  );
}

/* --------------------------------- metrics -------------------------------- */

export function KeyMetrics({ report }: { report: AnalysisReport }) {
  const m = report.metrics;
  const items = [
    { label: "المتابعون", value: formatNumber(m.followers), icon: BadgeCheck },
    { label: "متوسط المشاهدات", value: formatNumber(m.avgViews), icon: Eye },
    { label: "وسيط المشاهدات", value: formatNumber(m.medianViews), icon: Activity },
    { label: "متوسط التفاعل", value: formatPercent(m.avgEngagementRate), icon: Heart },
    { label: "معدل النشر أسبوعياً", value: String(m.postsPerWeek), icon: CalendarDays },
    { label: "اتجاه 7 أيام", value: formatSignedPercent(m.trend7), icon: TrendingUp, tone: m.trend7 },
    { label: "اتجاه 30 يوم", value: formatSignedPercent(m.trend30), icon: TrendingUp, tone: m.trend30 },
    { label: "نصيب أقوى 3 فيديوهات من المشاهدات", value: formatPercent(m.viralDependency, 0), icon: Flame },
  ];

  return (
    <section>
      <h2 className="text-lg font-bold">المقاييس الأساسية</h2>
      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="panel p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="size-3.5" />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        الوسيط أهم من المتوسط: فرق كبير بينهما يعني أن نجاح حسابك يعتمد على مقاطع قليلة.
      </p>
    </section>
  );
}

/* ------------------------------ video sections ---------------------------- */

const TAG_LABELS: Record<string, string> = {
  ugc: "UGC",
  product_demo: "استعراض منتج",
  talking_head: "حديث مباشر",
  trend: "ترند",
  educational: "تعليمي",
  offer: "عرض/خصم",
  behind_scenes: "كواليس",
};

const HOOK_LABELS: Record<string, string> = {
  problem: "هوك مشكلة",
  curiosity: "هوك تشويق",
  offer: "هوك عرض",
  generic: "مقدمة عامة",
  story: "هوك قصة",
};

function VideoCard({ video, verdict, tone }: { video: VideoRecord; verdict: string; tone: "top" | "bottom" }) {
  const er = video.views > 0 ? (video.likes + video.comments + video.shares) / video.views : 0;

  return (
    <article className="panel overflow-hidden">
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.caption}
          loading="lazy"
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="relative flex h-28 items-end border-b border-border bg-surface p-3">
          <span className="border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
            لا تتوفر صورة مصغّرة لهذا الفيديو
          </span>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold leading-snug">{video.caption}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDateAr(video.publishedAt)} · {video.durationSeconds} ثانية
        </p>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { icon: Eye, value: formatNumber(video.views) },
            { icon: Heart, value: formatNumber(video.likes) },
            { icon: MessageCircle, value: formatNumber(video.comments) },
            { icon: Repeat2, value: formatNumber(video.shares) },
          ].map((s, i) => (
            <div key={i} className="border border-border bg-surface py-2">
              <s.icon className="mx-auto size-3.5 text-muted-foreground" />
              <p className="mt-1 text-xs font-medium">{s.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          معدل التفاعل: <span className="font-medium text-foreground">{formatPercent(er)}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {video.features.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] font-normal">
              {TAG_LABELS[t] ?? t}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[10px] font-normal">
            {HOOK_LABELS[video.features.hookType]}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-normal">
            {video.durationSeconds} ثانية
          </Badge>
        </div>

        <div className="mt-4 border border-border p-3">
          <p className="text-xs font-semibold">{tone === "top" ? "ليش شدّ الانتباه؟" : "وش يحتاج تعديل؟"}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict}</p>
        </div>

        <HookAnalysisPanel videoId={video.id} shareUrl={video.shareUrl} />
      </div>
    </article>
  );
}

export function BestWorst({ report }: { report: AnalysisReport }) {
  return (
    <section className="grid gap-8">
      <div>
        <h2 className="text-lg font-bold">أقوى الهوكات</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {report.top.map((v) => (
            <VideoCard key={v.id} video={v} verdict={report.verdicts[v.id] ?? ""} tone="top" />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold">هوكات تحتاج تعديل</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {report.bottom.map((v) => (
            <VideoCard key={v.id} video={v} verdict={report.verdicts[v.id] ?? ""} tone="bottom" />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- content DNA ------------------------------ */

const LEVEL_AR: Record<Level, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

export function ContentDna({ insights }: { insights: DnaInsight[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold">نمطك الناجح</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        أنماط مستخرجة من فيديوهاتك أنت، بمقارنة وسيط الأداء بين المجموعات — ليست نصائح عامة.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {insights.map((d) => (
          <article key={d.title} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold leading-snug">{d.title}</h3>
              {d.liftPct != null ? (
                <span
                  className="shrink-0 text-sm font-bold text-foreground"
                >
                  {formatSignedPercent(d.liftPct)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.detail}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px] font-normal">
                ثقة {LEVEL_AR[d.confidence]}
              </Badge>
              <span>حجم العيّنة: {d.sampleSize} فيديو</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- recommendations ---------------------------- */

const METRIC_AR: Record<Recommendation["targetMetric"], string> = {
  views: "المشاهدات",
  engagement: "التفاعل",
  consistency: "انتظام النشر",
};

export function Recommendations({
  items,
  locked = 0,
  contextNote,
}: {
  items: Recommendation[];
  locked?: number;
  contextNote?: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold">الخطة التسويقية — رؤية الخبير</h2>
      {contextNote ? <p className="mt-2 text-xs text-muted-foreground">{contextNote}</p> : null}
      <div className="mt-4 grid gap-4">
        {items.map((r, i) => {
          const isLocked = i >= items.length - locked;
          return (
            <article key={r.title} className={`panel p-5 ${isLocked ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  {r.priority}
                </span>
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <div className="mr-auto flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground"
                  >
                    الأثر: {LEVEL_AR[r.impact]}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    الثقة: {LEVEL_AR[r.confidence]}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    <Target className="mr-1 size-3" />
                    {METRIC_AR[r.targetMetric]}
                  </Badge>
                </div>
              </div>

              {isLocked ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  هذه التوصية متاحة في خطة Pro مع تفاصيل الدليل والخطوة المقترحة.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="border border-border bg-surface/60 p-3">
                      <p className="text-xs font-semibold">ليش اخترناه من حسابك</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.evidence}</p>
                    </div>
                    <div className="border border-border bg-surface/60 p-3">
                      <p className="text-xs font-semibold">الاتجاه المطلوب</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.action}</p>
                    </div>
                  </div>
                  {r.hookLine ? (
                    <div className="mt-3 border border-border p-3">
                      <p className="text-xs font-semibold">جملة افتتاحية جاهزة</p>
                      <p className="mt-1 text-sm leading-relaxed">{r.hookLine}</p>
                    </div>
                  ) : null}
                  <dl className="mt-3 grid gap-3 md:grid-cols-3">
                    {r.shoot ? (
                      <div className="border border-border bg-surface/60 p-3">
                        <dt className="text-xs font-semibold">وش نصوّر</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.shoot}</dd>
                      </div>
                    ) : null}
                    {r.build ? (
                      <div className="border border-border bg-surface/60 p-3">
                        <dt className="text-xs font-semibold">طريقة البناء</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.build}</dd>
                      </div>
                    ) : null}
                    {r.cta ? (
                      <div className="border border-border bg-surface/60 p-3">
                        <dt className="text-xs font-semibold">الدعوة للإجراء</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.cta}</dd>
                      </div>
                    ) : null}
                  </dl>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}


/* ------------------------------- weekly plan ------------------------------ */

export function WeeklyPlan({ days }: { days: PlanDay[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold">خطة المحتوى — 7 أيام</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        كل يوم مشتق من أرقام حسابك وأنماط فيديوهاتك، مع سبب الاختيار.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => (
          <article key={d.dayAr} className="panel p-5">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">{d.dayAr}</Badge>
              <span className="text-[11px] text-muted-foreground">{d.targetDuration}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold leading-snug">{d.idea}</h3>
            <dl className="mt-3 grid gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">الهوك</dt>
                <dd className="mt-0.5">{d.hook}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">الصيغة</dt>
                <dd className="mt-0.5">{d.format}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">الدعوة للإجراء</dt>
                <dd className="mt-0.5">{d.cta}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg border border-border bg-surface/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {d.why}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
