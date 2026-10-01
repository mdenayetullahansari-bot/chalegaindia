CREATE TABLE IF NOT EXISTS public.chalega_reward_catalog (
  id text PRIMARY KEY,
  emoji text NOT NULL DEFAULT '🎁',
  category text NOT NULL DEFAULT 'REWARD',
  title text NOT NULL,
  description text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  reward_type text NOT NULL DEFAULT 'badge'
    CHECK (reward_type IN ('badge','partner_discount','product','voucher','experience')),
  partner_name text,
  redemption_mode text NOT NULL DEFAULT 'one_time'
    CHECK (redemption_mode IN ('one_time','repeatable')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chalega_reward_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active Chalega rewards"
  ON public.chalega_reward_catalog;

CREATE POLICY "Authenticated users can view active Chalega rewards"
  ON public.chalega_reward_catalog
  FOR SELECT
  TO authenticated
  USING (active = true);

INSERT INTO public.chalega_reward_catalog
  (id, emoji, category, title, description, cost, reward_type, redemption_mode, active, sort_order)
VALUES
  ('badge-500','🥉','MILESTONE','First 500','Your first major Chalega milestone.',500,'badge','one_time',true,10),
  ('badge-1000','🥈','MILESTONE','Healthy Walker','Reach 1,000 Chalega Coins.',1000,'badge','one_time',true,20),
  ('badge-2500','🥇','MILESTONE','Chalega Champion','Reach 2,500 Chalega Coins.',2500,'badge','one_time',true,30)
ON CONFLICT (id) DO UPDATE SET
  emoji = EXCLUDED.emoji,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cost = EXCLUDED.cost,
  reward_type = EXCLUDED.reward_type,
  redemption_mode = EXCLUDED.redemption_mode,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

REVOKE ALL ON TABLE public.chalega_reward_catalog FROM anon;
GRANT SELECT ON TABLE public.chalega_reward_catalog TO authenticated;
