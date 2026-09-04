/**
 * Deterministic demo dataset — a FICTIONAL abaya / e-commerce style account.
 *
 * Numbers are realistic but invented. The username is deliberately marked as a
 * demo handle so it cannot be confused with a real TikTok account, and every
 * surface that renders this data shows the "بيانات تجريبية" badge.
 */
import type { AccountData, ContentTag, HookType, VideoRecord } from "@/lib/types";

/** Tiny seeded PRNG (mulberry32) so the demo is identical on every run. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Blueprint {
  caption: string;
  tags: ContentTag[];
  hookType: HookType;
  personOnCamera: boolean;
  hasOffer: boolean;
  duration: number;
  /** relative strength multiplier applied to the base view level */
  strength: number;
}

const BLUEPRINTS: Blueprint[] = [
  { caption: "العباية تتجعد بعد ساعة؟ جربي هذي القماشة", tags: ["educational", "talking_head"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 15, strength: 2.9 },
  { caption: "نفس العباية… ثلاث طلات مختلفة", tags: ["ugc", "talking_head"], hookType: "curiosity", personOnCamera: true, hasOffer: false, duration: 17, strength: 2.2 },
  { caption: "الفرق بين قماشين بنفس السعر", tags: ["educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 16, strength: 1.9 },
  { caption: "طلة العمل بعباية واحدة", tags: ["ugc"], hookType: "story", personOnCamera: true, hasOffer: false, duration: 14, strength: 1.6 },
  { caption: "تفاصيل الخياطة عن قريب", tags: ["product_demo"], hookType: "generic", personOnCamera: false, hasOffer: false, duration: 22, strength: 0.55 },
  { caption: "وصلتنا الألوان الجديدة", tags: ["product_demo", "offer"], hookType: "offer", personOnCamera: false, hasOffer: true, duration: 19, strength: 0.6 },
  { caption: "كيف نجهز طلبيتك قبل ما توصلك", tags: ["behind_scenes"], hookType: "curiosity", personOnCamera: true, hasOffer: false, duration: 21, strength: 1.3 },
  { caption: "أكثر سؤال يوصلنا كل يوم", tags: ["talking_head", "educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 13, strength: 1.8 },
  { caption: "خصم نهاية الأسبوع على كل الموديلات", tags: ["offer"], hookType: "offer", personOnCamera: false, hasOffer: true, duration: 12, strength: 0.5 },
  { caption: "ترند الطلة السوداء", tags: ["trend", "ugc"], hookType: "curiosity", personOnCamera: true, hasOffer: false, duration: 15, strength: 1.7 },
  { caption: "استعراض موديل الكم الواسع", tags: ["product_demo"], hookType: "generic", personOnCamera: false, hasOffer: false, duration: 26, strength: 0.45 },
  { caption: "ثلاث أخطاء عند شراء العباية", tags: ["educational", "talking_head"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 18, strength: 2.4 },
  { caption: "مقاسات… وكيف تختارين مقاسك", tags: ["educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 17, strength: 1.5 },
  { caption: "لفة الشيلة في 10 ثواني", tags: ["trend", "educational"], hookType: "curiosity", personOnCamera: true, hasOffer: false, duration: 11, strength: 1.4 },
  { caption: "العرض ينتهي الليلة", tags: ["offer"], hookType: "offer", personOnCamera: false, hasOffer: true, duration: 10, strength: 0.4 },
  { caption: "كواليس جلسة التصوير", tags: ["behind_scenes"], hookType: "story", personOnCamera: true, hasOffer: false, duration: 24, strength: 1.0 },
  { caption: "قبل ما أقول السعر… شوفي التفصيلة", tags: ["product_demo", "offer"], hookType: "curiosity", personOnCamera: true, hasOffer: true, duration: 20, strength: 1.2 },
  { caption: "عباية اليوم", tags: ["ugc"], hookType: "generic", personOnCamera: true, hasOffer: false, duration: 13, strength: 1.1 },
  { caption: "لماذا القماش الكوري أغلى", tags: ["educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 16, strength: 1.6 },
  { caption: "طلبيات اليوم", tags: ["behind_scenes"], hookType: "generic", personOnCamera: false, hasOffer: false, duration: 28, strength: 0.35 },
  { caption: "طلة المناسبة بميزانية بسيطة", tags: ["ugc", "educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 18, strength: 2.0 },
  { caption: "استعراض التغليف الجديد", tags: ["product_demo"], hookType: "generic", personOnCamera: false, hasOffer: false, duration: 25, strength: 0.4 },
  { caption: "ردّ على تعليق: هل القماش شفاف؟", tags: ["talking_head", "educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 14, strength: 1.9 },
  { caption: "الموديل الأكثر طلباً هذا الشهر", tags: ["product_demo", "offer"], hookType: "offer", personOnCamera: false, hasOffer: true, duration: 21, strength: 0.65 },
  { caption: "ترند الانتقال بين طلتين", tags: ["trend", "ugc"], hookType: "curiosity", personOnCamera: true, hasOffer: false, duration: 12, strength: 1.75 },
  { caption: "نصيحة العناية بالقماش", tags: ["educational"], hookType: "problem", personOnCamera: true, hasOffer: false, duration: 15, strength: 1.45 },
];

function bucket(seconds: number) {
  if (seconds < 12) return "0-12" as const;
  if (seconds < 18) return "12-18" as const;
  if (seconds <= 30) return "18-30" as const;
  return "30+" as const;
}

export function buildDemoAccount(now = Date.now()): AccountData {
  const rand = rng(20260904);
  const baseViews = 9_400;

  const videos: VideoRecord[] = BLUEPRINTS.map((bp, index) => {
    // Newest first: post roughly every 2.6 days, slight jitter.
    const daysAgo = Math.round(index * 2.6 + rand() * 1.2);
    const publishedAt = new Date(now - daysAgo * 86_400_000).toISOString();

    // Slight downward drift for older videos so the 30-day trend is meaningful.
    const recencyBoost = 1 + (26 - index) * 0.012;
    const noise = 0.85 + rand() * 0.3;
    const views = Math.round(baseViews * bp.strength * recencyBoost * noise);

    // Engagement scales with content type, not randomly.
    const erBase = bp.hasOffer ? 0.036 : bp.personOnCamera ? 0.082 : 0.05;
    const er = erBase * (0.9 + rand() * 0.25);
    const totalEngagement = Math.round(views * er);
    const likes = Math.round(totalEngagement * 0.78);
    const comments = Math.round(totalEngagement * 0.13);
    const shares = totalEngagement - likes - comments;

    return {
      id: `demo-${index + 1}`,
      caption: bp.caption,
      publishedAt,
      durationSeconds: bp.duration,
      thumbnailSeed: index,
      shareUrl: null,
      views,
      likes,
      comments,
      shares: Math.max(shares, 0),
      features: {
        tags: bp.tags,
        hookType: bp.hookType,
        personOnCamera: Boolean(bp.personOnCamera),
        hasOffer: bp.hasOffer,
        durationBucket: bucket(bp.duration),
      },
    };
  });

  const likesTotal = videos.reduce((a, v) => a + v.likes, 0);

  return {
    isDemo: true,
    demoLabel: "بيانات تجريبية",
    account: {
      username: "demo.abaya.studio (تجريبي)",
      displayName: "استوديو العباية — حساب تجريبي",
      bio: "متجر عبايات تجريبي لعرض تجربة التحليل. ليس حساباً حقيقياً على TikTok.",
      followerCount: 18_400,
      followingCount: 62,
      likesCount: likesTotal,
      videoCount: videos.length,
      isDemo: true,
    },
    videos,
  };
}
