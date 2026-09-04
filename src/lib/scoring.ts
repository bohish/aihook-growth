/**
 * Transparent account scoring.
 *
 * The final score is a weighted average of four subscores, each computed from
 * deterministic metrics with documented thresholds. No AI, no randomness — the
 * same input always produces the same score, so week-over-week comparisons in
 * the history view are meaningful.
 *
 * Weights:
 *   Reach 30% | Engagement 30% | Consistency 20% | Content efficiency 20%
 */
import { formatPercent } from "./metrics";
import type { Metrics, ScoreResult, Subscore } from "./types";

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Maps a value onto 0..100 between a floor and a ceiling, log-scaled. */
function logScale(value: number, floor: number, ceiling: number): number {
  if (value <= floor) return 0;
  if (value >= ceiling) return 100;
  const t = Math.log(value / floor) / Math.log(ceiling / floor);
  return clamp(t * 100);
}

/**
 * Reach: median views relative to follower count (view-through ratio) blended
 * with absolute median views, so small accounts with strong distribution are
 * not punished for being small.
 */
function reachScore(m: Metrics): number {
  const viewThrough = m.followers > 0 ? m.medianViews / m.followers : 0;
  const relative = clamp((viewThrough / 1.5) * 100); // 150% of followers = full marks
  const absolute = logScale(m.medianViews, 300, 200_000);
  return Math.round(relative * 0.6 + absolute * 0.4);
}

/** Engagement: median engagement rate; 2% is weak, 12% is excellent. */
function engagementScore(m: Metrics): number {
  return Math.round(logScale(m.medianEngagementRate, 0.015, 0.12));
}

/**
 * Consistency: posting cadence (target 4/week) penalised by the longest gap
 * between posts and by going quiet recently.
 */
function consistencyScore(m: Metrics): number {
  const cadence = clamp((m.postsPerWeek / 4) * 100);
  const gapPenalty = clamp(Math.max(0, m.longestGapDays - 5) * 3, 0, 45);
  const stalePenalty = clamp(Math.max(0, m.lastPostDaysAgo - 4) * 4, 0, 30);
  return Math.round(clamp(cadence - gapPenalty - stalePenalty));
}

/**
 * Content efficiency: how evenly performance is spread. High viral dependency
 * (a couple of lucky videos carrying everything) lowers the score, and a
 * median far below the average signals an unreliable content formula.
 */
function efficiencyScore(m: Metrics): number {
  const spread = m.avgViews > 0 ? m.medianViews / m.avgViews : 0; // 1 = perfectly even
  const spreadScore = clamp(spread * 120);
  const dependencyScore = clamp((1 - Math.max(0, m.viralDependency - 0.25) / 0.6) * 100);
  return Math.round(spreadScore * 0.5 + dependencyScore * 0.5);
}

export function computeScore(m: Metrics): ScoreResult {
  const reach = reachScore(m);
  const engagement = engagementScore(m);
  const consistency = consistencyScore(m);
  const efficiency = efficiencyScore(m);

  const score = Math.round(
    reach * 0.3 + engagement * 0.3 + consistency * 0.2 + efficiency * 0.2,
  );

  const subscores: Subscore[] = [
    {
      key: "reach",
      labelAr: "الوصول",
      labelEn: "Reach",
      value: reach,
      note: `وسيط المشاهدات ${Math.round(m.medianViews).toLocaleString("en-US")} مقابل ${m.followers.toLocaleString("en-US")} متابع`,
    },
    {
      key: "engagement",
      labelAr: "التفاعل",
      labelEn: "Engagement",
      value: engagement,
      note: `وسيط معدل التفاعل ${formatPercent(m.medianEngagementRate)}`,
    },
    {
      key: "consistency",
      labelAr: "الاستمرارية",
      labelEn: "Consistency",
      value: consistency,
      note: `${m.postsPerWeek} فيديو أسبوعياً، أطول انقطاع ${m.longestGapDays} يوم`,
    },
    {
      key: "efficiency",
      labelAr: "كفاءة المحتوى",
      labelEn: "Content Efficiency",
      value: efficiency,
      note: `${formatPercent(m.viralDependency, 0)} من المشاهدات تأتي من أقوى 3 فيديوهات`,
    },
  ];

  return { score, subscores, summaryAr: buildSummary(score, m) };
}

function buildSummary(score: number, m: Metrics): string {
  const trend = m.trend30;
  const trendText =
    trend > 0.1
      ? `المشاهدات في آخر 30 يوم أعلى بـ ${Math.round(trend * 100)}% من الفترة السابقة`
      : trend < -0.1
        ? `المشاهدات في آخر 30 يوم أقل بـ ${Math.abs(Math.round(trend * 100))}% من الفترة السابقة`
        : "المشاهدات مستقرة تقريباً مقارنة بالفترة السابقة";

  const weakest = [
    { name: "الوصول", v: reachScore(m) },
    { name: "التفاعل", v: engagementScore(m) },
    { name: "الاستمرارية", v: consistencyScore(m) },
    { name: "كفاءة المحتوى", v: efficiencyScore(m) },
  ].sort((a, b) => a.v - b.v)[0]!;

  const band =
    score >= 75
      ? "حسابك في وضع قوي"
      : score >= 55
        ? "حسابك في وضع جيد وفيه فرص واضحة للتحسين"
        : score >= 35
          ? "حسابك يحتاج تعديلات جوهرية في المحتوى والانتظام"
          : "حسابك في مرحلة مبكرة ويحتاج أساس محتوى ثابت";

  return `${band}. ${trendText}. أضعف محور حالياً: ${weakest.name}.`;
}

/** Recomputes only the total so history rows can be compared. */
export function scoreBand(score: number): { labelAr: string; tone: "good" | "ok" | "risk" } {
  if (score >= 70) return { labelAr: "قوي", tone: "good" };
  if (score >= 45) return { labelAr: "متوسط", tone: "ok" };
  return { labelAr: "يحتاج عمل", tone: "risk" };
}
