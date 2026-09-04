CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- tiktok_connections (tokens are server-only: no column-level grant to authenticated)
CREATE TABLE public.tiktok_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  is_demo BOOLEAN NOT NULL DEFAULT true,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  error_message TEXT,
  open_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT (id, user_id, status, is_demo, scopes, error_message, open_id, connected_at, created_at, updated_at) ON public.tiktok_connections TO authenticated;
GRANT INSERT (user_id, status, is_demo, scopes, error_message) ON public.tiktok_connections TO authenticated;
GRANT UPDATE (status, is_demo, scopes, error_message) ON public.tiktok_connections TO authenticated;
GRANT DELETE ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tc_own" ON public.tiktok_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tc_updated_at BEFORE UPDATE ON public.tiktok_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tiktok_accounts
CREATE TABLE public.tiktok_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  follower_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_accounts TO authenticated;
GRANT ALL ON public.tiktok_accounts TO service_role;
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ta_own" ON public.tiktok_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ta_updated_at BEFORE UPDATE ON public.tiktok_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tiktok_videos
CREATE TABLE public.tiktok_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.tiktok_accounts ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  caption TEXT,
  published_at TIMESTAMPTZ,
  duration_seconds NUMERIC,
  thumbnail_url TEXT,
  share_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_videos TO authenticated;
GRANT ALL ON public.tiktok_videos TO service_role;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_own" ON public.tiktok_videos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- video_metrics
CREATE TABLE public.video_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tiktok_videos ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_metrics TO authenticated;
GRANT ALL ON public.video_metrics TO service_role;
ALTER TABLE public.video_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vm_own" ON public.video_metrics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- content_features
CREATE TABLE public.content_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tiktok_videos ON DELETE CASCADE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  hook_type TEXT,
  has_person_on_camera BOOLEAN,
  has_offer BOOLEAN,
  duration_bucket TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_features TO authenticated;
GRANT ALL ON public.content_features TO service_role;
ALTER TABLE public.content_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cf_own" ON public.content_features FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- account_snapshots
CREATE TABLE public.account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.tiktok_accounts ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  score INTEGER NOT NULL DEFAULT 0,
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_snapshots TO authenticated;
GRANT ALL ON public.account_snapshots TO service_role;
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as_own" ON public.account_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_reports
CREATE TABLE public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.account_snapshots ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  score INTEGER NOT NULL DEFAULT 0,
  score_delta INTEGER,
  summary TEXT,
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_dna JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_own" ON public.ai_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recommendations
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.ai_reports ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'medium',
  confidence TEXT NOT NULL DEFAULT 'medium',
  evidence TEXT,
  action TEXT,
  target_metric TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_own" ON public.recommendations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_plans
CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.ai_reports ON DELETE CASCADE,
  week_start DATE NOT NULL DEFAULT CURRENT_DATE,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans TO authenticated;
GRANT ALL ON public.weekly_plans TO service_role;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wp_own" ON public.weekly_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_videos_user ON public.tiktok_videos (user_id);
CREATE INDEX idx_metrics_video ON public.video_metrics (video_id);
CREATE INDEX idx_snapshots_user_time ON public.account_snapshots (user_id, captured_at DESC);
CREATE INDEX idx_reports_user_time ON public.ai_reports (user_id, created_at DESC);