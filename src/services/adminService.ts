import { supabase } from '@/lib/supabase';

export type AdminDeliveryPayout = {
  id: string;
  job_id: string;
  partner_id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  order_id: string | null;
  job_status: string | null;
  drop_area: string | null;
  drop_pin: string | null;
  vehicle_number: string | null;
  partner_area: string | null;
};

export async function isChalegaAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_chalega_admin');

  if (error) throw error;

  return data === true;
}

export async function getAdminDeliveryPayouts(): Promise<AdminDeliveryPayout[]> {
  const { data, error } = await supabase.rpc('get_admin_delivery_payouts');

  if (error) throw error;

  return (Array.isArray(data) ? data : []) as AdminDeliveryPayout[];
}

export async function markDeliveryPayoutPaid(
  payoutId: string
): Promise<{ payout_id: string; status: string; paid_at: string | null; already_paid?: boolean }> {
  const { data, error } = await supabase.rpc('mark_delivery_payout_paid', {
    p_payout_id: payoutId,
  });

  if (error) throw error;

  return data as {
    payout_id: string;
    status: string;
    paid_at: string | null;
    already_paid?: boolean;
  };
}
