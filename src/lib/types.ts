/**
 * Shared domain types for TikTok Growth AI.
 * These mirror the database tables (tiktok_accounts, tiktok_videos,
 * video_metrics, content_features, account_snapshots, ai_reports,
 * recommendations, weekly_plans) but stay framework-free so both the
 * deterministic engine and the UI can use them.
 */

export type ContentTag =
  | "ugc"
  | "product_demo"
  | "talking_head"
  | "trend"
  | "educational"
  | "offer"
  | "behind_scenes";

export type HookType = "problem" | "curiosity" | "offer" | "generic" | "story";

export type DurationBucket = "0-12" | "12-18" | "18-30" | "30+";

export interface VideoFeatures {
  tags: ContentTag[];
  hookType: HookType;
  personOnCamera: boolean;
  hasOffer: boolean;
  durationBucket: DurationBucket;
}

export interface VideoRecord {
  id: string;
  caption: string;
  publishedAt: string; // ISO date
  durationSeconds: number;
  thumbnailSeed: number; // used for the deterministic thumbnail placeholder
  shareUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  features: VideoFeatures;
}

export interface AccountRecord {
  username: string;
  displayName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  isDemo: boolean;
}

export interface AccountData {
  account: AccountRecord;
  videos: VideoRecord[];
  /** true when the data comes from the demo provider (no real TikTok token). */
  isDemo: boolean;
  /** Human label shown in the UI when data is not real. */
  demoLabel?: string;
}

export interface Metrics {
  followers: number;
  totalVideos: number;
  totalViews: number;
  avgViews: number;
  medianViews: number;
  avgEngagementRate: number; // 0..1
  medianEngagementRate: number;
  postsPerWeek: number;
  views7: number;
  views30: number;
  viewsPrev7: number;
  viewsPrev30: number;
  trend7: number; // ratio change, e.g. 0.12 = +12%
  trend30: number;
  posts7: number;
  posts30: number;
  /** Share of total views coming from the top 3 videos (0..1). */
  viralDependency: number;
  longestGapDays: number;
  lastPostDaysAgo: number;
}

export type ScoreKey = "reach" | "engagement" | "consistency" | "efficiency";

export interface Subscore {
  key: ScoreKey;
  labelAr: string;
  labelEn: string;
  value: number; // 0..100
  note: string;
}

export interface ScoreResult {
  score: number; // 0..100
  subscores: Subscore[];
  summaryAr: string;
}

export type Level = "high" | "medium" | "low";

export interface Recommendation {
  priority: number;
  title: string;
  impact: Level;
  confidence: Level;
  evidence: string;
  action: string;
  targetMetric: "views" | "engagement" | "consistency";
}

export interface DnaInsight {
  title: string;
  detail: string;
  liftPct: number | null;
  sampleSize: number;
  confidence: Level;
}

export interface PlanDay {
  dayAr: string;
  idea: string;
  hook: string;
  format: string;
  cta: string;
  targetDuration: string;
  why: string;
}

export interface VideoVerdict {
  videoId: string;
  reason: string;
}

export interface AnalysisReport {
  account: AccountRecord;
  isDemo: boolean;
  metrics: Metrics;
  scoring: ScoreResult;
  scoreDelta: number;
  top: VideoRecord[];
  bottom: VideoRecord[];
  verdicts: Record<string, string>;
  dna: DnaInsight[];
  recommendations: Recommendation[];
  plan: PlanDay[];
  generatedAt: string;
}
