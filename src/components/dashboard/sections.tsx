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
import type { AnalysisReport, DnaInsight, Level, PlanDay, Recommendation, VideoRecord } from "@/lib/types";

/* ------------------------------- score card ------------------------------- */

export function ScoreCard({ report }: { report: AnalysisReport }) {
  const { score, summaryAr } = report.scoring;
  const band = scoreBand(score);
  const delta = report.scoreDelta;

  return (
    <section className="panel grain-bg p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <ScoreRing value={score} />
          <div>
            <p className="text-xs text-muted-foreground">درجة الحساب</p>
            <p className="mt-1 text-3xl font-bold">
              {score}
              <span className="text-base font-normal text-muted-foreground"> / 100</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 accent-text">
                {band.labelAr}
              </Badge>
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? <TrendingUp className="size-3.5" /> : delta < 0 ? <TrendingDown className="size-3.5" /> : null}
                {delta === 0 ? "مستقر مقارنة بالفترة السابقة" : `${delta > 0 ? "+" : ""}${delta} مقارنة بالفترة السابقة`}
              </span>
            </div>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:mr-auto">{summaryAr}</p>
      </div>
    </section>
  );
}

function ScoreRing({ value }: { value: number }) {
  const size = 96;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`الدرجة ${value} من 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* -------------------------------- subscores ------------------------------- */

export function Subscores({ report }: { report: AnalysisReport }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {report.scoring.subscores.map((s) => (
        <article key={s.key} className="panel p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">{s.labelAr}</h3>
            <span className="text-lg font-bold accent-text">{s.value}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{s.labelEn}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${s.value}%` }} />
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
    { label: "متوسط معدل التفاعل", value: formatPercent(m.avgEngagementRate), icon: Heart },
    { label: "معدل النشر أسبوعياً", value: String(m.postsPerWeek), icon: CalendarDays },
    { label: "اتجاه 7 أيام", value: formatSignedPercent(m.trend7), icon: TrendingUp, tone: m.trend7 },
    { label: "اتجاه 30 يوم", value: formatSignedPercent(m.trend30), icon: TrendingUp, tone: m.trend30 },
    { label: "الاعتماد على أقوى 3 فيديوهات", value: formatPercent(m.viralDependency, 0), icon: Flame },
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
            <p
              className={`mt-2 text-lg font-bold ${
                item.tone == null ? "" : item.tone > 0 ? "text-success" : item.tone < 0 ? "text-destructive" : ""
              }`}
            >
              {item.value}
            </p>
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
        <div
          className="relative flex h-28 items-end p-3"
          style={{
            background:
              tone === "top"
                ? "linear-gradient(135deg, color-mix(in oklab, var(--primary) 26%, var(--card)), var(--card))"
                : "linear-gradient(135deg, color-mix(in oklab, var(--destructive) 20%, var(--card)), var(--card))",
          }}
        >
          <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
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
            <div key={i} className="rounded-lg bg-surface/70 py-2">
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

        <div
          className={`mt-4 rounded-xl border p-3 ${
            tone === "top" ? "border-success/30 bg-success/8" : "border-destructive/30 bg-destructive/8"
          }`}
        >
          <p className="text-xs font-semibold">{tone === "top" ? "ليش نجح؟" : "ليش ضعُف؟"}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict}</p>
        </div>
      </div>
    </article>
  );
}

export function BestWorst({ report }: { report: AnalysisReport }) {
  return (
    <section className="grid gap-8">
      <div>
        <h2 className="text-lg font-bold">أقوى 5 فيديوهات</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {report.top.map((v) => (
            <VideoCard key={v.id} video={v} verdict={report.verdicts[v.id] ?? ""} tone="top" />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold">أضعف 5 فيديوهات</h2>
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
      <h2 className="text-lg font-bold">بصمة المحتوى (Content DNA)</h2>
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
                  className={`shrink-0 text-sm font-bold ${d.liftPct >= 0 ? "text-success" : "text-destructive"}`}
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
  consistency: "الاستمرارية",
};

export function Recommendations({ items, locked = 0 }: { items: Recommendation[]; locked?: number }) {
  return (
    <section>
      <h2 className="text-lg font-bold">خطة العمل — 5 توصيات مرتبة</h2>
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
                    className={r.impact === "high" ? "border-success/40 text-success" : "text-muted-foreground"}
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
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface/60 p-3">
                    <p className="text-xs font-semibold">الدليل من حسابك</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.evidence}</p>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/8 p-3">
                    <p className="text-xs font-semibold">الإجراء المقترح</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.action}</p>
                  </div>
                </div>
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
        كل يوم مبني على ما نجح فعلياً في حسابك، مع سبب الاختيار.
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
