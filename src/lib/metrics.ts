/**
 * Deterministic metric calculations.
 * Every number the product shows is computed here, in code — never by an AI
 * model. AI is only used for wording/interpretation.
 */
import type { AccountData, Metrics, VideoRecord } from "./types";

export const DAY_MS = 86_400_000;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Engagement rate = (likes + comments + shares) / views. */
export function engagementRate(video: VideoRecord): number {
  if (video.views <= 0) return 0;
  return (video.likes + video.comments + video.shares) / video.views;
}

function ratioChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
}

function daysBetween(a: number, b: number): number {
  return Math.abs(a - b) / DAY_MS;
}

export function computeMetrics(data: AccountData, now = Date.now()): Metrics {
  const videos = [...data.videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const views = videos.map((v) => v.views);
  const totalViews = views.reduce((a, b) => a + b, 0);
  const totalLikes = videos.reduce((a, v) => a + v.likes, 0);
  const totalComments = videos.reduce((a, v) => a + v.comments, 0);
  const totalShares = videos.reduce((a, v) => a + v.shares, 0);
  const rates = videos.map(engagementRate);
  const avgViews = Math.round(mean(views));

  const inWindow = (v: VideoRecord, fromDaysAgo: number, toDaysAgo: number) => {
    const age = (now - new Date(v.publishedAt).getTime()) / DAY_MS;
    return age >= fromDaysAgo && age < toDaysAgo;
  };

  const window7 = videos.filter((v) => inWindow(v, 0, 7));
  const prev7 = videos.filter((v) => inWindow(v, 7, 14));
  const window30 = videos.filter((v) => inWindow(v, 0, 30));
  const prev30 = videos.filter((v) => inWindow(v, 30, 60));

  const sumViews = (list: VideoRecord[]) => list.reduce((a, v) => a + v.views, 0);

  // Posting frequency across the observed span (min 1 week to avoid inflation).
  const timestamps = videos.map((v) => new Date(v.publishedAt).getTime());
  const oldest = timestamps.length ? Math.min(...timestamps) : now;
  const spanWeeks = Math.max(1, daysBetween(now, oldest) / 7);
  const postsPerWeek = videos.length / spanWeeks;

  // Longest gap between consecutive posts (consistency signal).
  let longestGapDays = 0;
  for (let i = 0; i < timestamps.length - 1; i += 1) {
    longestGapDays = Math.max(longestGapDays, daysBetween(timestamps[i]!, timestamps[i + 1]!));
  }

  // Viral dependency: how much of total views the top 3 videos carry.
  const top3 = [...views].sort((a, b) => b - a).slice(0, 3);
  const viralDependency = totalViews > 0 ? top3.reduce((a, b) => a + b, 0) / totalViews : 0;

  return {
    followers: data.account.followerCount,
    following: data.account.followingCount,
    accountLikes: data.account.likesCount,
    totalVideos: data.account.videoCount || videos.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    avgViews,
    medianViews: Math.round(median(views)),
    totalEngagementRate: totalViews > 0 ? (totalLikes + totalComments + totalShares) / totalViews : 0,
    avgEngagementRate: mean(rates),
    medianEngagementRate: median(rates),
    likesPer1kViews: totalViews > 0 ? (totalLikes / totalViews) * 1000 : 0,
    commentsPer1kViews: totalViews > 0 ? (totalComments / totalViews) * 1000 : 0,
    sharesPer1kViews: totalViews > 0 ? (totalShares / totalViews) * 1000 : 0,
    postsPerWeek: Number(postsPerWeek.toFixed(2)),
    views7: sumViews(window7),
    views30: sumViews(window30),
    viewsPrev7: sumViews(prev7),
    viewsPrev30: sumViews(prev30),
    trend7: ratioChange(sumViews(window7), sumViews(prev7)),
    trend30: ratioChange(sumViews(window30), sumViews(prev30)),
    posts7: window7.length,
    posts30: window30.length,
    viralDependency,
    longestGapDays: Math.round(longestGapDays),
    lastPostDaysAgo: timestamps.length ? Math.round(daysBetween(now, Math.max(...timestamps))) : 0,
    bestVideoViews: Math.max(0, ...views),
    highestEngagementRate: Math.max(0, ...rates),
    highestCommentRate: Math.max(0, ...videos.map((v) => (v.views > 0 ? v.comments / v.views : 0))),
    highestShareRate: Math.max(0, ...videos.map((v) => (v.views > 0 ? v.shares / v.views : 0))),
    videosAboveAverage: videos.filter((v) => v.views > avgViews).length,
    videosBelowAverage: videos.filter((v) => v.views < avgViews).length,
  };
}

/* ---------- formatting helpers (Latin digits, Arabic-friendly) ---------- */

const nf = new Intl.NumberFormat("en-US");

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1000).toFixed(0)}K`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return nf.format(Math.round(value));
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(ratio: number, digits = 0): string {
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(digits)}%`;
}

export function formatDateAr(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
