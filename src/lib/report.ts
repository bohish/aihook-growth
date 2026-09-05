/**
 * Report orchestration: fetch account data through the provider, compute
 * metrics deterministically, build the analysis, and (when signed in) persist
 * the snapshot + report + recommendations + weekly plan for history.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { computeMetrics } from "@/lib/metrics";
import { computeScore } from "@/lib/scoring";
import { analyze } from "@/lib/analysis";
import { fetchTikTokAccountData } from "@/lib/tiktok.functions";
import type { AccountData, AnalysisReport, ConnectionState } from "@/lib/types";

const CACHE_KEY = "tga.report.v1";

/**
 * Prior-period baseline score: recompute the score as it would have looked
 * 30 days ago (videos older than 30 days only). Deterministic, so the "trend
 * vs prior period" figure never fluctuates.
 */
function priorPeriodScore(data: AccountData): number | undefined {
  const cutoff = Date.now() - 30 * 86_400_000;
  const older = data.videos.filter((v) => new Date(v.publishedAt).getTime() < cutoff);
  if (older.length < 5) return undefined;
  const past = computeMetrics({ ...data, videos: older }, cutoff);
  return computeScore(past).score;
}

export class AnalysisUnavailableError extends Error {
  constructor(
    readonly status: ConnectionState["status"],
    message: string,
  ) {
    super(message);
    this.name = "AnalysisUnavailableError";
  }
}

/**
 * Runs the analysis on REAL account data only. If the connection is missing,
 * expired, unauthorized or the API fails, this throws an explicit
 * AnalysisUnavailableError — it never substitutes fabricated data.
 */
export async function runAnalysis(): Promise<AnalysisReport> {
  const result = await fetchTikTokAccountData();
  if (!result.ok || !result.data) {
    throw new AnalysisUnavailableError(result.status, result.message ?? "تعذّر جلب بيانات الحساب.");
  }
  const data = result.data;
  const metrics = computeMetrics(data);
  const report = analyze(data, metrics, priorPeriodScore(data));
  cacheReport(report);
  void persistReport(report).catch(() => {
    /* history persistence is best-effort; the analysis itself is local */
  });
  return report;
}

export function cacheReport(report: AnalysisReport) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(report));
  } catch {
    /* ignore quota errors */
  }
}

export function readCachedReport(): AnalysisReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisReport) : null;
  } catch {
    return null;
  }
}

/* ------------------------------ persistence ------------------------------ */

async function persistReport(report: AnalysisReport) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const subscores = Object.fromEntries(report.scoring.subscores.map((s) => [s.key, s.value]));

  const { data: snapshot, error: snapErr } = await supabase
    .from("account_snapshots")
    .insert({
      user_id: userId,
      is_demo: false,
      score: report.scoring.score,
      subscores,
      metrics: report.metrics as unknown as Json,
    })
    .select("id")
    .single();
  if (snapErr || !snapshot) return;

  const { data: saved, error: reportErr } = await supabase
    .from("ai_reports")
    .insert({
      user_id: userId,
      snapshot_id: snapshot.id,
      is_demo: false,
      score: report.scoring.score,
      score_delta: report.scoreDelta,
      summary: report.scoring.summaryAr,
      subscores,
      content_dna: report.dna as unknown as Json,
      payload: {
        account: report.account,
        top: report.top.map((v) => v.id),
        bottom: report.bottom.map((v) => v.id),
      } as unknown as Json,
      model: "deterministic-v1",
    })
    .select("id")
    .single();
  if (reportErr || !saved) return;

  await supabase.from("recommendations").insert(
    report.recommendations.map((r) => ({
      user_id: userId,
      report_id: saved.id,
      priority: r.priority,
      title: r.title,
      impact: r.impact,
      confidence: r.confidence,
      evidence: r.evidence,
      action: r.action,
      target_metric: r.targetMetric,
    })),
  );

  await supabase.from("weekly_plans").insert({
    user_id: userId,
    report_id: saved.id,
    days: report.plan as unknown as Json,
  });
}

export interface HistoryRow {
  id: string;
  score: number;
  score_delta: number | null;
  summary: string | null;
  created_at: string;
  subscores: Record<string, number>;
}

export async function fetchHistory(): Promise<HistoryRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("ai_reports")
    .select("id, score, score_delta, summary, created_at, subscores")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !data) return [];
  return data as unknown as HistoryRow[];
}
