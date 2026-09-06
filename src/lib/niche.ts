/**
 * Account context inference: what is this account actually about?
 *
 * Reads ONLY real signals: video captions and (when already stored) hook
 * analysis text. Nothing is invented — when the evidence is thin the niche
 * stays "unknown" and the callers must fall back to confirmed patterns only.
 */
import type { VideoRecord } from "./types";

export interface StoredHookAnalysis {
  videoId: string;
  hookType: string | null;
  hookSummary: string | null;
  spokenText: string | null;
  replicateThis: string | null;
  hookScore: number | null;
}

export type NicheKey =
  | "gaming"
  | "cooking"
  | "shop"
  | "fitness"
  | "education"
  | "beauty"
  | "travel"
  | "tech"
  | "unknown";

export interface AccountContext {
  niche: NicheKey;
  nicheLabel: string;
  /** Recurring words/entities in captions, strongest first (by views). */
  topics: string[];
  /** Latin/alphanumeric names such as FC26, PS5, iPhone — as written. */
  entities: string[];
  /** Short readable topic of the best performing video, or null. */
  topTopic: string | null;
  /** Strongest stored hook type in Arabic, when hook analyses exist. */
  bestStoredHookType: string | null;
  /** True when we have enough repeated evidence to name a subject. */
  hasSubjectEvidence: boolean;
}

const NICHE_WORDS: Record<Exclude<NicheKey, "unknown">, { label: string; words: string[] }> = {
  gaming: {
    label: "قيمنق",
    words: ["لعبة", "قيمنق", "جيمنق", "بلايستيشن", "اكس بوكس", "فورت", "ببجي", "فيفا", "دوري", "لاعب", "gaming", "gameplay", "fc2", "fifa", "pubg", "fortnite", "valorant", "cod", "ps5", "xbox", "rank"],
  },
  cooking: {
    label: "طبخ وأكل",
    words: ["طبخ", "وصفة", "وصفات", "أكل", "اكل", "مطبخ", "حلى", "عجينة", "قهوة", "مطعم", "فطور", "غداء", "عشاء", "recipe", "cooking", "food"],
  },
  shop: {
    label: "متجر ومنتجات",
    words: ["متجر", "منتج", "طلبية", "توصيل", "شحن", "سعر", "خصم", "كوبون", "متوفر", "الكمية", "shop", "store", "order", "product"],
  },
  fitness: {
    label: "رياضة ولياقة",
    words: ["تمرين", "جيم", "نادي", "عضلات", "كارديو", "دهون", "وزن", "بروتين", "workout", "gym", "fitness"],
  },
  education: {
    label: "تعليم وشرح",
    words: ["شرح", "درس", "تعلم", "دورة", "خطوات", "طريقة", "مذاكرة", "امتحان", "lesson", "tutorial", "course"],
  },
  beauty: {
    label: "جمال وعناية",
    words: ["مكياج", "بشرة", "شعر", "روتين", "عناية", "كريم", "عطر", "skincare", "makeup", "hair"],
  },
  travel: {
    label: "سفر ورحلات",
    words: ["سفر", "رحلة", "مطار", "فندق", "وجهة", "جولة", "travel", "trip", "hotel"],
  },
  tech: {
    label: "تقنية",
    words: ["جوال", "لابتوب", "تطبيق", "برنامج", "ذكاء اصطناعي", "كمبيوتر", "iphone", "android", "app", "ai", "tech"],
  },
};

const STOP = new Set([
  "في","من","على","عن","مع","إلى","الى","هذا","هذه","ذلك","التي","الذي","كل","بعد","قبل","بين","أو","او","ثم","لكن","حتى","كان","كانت","يكون","ما","لا","نعم","انا","أنا","احنا","نحن","هو","هي","لك","لكم","الي","اللي","عشان","لان","لأن","كيف","ليش","وش","شنو","يا","بس","جدا","جداً","اكثر","أكثر","افضل","أفضل","the","and","for","you","your","with","this","that","from","have","are","was","new","how","why","what","not","all","one","out","get","its","but","can","video","tiktok","fyp","foryou","explore","viral","trend",
]);

const clean = (s: string) =>
  s
    .replace(/[#@](\S+)/g, " $1 ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Short human topic line from a caption, without hashtags or emoji. */
export function shortTopic(caption: string, maxWords = 6): string | null {
  const words = clean(caption).split(" ").filter(Boolean);
  if (words.length === 0) return null;
  return words.slice(0, maxWords).join(" ");
}

export function buildAccountContext(
  videos: VideoRecord[],
  analyses: StoredHookAnalysis[] = [],
): AccountContext {
  const byId = new Map(analyses.map((a) => [a.videoId, a]));

  const textFor = (v: VideoRecord) => {
    const a = byId.get(v.id);
    return [v.caption, a?.hookSummary ?? "", a?.spokenText ?? "", a?.replicateThis ?? ""].join(" ");
  };

  const allText = videos.map(textFor).join(" ").toLowerCase();

  // niche by keyword hits
  let niche: NicheKey = "unknown";
  let bestHits = 0;
  (Object.keys(NICHE_WORDS) as Exclude<NicheKey, "unknown">[]).forEach((key) => {
    const hits = NICHE_WORDS[key].words.filter((w) => allText.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      niche = key;
    }
  });
  const detected = niche;
  if (bestHits < 2) niche = "unknown";

  // recurring words weighted by views
  const weight = new Map<string, { n: number; views: number; raw: string }>();
  videos.forEach((v) => {
    const seen = new Set<string>();
    clean(textFor(v))
      .split(" ")
      .forEach((raw) => {
        const w = raw.toLowerCase();
        if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) return;
        if (seen.has(w)) return;
        seen.add(w);
        const prev = weight.get(w) ?? { n: 0, views: 0, raw };
        weight.set(w, { n: prev.n + 1, views: prev.views + v.views, raw: prev.raw });
      });
  });

  const repeated = [...weight.entries()]
    .filter(([, s]) => s.n >= 2)
    .sort((a, b) => b[1].views - a[1].views);

  const topics = repeated.slice(0, 6).map(([, s]) => s.raw);
  const entities = repeated
    .filter(([w]) => /[a-z]/.test(w) && (/\d/.test(w) || w.length >= 4))
    .slice(0, 4)
    .map(([, s]) => s.raw.toUpperCase());

  const top = [...videos].sort((a, b) => b.views - a.views)[0];
  const topTopic = top ? shortTopic(top.caption) : null;

  const scored = analyses
    .filter((a) => a.hookType && (a.hookScore ?? 0) > 0)
    .sort((a, b) => (b.hookScore ?? 0) - (a.hookScore ?? 0));
  const bestStoredHookType = scored[0]?.hookType ?? null;

  return {
    niche,
    nicheLabel: niche === "unknown" ? "غير محدد" : NICHE_WORDS[detected as Exclude<NicheKey, "unknown">].label,
    topics,
    entities,
    topTopic,
    bestStoredHookType,
    hasSubjectEvidence: niche !== "unknown" || repeated.length >= 3,
  };
}

/** The concrete subject to talk about, or an honest fallback. */
export function subjectPhrase(ctx: AccountContext): string {
  if (ctx.entities[0]) return ctx.entities[0];
  if (ctx.topics[0]) return ctx.topics[0];
  if (ctx.topTopic) return ctx.topTopic;
  return "نفس موضوع الفيديو الأقوى في حسابك";
}

export const NO_SUBJECT_NOTE = "ما عندي دليل كافي لتحديد موضوع أدق، فاعتمدنا على الأنماط المؤكدة من فيديوهاتك.";
