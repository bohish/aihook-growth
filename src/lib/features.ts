/**
 * Deterministic content-feature inference from the ONLY signals the approved
 * TikTok scopes give us: the caption/title text and the video duration.
 *
 * We do not have video/audio access, so anything that would require watching
 * the clip (person on camera, editing style, retention, hook timing) is left as
 * `null` = unknown, and the analysis must skip unknown features instead of
 * guessing. Nothing here invents numbers.
 */
import type { DurationBucket, HookType, VideoFeatures } from "./types";

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function durationBucketFor(seconds: number): DurationBucket {
  if (seconds < 12) return "0-12";
  if (seconds < 18) return "12-18";
  if (seconds <= 30) return "18-30";
  return "30+";
}

export function inferFeatures(caption: string, durationSeconds: number): VideoFeatures {
  const text = caption.toLowerCase();

  const offerWords = ["خصم", "عرض", "تخفيض", "سعر", "كوبون", "شحن مجاني", "sale", "offer", "discount", "code"];
  const educationalWords = ["كيف", "طريقة", "خطوات", "تعلم", "شرح", "نصيحة", "how to", "tips", "guide"];
  const demoWords = ["منتج", "تجربة", "مراجعة", "المقاس", "القماش", "review", "unboxing", "product"];
  const trendWords = ["ترند", "تحدي", "challenge", "trend", "sound"];
  const behindWords = ["كواليس", "خلف الكواليس", "يوم في", "behind the scenes", "bts"];
  const ugcWords = ["تجربتي", "رأيي", "من العميلة", "من العميل", "customer", "ugc"];
  const problemWords = ["مشكلة", "تعبت", "ليش", "لماذا", "غلط", "خطأ", "لا تشتري", "قبل ما", "stop", "mistake"];
  const curiosityWords = ["سر", "أسرار", "ما تتوقع", "شفت", "لن تتوقع", "secret", "nobody"];
  const storyWords = ["قصة", "بدايتي", "قبل سنة", "story"];

  const tags: VideoFeatures["tags"] = [];
  if (has(text, ugcWords)) tags.push("ugc");
  if (has(text, demoWords)) tags.push("product_demo");
  if (has(text, trendWords)) tags.push("trend");
  if (has(text, educationalWords)) tags.push("educational");
  if (has(text, offerWords)) tags.push("offer");
  if (has(text, behindWords)) tags.push("behind_scenes");

  let hookType: HookType = "generic";
  if (has(text, problemWords)) hookType = "problem";
  else if (has(text, curiosityWords)) hookType = "curiosity";
  else if (has(text, storyWords)) hookType = "story";
  else if (has(text, offerWords)) hookType = "offer";

  return {
    tags,
    hookType,
    // Unknown by design: the API gives us no view of the video content itself.
    personOnCamera: null,
    hasOffer: has(text, offerWords),
    durationBucket: durationBucketFor(durationSeconds),
    captionAvailable: caption.trim().length > 0,
  };
}
