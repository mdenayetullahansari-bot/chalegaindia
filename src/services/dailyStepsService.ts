import { supabase } from '../lib/supabase';

export type DailyStepsSyncResult = {
  stepDate: string;
  steps: number;
  distanceKm: number;
  calories: number;
};

function getTodayKey(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  );
}

/**
 * Persist the user's latest step total through the hardened
 * SECURITY DEFINER RPC. The backend keeps the maximum value
 * already recorded for the day and validates the range/date.
 */
export async function syncDailySteps(
  nextSteps: number
): Promise<DailyStepsSyncResult | null> {
  const steps = Math.max(0, Math.min(200000, Math.floor(nextSteps)));

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const stepDate = getTodayKey();

  const { data, error } = await supabase.rpc(
    'sync_my_daily_steps',
    {
      p_step_date: stepDate,
      p_steps: steps,
    }
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    stepDate,
    steps: Number(row?.steps ?? steps),
    distanceKm: Number(
      row?.distance_km ??
        (steps * 0.00072).toFixed(3)
    ),
    calories: Number(
      row?.calories ?? Math.round(steps * 0.04)
    ),
  };
}
