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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { formatDateAr, formatNumber, formatPercent, formatSignedPercent } from "@/lib/metrics";
import { scoreBand } from "@/lib/scoring";
import { HookAnalysisPanel } from "@/components/dashboard/HookAnalysisPanel";
import type { AnalysisReport, DnaInsight, Level, PlanDay, Recommendation, VideoRecord } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------- score card ------------------------------- */

export function ScoreCard({ report }: { report: AnalysisReport }) {
  const { pick } = useLanguage();
  const { score, summaryAr } = report.scoring;
  const band = scoreBand(score);
  const delta = report.scoreDelta;

  return (
    <section className="panel overflow-hidden">
      <div className="grid lg:grid-cols-[18rem_1fr]">
        <div className="relative flex min-h-64 flex-col justify-between border-b border-border p-6 lg:border-b-0 lg:border-l lg:p-7">
          <p className="text-[11px] uppercase text-muted-foreground">{pick("درجة الهوك", "Hook score")}</p>
          <div className="relative mx-auto h-40 w-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: score }, { value: Math.max(0, 100 - score) }]} dataKey="value" startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} stroke="none" cx="50%" cy="72%">
                  <Cell fill="var(--color-primary)" />
                  <Cell fill="var(--color-muted)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-x-0 bottom-3 text-center">
              <span className="text-5xl font-bold tabular-nums">{score.toLocaleString("en-US")}</span>
              <span className="text-sm text-muted-foreground"> / 100</span>
            </div>
          </div>
          <p className="border-t border-border pt-3 text-center text-sm font-semibold">{pick(band.labelAr, score >= 70 ? "Strong" : score >= 45 ? "Average" : "Needs work")}</p>
        </div>
        <div className="flex flex-col justify-between gap-6 p-6 lg:p-7">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">{pick("ملخص الأداء", "Performance summary")}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{summaryAr}</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
            {report.scoring.subscores.map((item) => (
              <div key={item.key} className="bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{pick(item.labelAr, item.labelEn)}</span>
                  <span className="text-sm font-bold tabular-nums" dir="ltr">{item.value.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            {delta > 0 ? <TrendingUp className="size-3.5" /> : delta < 0 ? <TrendingDown className="size-3.5" /> : null}
            {delta === 0
              ? pick("الدرجة مستقرة مقارنة بالفترة السابقة", "Score is stable compared with the previous period")
              : `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-US")} ${pick("نقطة مقارنة بالفترة السابقة", "points compared with the previous period")}`}
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
  const { pick } = useLanguage();
  const m = report.metrics;
  const items = [
    { label: pick("المتابعون", "Followers"), value: formatNumber(m.followers), icon: BadgeCheck },
    { label: pick("يتابع", "Following"), value: formatNumber(m.following), icon: Activity },
    { label: pick("إعجابات الحساب", "Account likes"), value: formatNumber(m.accountLikes), icon: Heart },
    { label: pick("إجمالي الفيديوهات", "Total videos"), value: formatNumber(m.totalVideos), icon: CalendarDays },
    { label: pick("المشاهدات", "Views"), value: formatNumber(m.totalViews), icon: Eye },
    { label: pick("متوسط المشاهدات", "Average views"), value: formatNumber(m.avgViews), icon: Eye },
    { label: pick("وسيط المشاهدات", "Median views"), value: formatNumber(m.medianViews), icon: Activity },
    { label: pick("التفاعل الكلي", "Total engagement"), value: formatPercent(m.totalEngagementRate), icon: Heart },
    { label: pick("وسيط التفاعل", "Median engagement"), value: formatPercent(m.medianEngagementRate), icon: Heart },
    { label: pick("إجمالي التعليقات", "Total comments"), value: formatNumber(m.totalComments), icon: MessageCircle },
    { label: pick("إجمالي المشاركات", "Total shares"), value: formatNumber(m.totalShares), icon: Repeat2 },
    { label: pick("النشر أسبوعياً", "Posts per week"), value: String(m.postsPerWeek), icon: CalendarDays },
  ];

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
         <h2 className="text-lg font-bold">{pick("المؤشرات الرقمية", "Key metrics")}</h2>
         <span className="text-[11px] text-muted-foreground">{pick("من بيانات الحساب والفيديوهات المتاحة", "From available account and video data")}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <article key={item.label} className="bg-background p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="text-[11px] leading-tight">{item.label}</span>
              <item.icon className="size-3.5" />
            </div>
            <p className="mt-4 text-2xl font-bold tabular-nums sm:text-3xl" dir="ltr">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NumberBlock({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-r border-border pr-4 first:border-r-0 first:pr-0 sm:pr-5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums" dir="ltr">{value}</p>
      {note ? <p className="mt-1 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** A compact, purely numeric view of the fields returned by TikTok. */
export function NumericPerformance({ report }: { report: AnalysisReport }) {
  const { pick } = useLanguage();
  const m = report.metrics;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="panel p-5">
        <h2 className="text-sm font-semibold">{pick("اتجاه المشاهدات", "View trend")}</h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <NumberBlock label={pick("7 أيام", "7 days")} value={formatNumber(m.views7)} note={formatSignedPercent(m.trend7)} />
          <NumberBlock label={pick("30 يوم", "30 days")} value={formatNumber(m.views30)} note={formatSignedPercent(m.trend30)} />
          <NumberBlock label={pick("آخر نشر", "Last post")} value={`${m.lastPostDaysAgo} ${pick("يوم", "days")}`} />
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold">{pick("أداء التفاعل", "Engagement performance")}</h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <NumberBlock label={pick("إعجاب / 1K", "Likes / 1K")} value={m.likesPer1kViews.toFixed(1)} />
          <NumberBlock label={pick("تعليق / 1K", "Comments / 1K")} value={m.commentsPer1kViews.toFixed(1)} />
          <NumberBlock label={pick("مشاركة / 1K", "Shares / 1K")} value={m.sharesPer1kViews.toFixed(1)} />
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold">{pick("توزيع الأداء", "Performance distribution")}</h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <NumberBlock label={pick("أقوى 3", "Top 3")} value={formatPercent(m.viralDependency, 0)} note={pick("من المشاهدات", "of views")} />
          <NumberBlock label={pick("فوق المتوسط", "Above average")} value={formatNumber(m.videosAboveAverage)} />
          <NumberBlock label={pick("تحت المتوسط", "Below average")} value={formatNumber(m.videosBelowAverage)} />
        </div>
      </section>

      <section className="panel p-5 lg:col-span-3">
        <h2 className="text-sm font-semibold">{pick("أعلى فيديوهاتك", "Your top videos")}</h2>
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <NumberBlock label={pick("أعلى مشاهدات", "Most views")} value={formatNumber(m.bestVideoViews)} />
          <NumberBlock label={pick("أعلى تفاعل", "Highest engagement")} value={formatPercent(m.highestEngagementRate)} />
          <NumberBlock label={pick("أعلى نسبة تعليقات", "Highest comment rate")} value={formatPercent(m.highestCommentRate)} />
          <NumberBlock label={pick("أعلى نسبة مشاركات", "Highest share rate")} value={formatPercent(m.highestShareRate)} />
        </div>
      </section>
    </div>
  );
}

export function ContentHealth({ report }: { report: AnalysisReport }) {
  const { pick } = useLanguage();
  const consistency = report.scoring.subscores.find((item) => item.key === "consistency")?.value ?? 0;
  const reach = report.scoring.subscores.find((item) => item.key === "reach")?.value ?? 0;
  const engagement = report.scoring.subscores.find((item) => item.key === "engagement")?.value ?? 0;
  const efficiency = report.scoring.subscores.find((item) => item.key === "efficiency")?.value ?? 0;
  const gapScore = Math.max(0, Math.min(100, 100 - report.metrics.longestGapDays * 5));
  const data = [
    { label: pick("التفاعل", "Engagement"), value: engagement },
    { label: pick("الوصول", "Reach"), value: reach },
    { label: pick("الانتظام", "Consistency"), value: consistency },
    { label: pick("قوة المحتوى", "Content strength"), value: efficiency },
    { label: pick("فجوات النشر", "Posting gaps"), value: gapScore },
  ];
  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{pick("صحة المحتوى", "Content health")}</h2>
        <span className="text-[11px] text-muted-foreground">{pick("مؤشرات من البيانات الحالية", "Signals from current data")}</span>
      </div>
      <div className="mt-5 h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 8 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" width={110} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 4 }} formatter={(value) => [`${Number(value).toLocaleString("en-US")}/100`, pick("الدرجة", "Score")]} />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 2, 2, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function Opportunities({ report }: { report: AnalysisReport }) {
  const { pick } = useLanguage();
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{pick("نقاط الضعف والفرص", "Weaknesses and opportunities")}</h2>
        <span className="text-[11px] text-muted-foreground">{pick("من التحليل الحالي", "From current analysis")}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {report.dna.map((item, index) => (
          <article key={`${item.title}-${index}`} className="panel grid grid-cols-[3rem_1fr] gap-4 p-4">
            <div className="flex size-12 items-center justify-center border border-border bg-surface text-sm font-bold tabular-nums" dir="ltr">
              {item.liftPct == null ? "—" : formatSignedPercent(item.liftPct)}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {pick("حجم العينة", "Sample size")} <span className="tabular-nums" dir="ltr">{item.sampleSize.toLocaleString("en-US")}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
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
  const { pick } = useLanguage();
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
             {pick("لا تتوفر صورة مصغّرة لهذا الفيديو", "No thumbnail is available for this video")}
          </span>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold leading-snug">{video.caption}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
           {formatDateAr(video.publishedAt)} · {video.durationSeconds} {pick("ثانية", "seconds")}
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
           {pick("معدل التفاعل", "Engagement rate")}: <span className="font-medium text-foreground">{formatPercent(er)}</span>
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
             {video.durationSeconds} {pick("ثانية", "seconds")}
          </Badge>
        </div>

        <div className="mt-4 border border-border p-3">
           <p className="text-xs font-semibold">{tone === "top" ? pick("لماذا شدّ الانتباه؟", "Why it earned attention") : pick("ما الذي يحتاج تعديلاً؟", "What needs improvement")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{verdict}</p>
        </div>

        <HookAnalysisPanel videoId={video.id} shareUrl={video.shareUrl} />
      </div>
    </article>
  );
}

export function BestWorst({ report }: { report: AnalysisReport }) {
  const { pick } = useLanguage();
  return (
    <section className="grid gap-8">
      <div>
         <h2 className="text-lg font-bold">{pick("أقوى الهوكات", "Strongest hooks")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {report.top.map((v) => (
            <VideoCard key={v.id} video={v} verdict={report.verdicts[v.id] ?? ""} tone="top" />
          ))}
        </div>
      </div>
      <div>
         <h2 className="text-lg font-bold">{pick("هوكات تحتاج تعديل", "Hooks needing improvement")}</h2>
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
  const { pick } = useLanguage();
  return (
    <section>
       <h2 className="text-lg font-bold">{pick("نمطك الناجح", "Your winning pattern")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
         {pick("أنماط مستخرجة من فيديوهاتك بمقارنة الأداء بين المجموعات — وليست نصائح عامة", "Patterns derived from your videos by comparing performance across groups — not generic advice")}
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
                 {pick("ثقة", "Confidence")} {pick(LEVEL_AR[d.confidence], d.confidence)}
              </Badge>
               <span>{pick("حجم العيّنة", "Sample size")}: {d.sampleSize} {pick("فيديو", "videos")}</span>
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
  contextNote?: string | undefined;
}) {
  const { pick } = useLanguage();
  return (
    <section>
       <h2 className="text-lg font-bold">{pick("الخطة التسويقية — رؤية الخبير", "Marketing plan — Expert view")}</h2>
      {contextNote ? <p className="mt-2 text-xs text-muted-foreground">{contextNote}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {items.map((r, i) => {
          const isLocked = i >= items.length - locked;
          return (
            <article key={r.title} className={`panel flex flex-col p-5 ${isLocked ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 min-w-16 items-center justify-center bg-primary px-2 text-[10px] font-bold uppercase text-primary-foreground">
                  {pick(LEVEL_AR[r.impact], r.impact)}
                </span>
                <h3 className="text-sm font-semibold">{r.title}</h3>
                 <div className="ms-auto flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground"
                  >
                     {pick("الأثر", "Impact")}: {pick(LEVEL_AR[r.impact], r.impact)}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                     {pick("الثقة", "Confidence")}: {pick(LEVEL_AR[r.confidence], r.confidence)}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    <Target className="mr-1 size-3" />
                     {pick(METRIC_AR[r.targetMetric], r.targetMetric)}
                  </Badge>
                </div>
              </div>

              {isLocked ? (
                <p className="mt-4 text-xs text-muted-foreground">
                   {pick("هذه التوصية متاحة في خطة Pro مع تفاصيل الدليل والخطوة المقترحة", "This recommendation is available in Pro with evidence and the suggested action")}
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="border border-border bg-surface/60 p-3">
                       <p className="text-xs font-semibold">{pick("لماذا اخترناه من حسابك", "Why we selected it")}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.evidence}</p>
                    </div>
                    <div className="border border-border bg-surface/60 p-3">
                       <p className="text-xs font-semibold">{pick("الاتجاه المطلوب", "Recommended direction")}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.action}</p>
                    </div>
                  </div>
                  {r.hookLine ? (
                    <div className="mt-3 border border-border p-3">
                       <p className="text-xs font-semibold">{pick("جملة افتتاحية جاهزة", "Ready opening line")}</p>
                      <p className="mt-1 text-sm leading-relaxed">{r.hookLine}</p>
                    </div>
                  ) : null}
                  <dl className="mt-3 grid gap-3 md:grid-cols-3">
                    {r.shoot ? (
                      <div className="border border-border bg-surface/60 p-3">
                         <dt className="text-xs font-semibold">{pick("ماذا نصوّر", "What to shoot")}</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.shoot}</dd>
                      </div>
                    ) : null}
                    {r.build ? (
                      <div className="border border-border bg-surface/60 p-3">
                         <dt className="text-xs font-semibold">{pick("طريقة البناء", "Structure")}</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.build}</dd>
                      </div>
                    ) : null}
                    {r.cta ? (
                      <div className="border border-border bg-surface/60 p-3">
                         <dt className="text-xs font-semibold">{pick("الدعوة للإجراء", "Call to action")}</dt>
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

export function WeeklyPlan({ days, focus = [] }: { days: PlanDay[]; focus?: string[] | undefined }) {
  const { pick } = useLanguage();
  return (
    <section>
       <h2 className="text-lg font-bold">{pick("التنفيذ الأسبوعي", "Weekly execution")}</h2>
      {focus.length > 0 ? (
        <p className="mt-3 border border-border bg-surface/60 p-3 text-sm leading-relaxed">
           {pick("هذا الأسبوع نركز على", "This week we focus on")}: <span className="font-semibold">{focus.join(" · ")}</span>
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
         {pick("نكرر أقوى اتجاهات حسابك بصيغ مختلفة مع سبب الاختيار لكل يوم", "We repeat your strongest directions in varied formats with a reason for each day")}
      </p>
      <div className="relative mt-5 grid gap-0 border-y border-border">
        {days.map((d, index) => (
          <article key={d.dayAr} className="grid gap-4 border-b border-border py-5 last:border-b-0 md:grid-cols-[8rem_1fr] md:gap-6">
            <div className="flex items-center gap-3 md:items-start">
              <span className="flex size-8 shrink-0 items-center justify-center border border-primary bg-primary text-xs font-bold text-primary-foreground" dir="ltr">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-semibold">{d.dayAr}</p>
                <p className="mt-1 text-[11px] text-muted-foreground" dir="auto">{d.targetDuration}</p>
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold leading-snug">{d.idea}</h3>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
              <div>
                 <dt className="text-muted-foreground">{pick("الهوك", "Hook")}</dt>
                <dd className="mt-0.5">{d.hook}</dd>
              </div>
              <div>
                 <dt className="text-muted-foreground">{pick("الصيغة", "Format")}</dt>
                <dd className="mt-0.5">{d.format}</dd>
              </div>
              <div>
                 <dt className="text-muted-foreground">{pick("الدعوة للإجراء", "Call to action")}</dt>
                <dd className="mt-0.5">{d.cta}</dd>
              </div>
              </dl>
              <p className="mt-4 border-s-2 border-primary ps-3 text-[11px] leading-relaxed text-muted-foreground">
              {d.why}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
