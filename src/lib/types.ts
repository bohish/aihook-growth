/**
 * Shared domain types for Growth Pulse AI.
 * These mirror the database tables (tiktok_accounts, tiktok_videos,
 * video_metrics, content_features, account_snapshots, ai_reports,
 * recommendations, weekly_plans) but stay framework-free so both the
 * deterministic engine and the UI can use them.
 *
 * Every field here must be obtainable from the approved TikTok scopes
 * (user.info.basic, user.info.stats, video.list). Anything the API does not
 * return is either absent or explicitly `null` (unknown) — never inferred.
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
  /** null = unknown; the API gives no access to the video content itself. */
  personOnCamera: boolean | null;
  hasOffer: boolean;
  durationBucket: DurationBucket;
  captionAvailable: boolean;
}

export interface VideoRecord {
  id: string;
  caption: string;
  publishedAt: string; // ISO date
  durationSeconds: number;
  thumbnailUrl: string | null;
  shareUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  features: VideoFeatures;
}

export interface AccountRecord {
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
}

export interface AccountData {
  account: AccountRecord;
  videos: VideoRecord[];
  fetchedAt: string;
}

export interface Metrics {
  followers: number;
  following: number;
  accountLikes: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgViews: number;
  medianViews: number;
  totalEngagementRate: number;
  avgEngagementRate: number; // 0..1
  medianEngagementRate: number;
  likesPer1kViews: number;
  commentsPer1kViews: number;
  sharesPer1kViews: number;
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
  bestVideoViews: number;
  highestEngagementRate: number;
  highestCommentRate: number;
  highestShareRate: number;
  videosAboveAverage: number;
  videosBelowAverage: number;
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
  /** Marketing detail — present when the account data supports it. */
  shoot?: string;
  hookLine?: string;
  build?: string;
  cta?: string;
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
  metrics: Metrics;
  scoring: ScoreResult;
  scoreDelta: number;
  top: VideoRecord[];
  bottom: VideoRecord[];
  verdicts: Record<string, string>;
  dna: DnaInsight[];
  recommendations: Recommendation[];
  plan: PlanDay[];
  /** 2–3 content pillars this week focuses on, derived from the account. */
  planFocus?: string[];
  /** Detected niche label + note when the subject is not clear enough. */
  contextNote?: string;
  generatedAt: string;

  /** Set when there are too few videos for a trustworthy score. */
  limitedData?: boolean;
}

/* --------------------------- connection state ---------------------------- */

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "expired"
  | "missing_credentials"
  | "permission_denied"
  | "api_error";

export interface ConnectionState {
  status: ConnectionStatus;
  displayName?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  scopes?: string[];
  connectedAt?: string | null;
  /** Arabic, user-facing explanation for non-connected states. */
  message?: string;
}
