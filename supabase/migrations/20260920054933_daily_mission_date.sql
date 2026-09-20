-- Make user mission progress explicitly daily.
-- Existing user_missions table is currently empty.

ALTER TABLE public.user_missions
ADD COLUMN mission_date date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.user_missions
DROP CONSTRAINT IF EXISTS user_missions_user_id_mission_id_key;

ALTER TABLE public.user_missions
ADD CONSTRAINT user_missions_user_mission_date_key
UNIQUE (user_id, mission_id, mission_date);

CREATE INDEX IF NOT EXISTS user_missions_user_date_idx
ON public.user_missions (user_id, mission_date);