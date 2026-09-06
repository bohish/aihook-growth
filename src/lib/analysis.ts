/**
 * Turns deterministic metrics + stored content features into structured
 * analysis: Content DNA patterns found inside THIS account, per-video
 * verdicts, 5 prioritised recommendations and a 7-day plan.
 *
 * Every insight is derived from the account's own videos (grouped comparisons
 * of median views), never from generic advice. Insights with too small a
 * sample are dropped or marked low confidence.
 */
import { engagementRate, formatPercent, median } from "./metrics";
import { computeScore } from "./scoring";
import {
  NO_SUBJECT_NOTE,
  buildAccountContext,
  shortTopic,
  subjectPhrase,
  type AccountContext,
  type StoredHookAnalysis,
} from "./niche";
import type {
  AccountData,
  AnalysisReport,
  DnaInsight,
  Level,
  Metrics,
  PlanDay,
  Recommendation,
  VideoRecord,
} from "./types";

const MIN_GROUP = 3; // below this we do not claim a pattern

function confidenceFor(sample: number, lift: number): Level {
  if (sample >= 8 && Math.abs(lift) >= 0.25) return "high";
  if (sample >= 5 && Math.abs(lift) >= 0.15) return "medium";
  return "low";
}

interface Group {
  label: string;
  videos: VideoRecord[];
}

function compare(
  a: Group,
  b: Group,
  titleFor: (liftPct: number) => string,
  detailFor: (aMed: number, bMed: number) => string,
): DnaInsight | null {
  if (a.videos.length < MIN_GROUP || b.videos.length < MIN_GROUP) return null;
  const aMed = median(a.videos.map((v) => v.views));
  const bMed = median(b.videos.map((v) => v.views));
  if (bMed <= 0) return null;
  const lift = (aMed - bMed) / bMed;
  if (Math.abs(lift) < 0.1) return null;
  const sample = a.videos.length + b.videos.length;
  return {
    title: titleFor(lift),
    detail: detailFor(aMed, bMed),
    liftPct: lift,
    sampleSize: sample,
    confidence: confidenceFor(sample, lift),
  };
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildContentDna(videos: VideoRecord[]): DnaInsight[] {
  const insights: DnaInsight[] = [];

  const short = videos.filter((v) => v.features.durationBucket === "12-18");
  const others = videos.filter((v) => v.features.durationBucket !== "12-18");
  const durInsight = compare(
    { label: "12-18", videos: short },
    { label: "other", videos: others },
    (lift) =>
      lift > 0
        ? "مدة 12–18 ثانية هي أفضل مدة لحسابك"
        : "المدة 12–18 ثانية أضعف من باقي المدد في حسابك",
    (a, b) => `وسيط المشاهدات ${fmt(a)} للمقاطع 12–18 ثانية، مقابل ${fmt(b)} لبقية المدد.`,
  );
  if (durInsight) insights.push(durInsight);

  const problemHook = videos.filter((v) => v.features.hookType === "problem");
  const genericHook = videos.filter((v) => v.features.hookType === "generic");
  const hookInsight = compare(
    { label: "problem", videos: problemHook },
    { label: "generic", videos: genericHook },
    (lift) =>
      lift > 0
        ? "الهوك الذي يبدأ بمشكلة يتفوق على المقدمات العامة"
        : "الهوك الذي يبدأ بمشكلة لا يتفوق على المقدمات العامة في حسابك",
    (a, b) => `وسيط المشاهدات ${fmt(a)} لهوك المشكلة، مقابل ${fmt(b)} للمقدمات العامة.`,
  );
  if (hookInsight) insights.push(hookInsight);

  const offer = videos.filter((v) => v.features.hasOffer);
  const noOffer = videos.filter((v) => !v.features.hasOffer);
  if (offer.length >= MIN_GROUP && noOffer.length >= MIN_GROUP) {
    const offerEr = median(offer.map(engagementRate));
    const noOfferEr = median(noOffer.map(engagementRate));
    const lift = noOfferEr > 0 ? (offerEr - noOfferEr) / noOfferEr : 0;
    if (Math.abs(lift) >= 0.1) {
      insights.push({
        title:
          lift > 0
            ? "فيديوهات العرض/الخصم تحقق تفاعلاً أعلى"
            : "فيديوهات العرض/الخصم تخفض معدل التفاعل",
        detail: `وسيط التفاعل ${formatPercent(offerEr)} لفيديوهات العرض، مقابل ${formatPercent(noOfferEr)} لغيرها.`,
        liftPct: lift,
        sampleSize: offer.length + noOffer.length,
        confidence: confidenceFor(offer.length + noOffer.length, lift),
      });
    }
  }

  // Best performing content tag by median views.
  const tagStats = new Map<string, number[]>();
  const tagLabels: Record<string, string> = {
    ugc: "UGC",
    product_demo: "استعراض منتج",
    talking_head: "حديث مباشر",
    trend: "ترند",
    educational: "تعليمي",
    offer: "عرض/خصم",
    behind_scenes: "كواليس",
  };
  videos.forEach((v) =>
    v.features.tags.forEach((t) => {
      tagStats.set(t, [...(tagStats.get(t) ?? []), v.views]);
    }),
  );
  const ranked = [...tagStats.entries()]
    .filter(([, arr]) => arr.length >= MIN_GROUP)
    .map(([tag, arr]) => ({ tag, med: median(arr), n: arr.length }))
    .sort((a, b) => b.med - a.med);
  if (ranked.length >= 2) {
    const best = ranked[0]!;
    const worst = ranked[ranked.length - 1]!;
    const lift = worst.med > 0 ? (best.med - worst.med) / worst.med : 0;
    insights.push({
      title: `أقوى نمط محتوى في حسابك: ${tagLabels[best.tag] ?? best.tag}`,
      detail: `وسيط ${fmt(best.med)} مشاهدة عبر ${best.n} فيديو، مقابل ${fmt(worst.med)} لنمط ${tagLabels[worst.tag] ?? worst.tag}.`,
      liftPct: lift,
      sampleSize: best.n + worst.n,
      confidence: confidenceFor(best.n + worst.n, lift),
    });
  }

  return insights;
}

/** Per-video "ليش نجح؟" / "ليش ضعُف؟" built from measurable differences. */
export function buildVerdicts(videos: VideoRecord[], all: VideoRecord[]): Record<string, string> {
  const medViews = median(all.map((v) => v.views));
  const medEr = median(all.map(engagementRate));
  const out: Record<string, string> = {};

  videos.forEach((v) => {
    const er = engagementRate(v);
    const viewLift = medViews > 0 ? (v.views - medViews) / medViews : 0;
    const erLift = medEr > 0 ? (er - medEr) / medEr : 0;
    const bits: string[] = [];

    // Simple, human buckets — exact numbers stay in the evidence sections.
    if (viewLift > 2) bits.push("المشاهدات أعلى بكثير من مستوى حسابك المعتاد");
    else if (viewLift > 0.5) bits.push("المشاهدات أعلى من المعتاد");
    else if (viewLift >= -0.2) bits.push("الأداء قريب من المعتاد");
    else bits.push("المشاهدات أقل من المعتاد");

    if (erLift > 1) bits.push("التفاعل قوي");
    else if (erLift > 0.2) bits.push("التفاعل جيد");
    else if (erLift >= -0.2) bits.push("التفاعل عادي");
    else bits.push("التفاعل ضعيف");

    const shareRate = v.views > 0 ? v.shares / v.views : 0;
    const medShareRate = median(all.map((x) => (x.views > 0 ? x.shares / x.views : 0)));
    if (medShareRate > 0 && shareRate > medShareRate * 1.3) {
      bits.push("المحتوى قابل للمشاركة أكثر من المعتاد");
    }

    if (viewLift < -0.2) {
      if (v.features.hookType === "generic") bits.push("البداية عامة ولا تعطي سبباً للبقاء");
      else if (v.durationSeconds > 30) bits.push("المدة أطول من نمط حسابك");
    }

    out[v.id] = `${bits.slice(0, 3).join("، ")}.`;
  });

  return out;
}

/* ------------------------ marketing-expert planning ----------------------- */

const HOOK_AR: Record<string, string> = {
  problem: "بداية تطرح مشكلة",
  curiosity: "بداية تشويق",
  offer: "بداية بعرض",
  generic: "بداية عامة",
  story: "بداية بقصة",
};

const TAG_AR: Record<string, string> = {
  ugc: "محتوى واقعي بأسلوب المستخدم",
  product_demo: "استعراض تفاصيل",
  talking_head: "حديث مباشر للكاميرا",
  trend: "ترند",
  educational: "شرح عملي",
  offer: "محتوى عرض",
  behind_scenes: "كواليس",
};

const durLabel = (bucket: string) =>
  bucket === "0-12"
    ? "أقل من 12 ثانية"
    : bucket === "12-18"
      ? "12–18 ثانية"
      : bucket === "18-30"
        ? "18–30 ثانية"
        : "أكثر من 30 ثانية";

/** Ready-to-say opening line for a subject, shaped by the winning hook type. */
function hookLineFor(hookType: string, subject: string, ctx: AccountContext): string {
  const s = subject;
  switch (hookType) {
    case "problem":
      return `«أغلب الناس يغلطون في ${s}… وهذا الفرق.»`;
    case "curiosity":
      return `«ما توقعت إن ${s} يطلع بهذا الشكل.»`;
    case "story":
      return `«خلني أحكي لك وش صار معي في ${s}.»`;
    case "offer":
      return `«لو تفكر في ${s}، شوف هذا قبل أي شي.»`;
    default:
      return ctx.niche === "gaming"
        ? `«مين أفضل خيار في ${s}؟ خليني أحسمها لك.»`
        : `«خلّينا نجيب على السؤال الأكثر تكراراً عن ${s}.»`;
  }
}

function ctaFor(ctx: AccountContext): string {
  switch (ctx.niche) {
    case "gaming":
      return "اختم بسؤال اختيار مباشر بين خيارين محددين من نفس اللعبة.";
    case "cooking":
      return "اختم بـ«احفظ الوصفة قبل ما تضيع» مع سؤال عن الطريقة المفضلة.";
    case "shop":
      return "اختم بخطوة واحدة واضحة: «قول لي المقاس/الخيار في التعليقات».";
    case "fitness":
      return "اختم بتحدي بسيط لأسبوع واحد واطلب النتيجة في التعليقات.";
    case "education":
      return "اختم بـ«احفظ المقطع» وسؤال عن أصعب خطوة عندهم.";
    default:
      return "اختم بطلب تفاعل واحد واضح: سؤال اختيار أو حفظ المقطع.";
  }
}

/** How to shoot it — tied to the niche, never generic filler. */
function shootFor(ctx: AccountContext, subject: string, tag?: string): string {
  const pattern = tag ? (TAG_AR[tag] ?? tag) : "نفس بنية فيديوهاتك الأقوى";
  switch (ctx.niche) {
    case "gaming":
      return `صوّر شاشة اللعب مباشرة على ${subject}، وابدأ من أقوى لقطة داخل المقطع لا من شاشة التحميل.`;
    case "cooking":
      return `ابدأ باللقطة النهائية لـ${subject} في أول ثانية، بعدها ارجع للخطوات بسرعة.`;
    case "shop":
      return `صوّر ${subject} بيدك من زاوية قريبة وأظهر التفاصيل التي يسأل عنها الناس فعلاً.`;
    case "fitness":
      return `صوّر التنفيذ الصحيح لـ${subject} ثم الخطأ الشائع في نفس اللقطة.`;
    default:
      return `اعتمد ${pattern} على ${subject}، بثلاثة مشاهد كحد أقصى.`;
  }
}

export function buildRecommendations(
  m: Metrics,
  dna: DnaInsight[],
  videos: VideoRecord[],
  ctx: AccountContext = buildAccountContext(videos),
): Recommendation[] {
  const pool: Recommendation[] = [];
  const subject = subjectPhrase(ctx);
  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const top = sorted[0];
  const topSubject = (top ? shortTopic(top.caption, 5) : null) ?? subject;

  const hookCounts = new Map<string, { n: number; views: number[] }>();
  videos.forEach((v) => {
    const e = hookCounts.get(v.features.hookType) ?? { n: 0, views: [] };
    hookCounts.set(v.features.hookType, { n: e.n + 1, views: [...e.views, v.views] });
  });
  const bestHookKey =
    [...hookCounts.entries()]
      .filter(([, e]) => e.n >= MIN_GROUP)
      .sort((a, b) => median(b[1].views) - median(a[1].views))[0]?.[0] ??
    top?.features.hookType ??
    "curiosity";
  const storedHook = ctx.bestStoredHookType;

  // 1) Turn the strongest video into a series on the same real subject.
  if (top) {
    pool.push({
      priority: 0,
      title: `حوّل «${topSubject}» إلى سلسلة من 3 مقاطع`,
      impact: "high",
      confidence: m.totalVideos >= 8 ? "high" : "medium",
      evidence: `أقوى فيديو عندك (${topSubject}) حقّق ${fmt(top.views)} مشاهدة مقابل وسيط ${fmt(m.medianViews)}.`,
      action: `كرّر نفس الاتجاه ثلاث مرات بزوايا مختلفة على ${topSubject}، وثبّت نوع البداية الناجح.`,
      shoot: shootFor(ctx, topSubject, top.features.tags[0]),
      hookLine: hookLineFor(top.features.hookType, topSubject, ctx),
      build: `${HOOK_AR[top.features.hookType] ?? "بداية مشابهة"} في أول ثانيتين، ثم مشهدان فقط، والمدة ${durLabel(top.features.durationBucket)}.`,
      cta: ctaFor(ctx),
      targetMetric: "views",
    });
  }

  // 2) Lock the winning opening type onto the account's own subject.
  pool.push({
    priority: 0,
    title: `ثبّت ${HOOK_AR[bestHookKey] ?? "البداية الأقوى"} على موضوع ${subject}`,
    impact: "high",
    confidence: (hookCounts.get(bestHookKey)?.n ?? 0 >= MIN_GROUP) ? "high" : "medium",
    evidence: storedHook
      ? `تحليل الهوكات المحفوظ يشير إلى أن «${storedHook}» هو الأقوى عندك، ونفس النوع يتكرر في أفضل فيديوهاتك.`
      : `${HOOK_AR[bestHookKey] ?? bestHookKey} حقّقت أعلى وسيط مشاهدات بين أنواع البدايات في حسابك.`,
    action: `اكتب البداية على ${subject} تحديداً، ولا تبدأ بمقدمة عامة.`,
    hookLine: hookLineFor(bestHookKey, subject, ctx),
    shoot: shootFor(ctx, subject),
    build: "الجملة الأولى قبل أي شعار أو مقدمة، والمشهد الأول هو أقوى لحظة في المقطع.",
    cta: ctaFor(ctx),
    targetMetric: "views",
  });

  // 3) Engagement: a choice question inside the account's real topic.
  if (m.medianEngagementRate < 0.06 || m.totalVideos >= 5) {
    pool.push({
      priority: 0,
      title: `اختم مقاطع ${subject} بسؤال اختيار بين خيارين`,
      impact: "medium",
      confidence: m.totalVideos >= 8 ? "high" : "medium",
      evidence: `وسيط التفاعل ${formatPercent(m.medianEngagementRate)}، والتعليقات هي أسرع مكان تقدر ترفعه.`,
      action: `اسأل سؤالاً محدداً داخل موضوع ${subject}، لا «شاركوا رأيكم».`,
      hookLine:
        ctx.niche === "gaming"
          ? `«${subject}: أي خيار تشوفه الأفضل — الأول ولا الثاني؟»`
          : `«${subject}: أنت مع الطريقة الأولى ولا الثانية؟»`,
      shoot: "خلّي الخيارين ظاهرين على الشاشة في نفس الوقت في آخر ثانيتين.",
      build: "قرار واحد فقط في المقطع، بدون سؤالين.",
      cta: ctaFor(ctx),
      targetMetric: "engagement",
    });
  }

  // 4) Concentration risk — only with the real number behind it.
  if (m.viralDependency > 0.45) {
    pool.push({
      priority: 0,
      title: `وسّع أعمدة المحتوى حول ${subject} بدل الاعتماد على مقطع واحد`,
      impact: "high",
      confidence: m.totalVideos >= 10 ? "high" : "medium",
      evidence: `${formatPercent(m.viralDependency, 0)} من مشاهداتك تأتي من ثلاثة مقاطع فقط.`,
      action: `اشتغل على عمودين ثابتين داخل ${subject} بدل فكرة واحدة تعتمد على الحظ.`,
      shoot: shootFor(ctx, subject),
      hookLine: hookLineFor(bestHookKey, subject, ctx),
      build: "عمودان يتكرران أسبوعياً بنفس الشكل حتى يعتاد الجمهور عليهما.",
      cta: ctaFor(ctx),
      targetMetric: "views",
    });
  }

  // 5) Cadence — batch shooting of the proven pillar.
  if (m.postsPerWeek < 4 || m.longestGapDays > 7) {
    pool.push({
      priority: 0,
      title: `صوّر دفعة واحدة من محتوى ${subject}`,
      impact: "high",
      confidence: "high",
      evidence: `معدل نشرك ${m.postsPerWeek} أسبوعياً وأطول انقطاع ${m.longestGapDays} يوم.`,
      action: `اجلس جلسة واحدة وصوّر 6 مقاطع من نفس اتجاه ${subject}.`,
      shoot: shootFor(ctx, subject),
      hookLine: hookLineFor(bestHookKey, subject, ctx),
      build: "نفس الإضاءة والزاوية لكل المقاطع حتى يصير التصوير أسرع.",
      cta: ctaFor(ctx),
      targetMetric: "consistency",
    });
  }

  // 6) Declining trend — double down on what the data confirms.
  if (m.trend30 < -0.05) {
    const strongestDna = dna.find((d) => (d.liftPct ?? 0) > 0);
    pool.push({
      priority: 0,
      title: `ركّز الجدول على أقوى نمط مؤكد في حسابك`,
      impact: "high",
      confidence: "medium",
      evidence:
        strongestDna?.detail ??
        `مشاهدات آخر 30 يوم أقل بـ ${Math.abs(Math.round(m.trend30 * 100))}% من الفترة السابقة.`,
      action: `خصص أغلب الجدول لاتجاه ${subject} الذي أثبت أداءه، وأوقف الأنماط الأضعف مؤقتاً.`,
      shoot: shootFor(ctx, subject),
      hookLine: hookLineFor(bestHookKey, subject, ctx),
      build: "لا تجرب صيغة جديدة أكثر من مرة في الأسبوع أثناء فترة التصحيح.",
      cta: ctaFor(ctx),
      targetMetric: "views",
    });
  }

  const impactRank: Record<Level, number> = { high: 0, medium: 1, low: 2 };
  return pool
    .sort(
      (a, b) =>
        impactRank[a.impact] - impactRank[b.impact] ||
        impactRank[a.confidence] - impactRank[b.confidence],
    )
    .slice(0, 5)
    .map((r, i) => ({ ...r, priority: i + 1 }));
}

export interface WeeklyPlanResult {
  days: PlanDay[];
  focus: string[];
}

/**
 * A focused weekly plan: 2–3 content pillars discovered inside the account,
 * repeated across the week with different angles on the same real subject.
 */
export function buildWeeklyPlanFocused(
  m: Metrics,
  videos: VideoRecord[],
  ctx: AccountContext = buildAccountContext(videos),
): WeeklyPlanResult {
  if (videos.length === 0) return { days: [], focus: [] };

  const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const medViews = median(videos.map((v) => v.views));

  const groupMed = (subset: VideoRecord[]) =>
    subset.length >= MIN_GROUP ? median(subset.map((v) => v.views)) : null;

  const tagGroups = (() => {
    const map = new Map<string, VideoRecord[]>();
    videos.forEach((v) => v.features.tags.forEach((t) => map.set(t, [...(map.get(t) ?? []), v])));
    return [...map.entries()]
      .map(([key, vids]) => ({ key, vids, med: groupMed(vids) }))
      .filter((g): g is { key: string; vids: VideoRecord[]; med: number } => g.med != null)
      .sort((a, b) => b.med - a.med);
  })();

  const durGroups = (() => {
    const map = new Map<string, VideoRecord[]>();
    videos.forEach((v) =>
      map.set(v.features.durationBucket, [...(map.get(v.features.durationBucket) ?? []), v]),
    );
    return [...map.entries()]
      .map(([key, vids]) => ({ key, med: groupMed(vids) }))
      .filter((g): g is { key: string; med: number } => g.med != null)
      .sort((a, b) => b.med - a.med);
  })();

  const targetDuration = durGroups[0]
    ? durLabel(durGroups[0].key)
    : durLabel(sorted[0]!.features.durationBucket);

  /** Pillars = strongest confirmed directions inside the account. */
  interface Pillar {
    label: string;
    subject: string;
    hookType: string;
    tag?: string | undefined;
    why: string;
  }
  const pillars: Pillar[] = [];

  const top = sorted[0]!;
  const topSubject = shortTopic(top.caption, 5) ?? subjectPhrase(ctx);
  pillars.push({
    label: topSubject,
    subject: topSubject,
    hookType: top.features.hookType,
    tag: top.features.tags[0],
    why: `أقوى مقطع عندك على هذا الاتجاه حقّق ${fmt(top.views)} مشاهدة مقابل وسيط ${fmt(medViews)}.`,
  });

  if (tagGroups[0]) {
    const p = tagGroups[0];
    const ref = [...p.vids].sort((a, b) => b.views - a.views)[0]!;
    const subj = shortTopic(ref.caption, 5) ?? subjectPhrase(ctx);
    if (subj !== topSubject) {
      pillars.push({
        label: TAG_AR[p.key] ?? p.key,
        subject: subj,
        hookType: ref.features.hookType,
        tag: p.key,
        why: `${TAG_AR[p.key] ?? p.key} حقّق وسيط ${fmt(p.med)} مشاهدة عبر ${p.vids.length} مقاطع.`,
      });
    }
  }

  const shareLeader = [...videos]
    .filter((v) => v.views > 0)
    .sort((a, b) => b.shares / b.views - a.shares / a.views)[0];
  if (shareLeader && shareLeader.shares > 0 && pillars.length < 3) {
    const subj = shortTopic(shareLeader.caption, 5) ?? subjectPhrase(ctx);
    if (!pillars.some((p) => p.subject === subj)) {
      pillars.push({
        label: subj,
        subject: subj,
        hookType: shareLeader.features.hookType,
        tag: shareLeader.features.tags[0],
        why: `هذا الاتجاه سجّل ${fmt(shareLeader.shares)} مشاركة على ${fmt(shareLeader.views)} مشاهدة، أعلى نسبة مشاركة عندك.`,
      });
    }
  }

  const angles = [
    { note: "الزاوية الأولى: الفكرة الأساسية كما نجحت", plus: "" },
    { note: "الزاوية الثانية: الخطأ الشائع في نفس الموضوع", plus: " — الخطأ الشائع" },
    { note: "الزاوية الثالثة: مقارنة بين خيارين داخل نفس الموضوع", plus: " — مقارنة خيارين" },
  ];

  const items: PlanDay[] = [];
  const dayCount = m.postsPerWeek < 4 || m.longestGapDays > 7 ? 5 : 6;

  for (let i = 0; items.length < dayCount && i < 12; i += 1) {
    const pillar = pillars[i % pillars.length]!;
    const angle = angles[Math.floor(i / pillars.length) % angles.length]!;
    items.push({
      dayAr: days[items.length]!,
      idea: `${pillar.subject}${angle.plus}`,
      hook: hookLineFor(pillar.hookType, pillar.subject, ctx),
      format: shootFor(ctx, pillar.subject, pillar.tag),
      cta: ctaFor(ctx),
      targetDuration,
      why: `${pillar.why} ${angle.note}.`,
    });
  }

  if (m.postsPerWeek < 4 || m.longestGapDays > 7) {
    items.push({
      dayAr: days[items.length]!,
      idea: "يوم تصوير مجمّع (بدون نشر)",
      hook: "—",
      format: `صوّر دفعة من ${pillars.map((p) => p.subject).join(" و")} في جلسة واحدة.`,
      cta: "—",
      targetDuration,
      why: `معدل نشرك ${m.postsPerWeek} أسبوعياً وأطول انقطاع ${m.longestGapDays} يوم، فالتصوير المجمّع يثبّت الجدول.`,
    });
  }

  return {
    days: items.slice(0, 7),
    focus: pillars.slice(0, 3).map((p) => p.label),
  };
}

export function analyze(
  data: AccountData,
  metrics: Metrics,
  previousScore?: number,
  hookAnalyses: StoredHookAnalysis[] = [],
): AnalysisReport {
  const scoring = computeScore(metrics);
  const sorted = [...data.videos].sort((a, b) => b.views - a.views);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();
  const dna = buildContentDna(data.videos);
  const ctx = buildAccountContext(data.videos, hookAnalyses);
  const plan = buildWeeklyPlanFocused(metrics, data.videos, ctx);

  return {
    account: data.account,
    metrics,
    scoring,
    scoreDelta: previousScore != null ? scoring.score - previousScore : 0,
    top,
    bottom,
    verdicts: buildVerdicts([...top, ...bottom], data.videos),
    dna,
    limitedData: data.videos.length < 5,
    recommendations: buildRecommendations(metrics, dna, data.videos, ctx),
    plan: plan.days,
    planFocus: plan.focus,
    contextNote: ctx.hasSubjectEvidence
      ? `مجال الحساب حسب محتواك: ${ctx.nicheLabel}.`
      : NO_SUBJECT_NOTE,
    generatedAt: new Date().toISOString(),
  };
}
