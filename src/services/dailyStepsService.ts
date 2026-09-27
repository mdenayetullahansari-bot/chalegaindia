import { supabase } from '../lib/supabase';

export async function syncDailySteps(nextSteps: number) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return;
    const todayKey = new Date().toLocaleDateString('en-CA');
    const { error } = await supabase.from('daily_steps').upsert({ user_id: user.id, step_date: todayKey, steps: Math.floor(nextSteps), distance_km: Number((nextSteps * 0.00072).toFixed(3)), calories: Math.round(nextSteps * 0.04) }, { onConflict: 'user_id,step_date' });
    if (error) throw error;
  } catch (error) {
    console.log('Daily steps sync failed:', error);
  }
}
