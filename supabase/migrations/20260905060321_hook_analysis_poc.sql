-- Append-only hook-analysis snapshots. Raw TikTok records are never modified.
CREATE TABLE public.hook_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  external_video_id TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  source_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'analysis_unavailable', 'failed')),
  media_resolver_status TEXT NOT NULL,
  error_code TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processor_version TEXT,
  UNIQUE (user_id, external_video_id, analysis_version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hook_analysis_runs TO authenticated;
GRANT ALL ON public.hook_analysis_runs TO service_role;
ALTER TABLE public.hook_analysis_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "har_own" ON public.hook_analysis_runs FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE INDEX idx_hook_analysis_runs_user_time ON public.hook_analysis_runs (user_id, analyzed_at DESC);
