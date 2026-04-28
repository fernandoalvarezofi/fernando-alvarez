CREATE TABLE IF NOT EXISTS public.viral_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS viral_cache_niche_platform ON public.viral_cache(niche, platform, created_at DESC);

ALTER TABLE public.viral_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service only" ON public.viral_cache
  FOR ALL
  USING (false)
  WITH CHECK (false);