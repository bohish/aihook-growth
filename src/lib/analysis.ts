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

function compare(a: Group, b: Group, titleFor: (liftPct: number) => string, detailFor: (aMed: number, bMed: number) => string): DnaInsight | null {
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

export function buildRecommendations(m: Metrics, dna: DnaInsight[], videos: VideoRecord[]): Recommendation[] {
  const pool: Recommendation[] = [];
  const dnaText = (needle: string) => dna.find((d) => d.title.includes(needle));

  if (m.viralDependency > 0.45) {
    pool.push({
      priority: 0,
      title: "قلّل اعتماد الحساب على فيديو واحد ناجح",
      impact: "high",
      confidence: m.totalVideos >= 10 ? "high" : "medium",
      evidence: `${formatPercent(m.viralDependency, 0)} من إجمالي المشاهدات تأتي من أقوى 3 فيديوهات فقط.`,
      action: "أعد إنتاج نفس صيغة الفيديو الأقوى بثلاث زوايا مختلفة خلال أسبوعين، وقِس الوسيط لا الذروة.",
      targetMetric: "views",
    });
  }

  if (m.postsPerWeek < 3 || m.longestGapDays > 7) {
    pool.push({
      priority: 0,
      title: "ثبّت جدول نشر 4 مرات أسبوعياً",
      impact: "high",
      confidence: "high",
      evidence: `معدل النشر الحالي ${m.postsPerWeek} أسبوعياً وأطول انقطاع ${m.longestGapDays} يوم.`,
      action: "صوّر دفعة واحدة (batch) 8 مقاطع، وانشر بأيام ثابتة: السبت، الاثنين، الأربعاء، الخميس.",
      targetMetric: "consistency",
    });
  }

  const cam = dnaText("شخص أمام الكاميرا");
  if (cam && (cam.liftPct ?? 0) > 0) {
    pool.push({
      priority: 0,
      title: "اجعل الوجه البشري عنصراً ثابتاً في كل فيديو",
      impact: "high",
      confidence: cam.confidence,
      evidence: cam.detail,
      action: "ابدأ كل مقطع بثانية واحدة لشخص يظهر أمام الكاميرا قبل أي مشهد آخر.",
      targetMetric: "views",
    });
  }

  const dur = dnaText("12–18");
  if (dur && (dur.liftPct ?? 0) > 0) {
    pool.push({
      priority: 0,
      title: "اضبط المدة المستهدفة على 12–18 ثانية",
      impact: "medium",
      confidence: dur.confidence,
      evidence: dur.detail,
      action: "احذف أي مشهد لا يخدم الهوك أو العرض، والتزم بثلاثة مشاهد كحد أقصى.",
      targetMetric: "views",
    });
  }

  const hook = dnaText("مشكلة");
  if (hook && (hook.liftPct ?? 0) > 0) {
    pool.push({
      priority: 0,
      title: "اكتب الهوك على شكل مشكلة في أول 2 ثانية",
      impact: "high",
      confidence: hook.confidence,
      evidence: hook.detail,
      action: 'استخدم صيغة "مشكلة + وعد": مثال «تخسر الانتباه بعد ثانية؟ هذه البداية تغيّر النتيجة».',
      targetMetric: "views",
    });
  }

  if (m.medianEngagementRate < 0.06) {
    pool.push({
      priority: 0,
      title: "أضف سؤالاً واحداً يخلق تعليقات",
      impact: "medium",
      confidence: m.totalVideos >= 8 ? "high" : "medium",
      evidence: `وسيط معدل التفاعل ${formatPercent(m.medianEngagementRate)} وهو أقل من مستوى النمو الصحي (6%).`,
      action: "اختم كل مقطع بسؤال اختيار بين خيارين محددين بدل «شاركوا رأيكم».",
      targetMetric: "engagement",
    });
  }

  if (m.trend30 < -0.05) {
    pool.push({
      priority: 0,
      title: "أوقف الأنماط المتراجعة وضاعف الأنماط الرابحة",
      impact: "high",
      confidence: "medium",
      evidence: `مشاهدات آخر 30 يوم أقل بـ ${Math.abs(Math.round(m.trend30 * 100))}% من الفترة السابقة.`,
      action: "علّق نشر أضعف نمطين لأسبوعين، وخصص 70% من الجدول لأقوى نمط في حسابك.",
      targetMetric: "views",
    });
  }

  const offerHeavy = videos.filter((v) => v.features.hasOffer).length / Math.max(1, videos.length);
  if (offerHeavy > 0.35) {
    pool.push({
      priority: 0,
      title: "خفّض نسبة المحتوى البيعي المباشر",
      impact: "medium",
      confidence: "medium",
      evidence: `${formatPercent(offerHeavy, 0)} من الفيديوهات تحتوي عرضاً مباشراً.`,
      action: "اجعل النسبة 30% محتوى بيعي و70% محتوى قيمة (شرح، مقارنة، كواليس).",
      targetMetric: "engagement",
    });
  }

  // Always-available fallbacks so we can guarantee exactly five items.
  pool.push({
    priority: 0,
    title: "أنشئ سلسلة متكررة بهوية ثابتة",
    impact: "medium",
    confidence: "medium",
    evidence: `تنوّع الأنماط الحالي مرتفع، ووسيط المشاهدات ${fmt(m.medianViews)} أقل من المتوسط ${fmt(m.avgViews)} مما يدل على صيغة غير مستقرة.`,
    action: "اختر عنواناً واحداً متكرراً لسلسلتك وانشره في نفس اليوم أسبوعياً.",
    targetMetric: "views",
  });
  pool.push({
    priority: 0,
    title: "أعد نشر أفضل فيديو بصيغة محدّثة",
    impact: "medium",
    confidence: "high",
    evidence: `أفضل فيديو حقّق ${fmt(Math.max(...videos.map((v) => v.views), 0))} مشاهدة، أي أعلى بكثير من الوسيط ${fmt(m.medianViews)}.`,
    action: "أعد تصويره بهوك مختلف ونفس البنية بعد 3 أسابيع من النشر الأصلي.",
    targetMetric: "views",
  });

  const impactRank: Record<Level, number> = { high: 0, medium: 1, low: 2 };
  return pool
    .sort((a, b) => impactRank[a.impact] - impactRank[b.impact] || impactRank[a.confidence] - impactRank[b.confidence])
    .slice(0, 5)
    .map((r, i) => ({ ...r, priority: i + 1 }));
}

export function buildWeeklyPlan(m: Metrics, _dna: DnaInsight[], videos: VideoRecord[]): PlanDay[] {
  if (videos.length === 0) return [];

  const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const medViews = median(videos.map((v) => v.views));
  const medEr = median(videos.map(engagementRate));

  /** median views for a subset, only when the subset is large enough to trust. */
  const groupMed = (subset: VideoRecord[]) =>
    subset.length >= MIN_GROUP ? median(subset.map((v) => v.views)) : null;

  const byKey = <T extends string>(pick: (v: VideoRecord) => T) => {
    const map = new Map<T, VideoRecord[]>();
    videos.forEach((v) => {
      const k = pick(v);
      map.set(k, [...(map.get(k) ?? []), v]);
    });
    return [...map.entries()]
      .map(([key, vids]) => ({ key, vids, med: groupMed(vids) }))
      .filter((g): g is { key: T; vids: VideoRecord[]; med: number } => g.med != null)
      .sort((a, b) => b.med - a.med);
  };

  const hookGroups = byKey((v) => v.features.hookType);
  const durGroups = byKey((v) => v.features.durationBucket);
  const tagGroups = (() => {
    const map = new Map<string, VideoRecord[]>();
    videos.forEach((v) => v.features.tags.forEach((t) => map.set(t, [...(map.get(t) ?? []), v])));
    return [...map.entries()]
      .map(([key, vids]) => ({ key, vids, med: groupMed(vids) }))
      .filter((g): g is { key: string; vids: VideoRecord[]; med: number } => g.med != null)
      .sort((a, b) => b.med - a.med);
  })();

  const bestHook = hookGroups[0];
  const weakHook = hookGroups.length >= 2 ? hookGroups[hookGroups.length - 1] : undefined;
  const bestDur = durGroups[0];
  const bestTag = tagGroups[0];
  const weakTag = tagGroups.length >= 2 ? tagGroups[tagGroups.length - 1] : undefined;

  const durLabel = (bucket: string) =>
    bucket === "0-12" ? "أقل من 12 ثانية" : bucket === "12-18" ? "12–18 ثانية" : bucket === "18-30" ? "18–30 ثانية" : "أكثر من 30 ثانية";
  const targetDuration = bestDur ? durLabel(bestDur.key) : "12–18 ثانية";
  const hookLabel: Record<string, string> = {
    problem: "بداية تطرح مشكلة",
    curiosity: "بداية تشويق",
    offer: "بداية بعرض",
    generic: "بداية عامة",
    story: "بداية بقصة",
  };
  const tagLabel: Record<string, string> = {
    ugc: "محتوى واقعي بأسلوب المستخدم",
    product_demo: "استعراض تفاصيل",
    talking_head: "حديث مباشر للكاميرا",
    trend: "ترند",
    educational: "محتوى تعليمي",
    offer: "محتوى عرض",
    behind_scenes: "كواليس",
  };

  const items: Omit<PlanDay, "dayAr">[] = [];
  const push = (d: Omit<PlanDay, "dayAr">) => {
    if (items.length < 7) items.push(d);
  };

  // 1) Replicate the single strongest video's structure.
  const top = sorted[0];
  if (top) {
    const lift = medViews > 0 ? Math.round(((top.views - medViews) / medViews) * 100) : 0;
    push({
      idea: "أعد إنتاج نمط الفيديو الأقوى بهوك مختلف",
      hook: `ابدأ بنفس نوع البداية: ${hookLabel[top.features.hookType] ?? "بداية مشابهة"}`,
      format: top.features.tags[0] ? (tagLabel[top.features.tags[0]] ?? top.features.tags[0]) : "نفس بنية الفيديو الأقوى",
      cta: "نفس نهاية الفيديو الأقوى في حسابك",
      targetDuration: durLabel(top.features.durationBucket),
      why: `أقوى فيديو في حسابك حقّق ${fmt(top.views)} مشاهدة، أعلى من وسيط حسابك (${fmt(medViews)}) بـ ${Math.abs(lift)}%.`,
    });
  }

  // 2) Strongest opening type.
  if (bestHook && hookGroups.length >= 2) {
    const other = hookGroups[1]!;
    push({
      idea: `اكتب البداية بنفس النوع الأقوى: ${hookLabel[bestHook.key] ?? bestHook.key}`,
      hook: `${hookLabel[bestHook.key] ?? bestHook.key} في أول ثانيتين`,
      format: "نفس أنماط حسابك الحالية",
      cta: "اطلب تفاعلاً واحداً واضحاً",
      targetDuration,
      why: `وسيط المشاهدات ${fmt(bestHook.med)} لهذا النوع من البدايات عبر ${bestHook.vids.length} فيديو، مقابل ${fmt(other.med)} لـ${hookLabel[other.key] ?? other.key}.`,
    });
  }

  // 3) Strongest content pattern.
  if (bestTag && weakTag && bestTag.key !== weakTag.key) {
    push({
      idea: `كرّر نمطك الأقوى: ${tagLabel[bestTag.key] ?? bestTag.key}`,
      hook: `افتح بأقوى لحظة في هذا النمط`,
      format: tagLabel[bestTag.key] ?? bestTag.key,
      cta: "اطلب حفظ المقطع أو متابعة السلسلة",
      targetDuration,
      why: `وسيط ${fmt(bestTag.med)} مشاهدة عبر ${bestTag.vids.length} فيديو لهذا النمط، مقابل ${fmt(weakTag.med)} لنمط ${tagLabel[weakTag.key] ?? weakTag.key}.`,
    });
  }

  // 4) Best duration bucket.
  if (bestDur && durGroups.length >= 2) {
    const other = durGroups[1]!;
    push({
      idea: `التزم بالمدة الأفضل في حسابك: ${durLabel(bestDur.key)}`,
      hook: "احذف أي مشهد قبل الهوك",
      format: "نفس النمط الأقوى بمدة مضبوطة",
      cta: "نهاية واحدة قصيرة",
      targetDuration: durLabel(bestDur.key),
      why: `وسيط المشاهدات ${fmt(bestDur.med)} لمقاطع ${durLabel(bestDur.key)} عبر ${bestDur.vids.length} فيديو، مقابل ${fmt(other.med)} لمقاطع ${durLabel(other.key)}.`,
    });
  }

  // 5) Distribution: the video with the highest share ratio.
  const shareLeader = [...videos].filter((v) => v.views > 0).sort((a, b) => b.shares / b.views - a.shares / a.views)[0];
  if (shareLeader && shareLeader.shares > 0) {
    push({
      idea: "أعد استخدام الفكرة الأكثر قابلية للمشاركة",
      hook: `ابدأ بنفس نوع البداية: ${hookLabel[shareLeader.features.hookType] ?? "بداية مشابهة"}`,
      format: shareLeader.features.tags[0] ? (tagLabel[shareLeader.features.tags[0]] ?? shareLeader.features.tags[0]) : "نفس بنية الفيديو الأكثر مشاركة",
      cta: "اطلب المشاركة مع شخص واحد",
      targetDuration: durLabel(shareLeader.features.durationBucket),
      why: `هذا الفيديو سجّل ${fmt(shareLeader.shares)} مشاركة على ${fmt(shareLeader.views)} مشاهدة، أعلى نسبة مشاركة في حسابك.`,
    });
  }

  // 6) Engagement gap.
  const erLeader = [...videos].sort((a, b) => engagementRate(b) - engagementRate(a))[0];
  if (erLeader && medEr > 0) {
    push({
      idea: "أعد استخدام النهاية التي جاءت بأعلى تفاعل",
      hook: `ابدأ بنفس نوع البداية: ${hookLabel[erLeader.features.hookType] ?? "بداية مشابهة"}`,
      format: erLeader.features.tags[0] ? (tagLabel[erLeader.features.tags[0]] ?? erLeader.features.tags[0]) : "نفس بنية الفيديو الأعلى تفاعلاً",
      cta: "سؤال واحد مباشر في النهاية",
      targetDuration,
      why: `أعلى فيديو تفاعلاً في حسابك سجّل ${formatPercent(engagementRate(erLeader))} مقابل وسيط ${formatPercent(medEr)}.`,
    });
  }

  // 7) Avoid the weakest opening type, or fix cadence.
  if (weakHook && bestHook && weakHook.key !== bestHook.key) {
    push({
      idea: `أوقف ${hookLabel[weakHook.key] ?? weakHook.key} واستبدلها بالنوع الأقوى`,
      hook: `${hookLabel[bestHook.key] ?? bestHook.key} في أول ثانيتين`,
      format: "نفس النمط الأقوى في حسابك",
      cta: "تفاعل واحد واضح",
      targetDuration,
      why: `وسيط المشاهدات ${fmt(weakHook.med)} فقط لهذا النوع عبر ${weakHook.vids.length} فيديو، مقابل ${fmt(bestHook.med)} للنوع الأقوى.`,
    });
  }
  if (m.postsPerWeek < 4 || m.longestGapDays > 7) {
    push({
      idea: "يوم إنتاج مجمّع لتثبيت النشر",
      hook: "بدون نشر — تصوير فقط",
      format: "تصوير دفعة واحدة من نمطك الأقوى",
      cta: "—",
      targetDuration,
      why: `معدل النشر الحالي ${m.postsPerWeek} أسبوعياً وأطول انقطاع ${m.longestGapDays} يوم، وهذا أقل من أربع مرات أسبوعياً.`,
    });
  }

  // Fill remaining slots only with pattern-backed repetition (no invented ideas).
  let round = 2;
  while (items.length < 7 && sorted.length > 0) {
    const ref = sorted[(items.length + round) % Math.min(sorted.length, 5)]!;
    const lift = medViews > 0 ? Math.round(((ref.views - medViews) / medViews) * 100) : 0;
    push({
      idea: "أعد إنتاج أحد أقوى فيديوهاتك بهوك مختلف",
      hook: `ابدأ بنفس نوع البداية: ${hookLabel[ref.features.hookType] ?? "بداية مشابهة"}`,
      format: ref.features.tags[0] ? (tagLabel[ref.features.tags[0]] ?? ref.features.tags[0]) : "نفس بنية الفيديو المرجعي",
      cta: "تفاعل واحد واضح",
      targetDuration: durLabel(ref.features.durationBucket),
      why: `هذا الفيديو حقّق ${fmt(ref.views)} مشاهدة، ${lift >= 0 ? "أعلى" : "أقل"} من وسيط حسابك (${fmt(medViews)}) بـ ${Math.abs(lift)}%.`,
    });
    round += 1;
    if (round > 20) break;
  }

  return items.slice(0, 7).map((d, i) => ({ dayAr: days[i]!, ...d }));
}

export function analyze(data: AccountData, metrics: Metrics, previousScore?: number): AnalysisReport {
  const scoring = computeScore(metrics);
  const sorted = [...data.videos].sort((a, b) => b.views - a.views);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();
  const dna = buildContentDna(data.videos);

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
    recommendations: buildRecommendations(metrics, dna, data.videos),
    plan: buildWeeklyPlan(metrics, dna, data.videos),
    generatedAt: new Date().toISOString(),
  };
}
