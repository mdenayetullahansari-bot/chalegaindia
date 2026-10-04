import { supabase } from '@/lib/supabase';

export type AdminBusinessOverview = {
  customer_count: number;
  order_count: number;
  paid_order_count: number;
  gross_order_value: number;
  delivery_revenue: number;
  delivered_order_count: number;
  pending_payout_count: number;
  pending_payout_amount: number;
  paid_payout_amount: number;
  approved_partner_count: number;
  online_partner_count: number;
  busy_partner_count: number;
  active_delivery_job_count: number;
  pending_partner_application_count: number;
  orders_last_7_days: number;
  revenue_last_7_days: number;
};

export async function getAdminBusinessOverview(): Promise<AdminBusinessOverview | null> {
  const { data, error } = await supabase.rpc('get_admin_business_overview');
  if (error) throw error;
  return Array.isArray(data) && data.length ? (data[0] as AdminBusinessOverview) : null;
}
