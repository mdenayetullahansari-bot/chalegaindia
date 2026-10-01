import { supabase } from '../lib/supabase';

export async function syncDailySteps(nextSteps: number) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return;

    const todayKey = new Date().toLocaleDateString('en-CA');

    const { error } = await supabase.rpc(
      'sync_my_daily_steps',
      {
        p_step_date: todayKey,
        p_steps: Math.floor(nextSteps),
      }
    );

    if (error) throw error;
  } catch (error) {
    console.log('Daily steps sync failed:', error);
  }
}
