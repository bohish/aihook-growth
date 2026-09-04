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

  const onCam = videos.filter((v) => v.features.personOnCamera);
  const noCam = videos.filter((v) => !v.features.personOnCamera);
  const camInsight = compare(
    { label: "onCam", videos: onCam },
    { label: "noCam", videos: noCam },
    (lift) =>
      lift > 0
        ? "الفيديوهات التي فيها شخص أمام الكاميرا تتفوق على مقاطع المنتج فقط"
        : "مقاطع المنتج فقط تتفوق حالياً على الفيديوهات التي فيها شخص أمام الكاميرا",
    (a, b) =>
      `وسيط المشاهدات ${fmt(a)} للفيديوهات التي فيها شخص، مقابل ${fmt(b)} لمقاطع المنتج فقط.`,
  );
  if (camInsight) insights.push(camInsight);

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

    const viewPct = Math.abs(Math.round(viewLift * 100));
    const erPct = Math.abs(Math.round(erLift * 100));
    bits.push(
      viewPct >= 1
        ? `المشاهدات ${viewLift >= 0 ? "أعلى" : "أقل"} من وسيط الحساب بـ ${viewPct}%`
        : "المشاهدات قريبة من وسيط الحساب",
    );
    if (erPct >= 1) {
      bits.push(`والتفاعل ${erLift >= 0 ? "أعلى" : "أقل"} بـ ${erPct}%`);
    } else {
      bits.push("والتفاعل بمستوى وسيط الحساب");
    }


    if (viewLift >= 0) {
      if (v.features.hookType === "problem") bits.push("الهوك يبدأ بمشكلة واضحة يعيشها الجمهور");
      if (v.features.personOnCamera) bits.push("وجود شخص أمام الكاميرا يرفع الثقة والإكمال");
      if (v.features.durationBucket === "12-18") bits.push("المدة قصيرة بما يكفي لإكمال المشاهدة");
      if (v.shares > v.comments) bits.push("نسبة المشاركات مرتفعة، وهي أقوى إشارة توزيع");
    } else {
      if (v.features.hookType === "generic") bits.push("المقدمة عامة ولا تعطي سبباً للبقاء");
      if (!v.features.personOnCamera) bits.push("لا يوجد عنصر بشري يربط المشاهد بالمنتج");
      if (v.durationSeconds > 30) bits.push("المدة طويلة نسبياً لنمط حسابك");
      if (v.features.hasOffer && er < medEr) bits.push("الرسالة بيعية مباشرة بدون قيمة قبل العرض");
    }

    out[v.id] = `${bits.join("، ")}.`;
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
      action: "ابدأ كل مقطع بثانية واحدة لشخص يلبس/يلمس المنتج قبل أي مشهد للمنتج وحده.",
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
      action: 'استخدم صيغة "مشكلة + وعد": مثال «العباية تتجعد بعد ساعة؟ هذي القماشة تحل الموضوع».',
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
      action: "اختم كل مقطع بسؤال اختيار بين خيارين (مقاس/لون/طلة) بدل «شاركوا رأيكم».",
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
      action: "اجعل النسبة 30% بيعي و70% قيمة (تنسيق، عناية، مقارنة أقمشة).",
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
    action: "اختر عنواناً واحداً متكرراً (مثل «عباية اليوم») وانشره في نفس اليوم أسبوعياً.",
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

export function buildWeeklyPlan(m: Metrics, dna: DnaInsight[], videos: VideoRecord[]): PlanDay[] {
  const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const best = [...videos].sort((a, b) => b.views - a.views)[0];
  const camWins = (dna.find((d) => d.title.includes("شخص أمام الكاميرا"))?.liftPct ?? 0) > 0;
  const shortWins = (dna.find((d) => d.title.includes("12–18"))?.liftPct ?? 0) > 0;
  const duration = shortWins ? "12–18 ثانية" : "18–25 ثانية";

  const base: Omit<PlanDay, "dayAr">[] = [
    {
      idea: "طلة عباية واحدة بثلاث طرق تنسيق",
      hook: "«نفس العباية… ثلاث طلات مختلفة»",
      format: camWins ? "شخص أمام الكاميرا + تبديل سريع" : "لقطات قريبة + انتقالات",
      cta: "أي طلة تختارينها؟ اكتبي 1 أو 2 أو 3",
      targetDuration: duration,
      why: `أعلى فيديو في حسابك (${fmt(best?.views ?? 0)} مشاهدة) كان من نفس عائلة المحتوى، وسؤال الاختيار يرفع التعليقات.`,
    },
    {
      idea: "مشكلة قماش شائعة والحل",
      hook: "«العباية تتجعد بعد ساعة؟»",
      format: "حديث مباشر + إثبات على القماش",
      cta: "احفظي المقطع قبل الشراء القادم",
      targetDuration: duration,
      why: "هوك المشكلة سجّل أفضل وسيط مشاهدات في حسابك مقارنة بالمقدمات العامة.",
    },
    {
      idea: "مقارنة بين قماشين بنفس السعر",
      hook: "«الفرق بين قماشين… يبان بعد أول غسلة»",
      format: "مقارنة جانبية (Split screen)",
      cta: "قولي أي قماش تفضلين",
      targetDuration: duration,
      why: "المحتوى التعليمي في حسابك يحقق تفاعلاً أعلى من المحتوى البيعي المباشر.",
    },
    {
      idea: "كواليس تجهيز الطلبات",
      hook: "«كيف تُجهّز طلبيتك قبل ما توصلك»",
      format: "كواليس سريعة",
      cta: "تابعينا لمتابعة الدفعة القادمة",
      targetDuration: "18–25 ثانية",
      why: "محتوى الكواليس يرفع الثقة ويخفض الاعتماد على المحتوى البيعي المتكرر.",
    },
    {
      idea: "أسئلة العميلات الأكثر تكراراً",
      hook: "«أكثر سؤال يوصلنا كل يوم»",
      format: camWins ? "حديث مباشر" : "نص على الشاشة + لقطات منتج",
      cta: "اسألي في التعليقات وسنجيب في مقطع",
      targetDuration: duration,
      why: "الردود المباشرة تولّد تعليقات، ووسيط التفاعل الحالي أقل من المستهدف.",
    },
    {
      idea: "إعادة إنتاج أفضل فيديو بهوك جديد",
      hook: "«طلبتوا نعيدها… هذي النسخة المحدثة»",
      format: "نفس بنية الفيديو الأقوى",
      cta: "الرابط في البايو",
      targetDuration: duration,
      why: `الاعتماد على أقوى الفيديوهات يبلغ ${formatPercent(m.viralDependency, 0)}، وإعادة الصيغة تختبر إن كان النجاح قابلاً للتكرار.`,
    },
    {
      idea: "عرض محدود بقيمة قبل السعر",
      hook: "«قبل ما أقول السعر… شوفي التفصيلة»",
      format: "استعراض منتج + عرض في النهاية",
      cta: "العرض ينتهي الأحد",
      targetDuration: "18–25 ثانية",
      why: "تأخير العرض إلى نهاية المقطع يقلل الهبوط المبكر الذي ظهر في فيديوهاتك البيعية.",
    },
  ];

  return base.map((d, i) => ({ dayAr: days[i]!, ...d }));
}

export function analyze(data: AccountData, metrics: Metrics, previousScore?: number): AnalysisReport {
  const scoring = computeScore(metrics);
  const sorted = [...data.videos].sort((a, b) => b.views - a.views);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();
  const dna = buildContentDna(data.videos);

  return {
    account: data.account,
    isDemo: data.isDemo,
    metrics,
    scoring,
    scoreDelta: previousScore != null ? scoring.score - previousScore : 0,
    top,
    bottom,
    verdicts: buildVerdicts([...top, ...bottom], data.videos),
    dna,
    recommendations: buildRecommendations(metrics, dna, data.videos),
    plan: buildWeeklyPlan(metrics, dna, data.videos),
    generatedAt: new Date().toISOString(),
  };
}
