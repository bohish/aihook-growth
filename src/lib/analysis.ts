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

/*
 * Captions are useful account signals, but they are not titles.  TikTok captions
 * commonly contain discovery hashtags, duplicated words and OCR-like fragments.
 * Keep this deterministic and local: the report must not spend another model call
 * just to turn "#اكسبلورexplore #FC26" into a subject.
 */
const NOISE_TAGS = new Set([
  "اكسبلور",
  "explore",
  "fyp",
  "foryou",
  "viral",
  "ترند",
  "trend",
  "tiktok",
  "تيك توك",
  "اكسبلورر",
  "اكسبلوررر",
  "foryoupage",
  "xyzbca",
]);
const META_WORDS = new Set([
  "الجزء",
  "جزء",
  "الاول",
  "الأول",
  "الثاني",
  "ثاني",
  "جديد",
  "فيديو",
  "مقطع",
  "انحذف",
  "رجع",
]);

function normaliseCaption(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[ـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanToken(value: string): string {
  return normaliseCaption(value)
    .replace(/^#+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s+]/gu, "")
    .replace(/(.)\1{2,}/gu, "$1$1")
    .trim();
}

function usefulToken(value: string): boolean {
  const token = cleanToken(value);
  const compact = token.replace(/\s/g, "").toLowerCase();
  return (
    Boolean(token) &&
    token.length > 1 &&
    !NOISE_TAGS.has(compact) &&
    !META_WORDS.has(token.toLowerCase())
  );
}

/** A short, readable subject built from meaningful caption text and tags. */
export function subjectFromCaption(caption: string): string | null {
  const text = normaliseCaption(caption);
  if (!text) return null;
  const tags = [...text.matchAll(/#([^#\n]+)/g)]
    .map((m) => cleanToken(m[1] ?? ""))
    .filter(usefulToken);
  const body = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/@[\p{L}\p{N}_.]+/gu, "")
    .replace(/#[^#\n]+/g, " ")
    .replace(/[^\p{L}\p{N}\s+]/gu, " ")
    .split(/\n|[.!؟?،]/)[0]!
    .split(/\s+/)
    .filter(usefulToken)
    .slice(0, 6)
    .join(" ");
  const fc =
    tags.find((tag) => /^fc\s?2[456]$/i.test(tag)) ??
    /(?:\bfc\s?2[456]\b)/i.exec(text)?.[0]?.toUpperCase();
  const career = [...tags, body].find((part) => /مسيره لاعب|مسيرة لاعب/i.test(part));
  if (career && fc) return `مسيرة لاعب في ${fc.replace(/\s/g, "")}`;
  const candidate =
    tags.find((tag) => tag.split(" ").filter(usefulToken).length >= 2) ?? body ?? tags[0];
  if (!candidate) return fc ? fc.replace(/\s/g, "") : null;
  const clean = candidate.split(" ").filter(usefulToken).slice(0, 6).join(" ");
  return clean || null;
}

function accountSubjects(videos: VideoRecord[]): string[] {
  const score = new Map<string, number>();
  for (const video of videos) {
    const subject = subjectFromCaption(video.caption);
    if (!subject) continue;
    const key = subject.toLowerCase();
    // Performance breaks ties without allowing one viral post to erase the account's theme.
    score.set(
      key,
      (score.get(key) ?? 0) +
        1 +
        Math.min(2, video.views / Math.max(1, median(videos.map((v) => v.views)))),
    );
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject)
    .filter(
      (subject, index, all) =>
        !all.some((other, i) => i < index && (other.includes(subject) || subject.includes(other))),
    )
    .slice(0, 3);
}

function isGaming(subjects: string[], videos: VideoRecord[]): boolean {
  return /\bfc\s?2[456]\b|فيفا|كرة|لاعب|كاريير|مسيرة/i.test(
    `${subjects.join(" ")} ${videos.map((v) => v.caption).join(" ")}`,
  );
}

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
      if (v.features.durationBucket === "12-18") bits.push("المدة قصيرة بما يكفي لإكمال المشاهدة");
      if (v.shares > v.comments) bits.push("نسبة المشاركات مرتفعة، وهي أقوى إشارة توزيع");
    } else {
      if (v.features.hookType === "generic") bits.push("المقدمة عامة ولا تعطي سبباً للبقاء");
      if (v.durationSeconds > 30) bits.push("المدة طويلة نسبياً لنمط حسابك");
      if (v.features.hasOffer && er < medEr) bits.push("الرسالة بيعية مباشرة بدون قيمة قبل العرض");
    }

    out[v.id] = `${bits.join("، ")}.`;
  });

  return out;
}

export function buildRecommendations(
  m: Metrics,
  dna: DnaInsight[],
  videos: VideoRecord[],
): Recommendation[] {
  const pool: Recommendation[] = [];
  const dnaText = (needle: string) => dna.find((d) => d.title.includes(needle));

  if (m.viralDependency > 0.45) {
    pool.push({
      priority: 0,
      title: "قلّل اعتماد الحساب على فيديو واحد ناجح",
      impact: "high",
      confidence: m.totalVideos >= 10 ? "high" : "medium",
      evidence: `${formatPercent(m.viralDependency, 0)} من إجمالي المشاهدات تأتي من أقوى 3 فيديوهات فقط.`,
      action:
        "أعد إنتاج نفس صيغة الفيديو الأقوى بثلاث زوايا مختلفة خلال أسبوعين، وقِس الوسيط لا الذروة.",
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
      action:
        "صوّر دفعة واحدة (batch) 8 مقاطع، وانشر بأيام ثابتة: السبت، الاثنين، الأربعاء، الخميس.",
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
    .sort(
      (a, b) =>
        impactRank[a.impact] - impactRank[b.impact] ||
        impactRank[a.confidence] - impactRank[b.confidence],
    )
    .slice(0, 5)
    .map((r, i) => ({ ...r, priority: i + 1 }));
}

export function buildWeeklyPlan(m: Metrics, dna: DnaInsight[], videos: VideoRecord[]): PlanDay[] {
  const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const best = [...videos].sort((a, b) => b.views - a.views)[0];
  const shortWins = (dna.find((d) => d.title.includes("12–18"))?.liftPct ?? 0) > 0;
  const duration = shortWins ? "12–18 ثانية" : "18–25 ثانية";
  const subjects = accountSubjects(videos);
  const primary = subjects[0] ?? "الفكرة الأقوى في أحدث فيديوهاتك";
  const secondary = subjects[1] ?? primary;
  const gaming = isGaming(subjects, videos);
  const bestSubject = subjectFromCaption(best?.caption ?? "") ?? primary;
  const game =
    /fc\s?2[456]/i.exec(`${primary} ${secondary}`)?.[0]?.toUpperCase().replace(/\s/g, "") ?? "FC26";

  const base: Omit<PlanDay, "dayAr">[] = gaming
    ? [
        {
          idea: `${primary}: مقارنة قرارين داخل ${game}`,
          hook: `«في ${game}: هذا القرار يغيّر مسيرة اللاعب من أول موسم»`,
          format: "لقطتان متقابلتان + نتيجة كل خيار",
          cta: "أي خيار ستختار؟ اكتب A أو B",
          targetDuration: duration,
          why: "زاوية المقارنة تخدم محتوى اللعب لأنها تعطي المشاهد قراراً واضحاً ليعلّق عليه.",
        },
        {
          idea: `${primary}: تحدي موسم واحد`,
          hook: `«هل أقدر أنقذ هذا اللاعب في موسم واحد في ${game}؟»`,
          format: "هدف التحدي ثم 3 لقطات تقدم",
          cta: "اختر التحدي التالي للمسيرة",
          targetDuration: duration,
          why: "التحدي يخلق نهاية مفتوحة ويحوّل نفس سلسلة المسيرة إلى حلقة قابلة للمتابعة.",
        },
        {
          idea: `ترتيب خيارات ${game} المرتبطة بـ${secondary}`,
          hook: `«ترتيبي الصريح في ${game}… وهذا الخيار لا أنصح فيه»`,
          format: "ترتيب من 3 مراتب + لقطة دليل",
          cta: "وش ترتيبك؟",
          targetDuration: duration,
          why: "الرأي والتصنيف مناسبان عندما يكون الموضوع فيه خيارات متنافسة، ويشجعان الردود بدون تكرار نفس الهوك.",
        },
        {
          idea: `خطأ شائع في ${primary}`,
          hook: `«لا تبدأ مسيرة اللاعب في ${game} بهذا الخطأ»`,
          format: "الخطأ أولاً ثم التصحيح داخل اللعبة",
          cta: "احفظه قبل بدايتك القادمة",
          targetDuration: duration,
          why: "زاوية الخطأ تستخدم المشكلة فقط حين يوجد تصرف واضح يمكن إثباته في الفيديو.",
        },
        {
          idea: `اختبار حقيقي لـ${secondary}`,
          hook: `«اختبرت هذه الخطة في ${game}… والنتيجة ما توقعتها»`,
          format: "فرضية قصيرة + تجربة + النتيجة",
          cta: "تبغون اختباراً ثانياً؟",
          targetDuration: duration,
          why: "التجربة تضيف دليلاً للمحتوى بدلاً من وعد عام أو وصف مكرر.",
        },
        {
          idea: `قصة قرار غيّر ${primary}`,
          hook: `«قرار واحد قلب مسيرة هذا اللاعب في ${game}»`,
          format: "الموقف ثم النتيجة في تسلسل سريع",
          cta: "أكمل القصة في الجزء الجاي؟",
          targetDuration: duration,
          why: "القصة تناسب المسيرة لأنها تربط اللقطات بسياق، لا لأنها مجرد صيغة جاهزة.",
        },
        {
          idea: `كشف مفاجأة من ${bestSubject}`,
          hook: `«رجعت لأقوى لحظة في ${game}… واكتشفت تفصيلة ما انتبهت لها»`,
          format: "إعادة اللقطة الأقوى + كشف التفصيلة",
          cta: "شفتها من أول مرة؟",
          targetDuration: duration,
          why: `يبني على موضوع أفضل فيديو (${fmt(best?.views ?? 0)} مشاهدة) بهوك جديد، بدلاً من إعادة النص نفسه.`,
        },
      ]
    : [
        {
          idea: `${primary}: مقارنة خيارين`,
          hook: `«بين هذين الخيارين في ${primary}… الفرق الذي يهم فعلاً هو هذا»`,
          format: "مقارنة مباشرة + دليل واحد",
          cta: "أي خيار تختار؟",
          targetDuration: duration,
          why: "زاوية المقارنة تستخدم عندما يتيح الموضوع خيارين واضحين.",
        },
        {
          idea: `${primary}: تحدٍ قابل للقياس`,
          hook: `«جربت ${primary} بطريقة مختلفة اليوم… وهذه النتيجة»`,
          format: "وعد التحدي + النتيجة",
          cta: "اقترح تحدي الغد",
          targetDuration: duration,
          why: "يبقي الفكرة نفسها جديدة من خلال تجربة محددة، لا تغيير الموضوع عشوائياً.",
        },
        {
          idea: `رأي وترتيب حول ${secondary}`,
          hook: `«رأيي الصريح في ${secondary}: هذا يستحق التجربة وهذا لا»`,
          format: "3 نقاط مرتبة + سبب مختصر",
          cta: "تتفق أو تختلف؟",
          targetDuration: duration,
          why: "الرأي مناسب فقط للموضوعات التي يمكن المفاضلة فيها.",
        },
        {
          idea: `خطأ شائع في ${primary}`,
          hook: `«إذا تسوي هذا في ${primary}، فأنت تضيع النتيجة من البداية»`,
          format: "الخطأ ثم بديله",
          cta: "احفظ المقطع وارجع له",
          targetDuration: duration,
          why: "يحوّل الفائدة إلى خطوة عملية ويعطي المشاهد سبباً واضحاً للاستمرار.",
        },
        {
          idea: `تجربة أو اختبار لـ${secondary}`,
          hook: `«اختبرت ${secondary} بنفسي… وهذه النتيجة بدون تجميل»`,
          format: "فرضية + اختبار + نتيجة",
          cta: "وش نختبر بعده؟",
          targetDuration: duration,
          why: "التجربة تمنح الفيديو دليلاً بدلاً من تعميمات في الكابتشن.",
        },
        {
          idea: `قصة قصيرة من ${primary}`,
          hook: `«هذا الموقف هو الذي غيّر رأيي في ${primary}»`,
          format: "موقف واحد + التحول",
          cta: "مرّ عليك شيء مشابه؟",
          targetDuration: duration,
          why: "نستخدم القصة لأن الموضوع يحمل موقفاً أو تحولاً قابلاً للحكي.",
        },
        {
          idea: `كشف جديد مبني على ${bestSubject}`,
          hook: `«رجعت لـ${bestSubject} واكتشفت تفصيلة ما كانت واضحة من أول مرة»`,
          format: "إعادة لحظة قوية + كشف",
          cta: "لاحظتها من البداية؟",
          targetDuration: duration,
          why: `يعيد اختبار موضوع أفضل فيديو (${fmt(best?.views ?? 0)} مشاهدة) بزاوية جديدة، من دون نسخ الكابتشن.`,
        },
      ];

  return base.map((d, i) => ({ dayAr: days[i]!, ...d }));
}

export function analyze(
  data: AccountData,
  metrics: Metrics,
  previousScore?: number,
): AnalysisReport {
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
