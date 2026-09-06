CREATE TABLE public.hook_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.tiktok_accounts(id) ON DELETE SET NULL,
  video_id text NOT NULL,
  share_url text,
  status text NOT NULL DEFAULT 'pending',
  spoken_text text,
  onscreen_text text,
  visual_description text,
  hook_summary text,
  hook_type text,
  confidence numeric,
  analyzed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hook_analyses_status_check CHECK (status IN ('pending','completed','failed')),
  CONSTRAINT hook_analyses_unique UNIQUE (user_id, video_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hook_analyses TO authenticated;
GRANT ALL ON public.hook_analyses TO service_role;

ALTER TABLE public.hook_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY ha_own ON public.hook_analyses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ha_updated_at BEFORE UPDATE ON public.hook_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();