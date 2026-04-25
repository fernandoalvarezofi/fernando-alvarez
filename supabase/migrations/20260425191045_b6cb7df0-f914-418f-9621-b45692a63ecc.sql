-- Spy Agent: cuentas trackeadas
CREATE TABLE public.tracked_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','linkedin','x','facebook')),
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_viral_at TIMESTAMPTZ,
  last_viral_score NUMERIC,
  last_viral_thumbnail TEXT DEFAULT '',
  detected_within_24h BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, handle, platform)
);

ALTER TABLE public.tracked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tracked accounts"
  ON public.tracked_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Spy Agent: configuración de alertas (1 fila por usuario)
CREATE TABLE public.spy_agent_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate','daily')),
  min_score_threshold NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spy_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own spy settings"
  ON public.spy_agent_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mis Videos: videos del usuario cargados manualmente
CREATE TABLE public.user_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','linkedin','x','facebook')),
  caption TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  niche TEXT DEFAULT '',
  niche_avg_views INTEGER NOT NULL DEFAULT 0,
  niche_score NUMERIC NOT NULL DEFAULT 1,
  analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own videos"
  ON public.user_videos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_tracked_accounts BEFORE UPDATE ON public.tracked_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_spy_settings BEFORE UPDATE ON public.spy_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_user_videos BEFORE UPDATE ON public.user_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Índices
CREATE INDEX idx_tracked_accounts_user ON public.tracked_accounts(user_id);
CREATE INDEX idx_user_videos_user ON public.user_videos(user_id);