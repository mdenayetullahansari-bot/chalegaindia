import { supabase } from '@/lib/supabase';

export type AdminOrder = {
  id: string;
  order_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  area: string | null;
  pin: string | null;
  total: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  delivery_job_id: string | null;
  delivery_job_status: string | null;
  partner_name: string | null;
  partner_phone: string | null;
  partner_vehicle: string | null;
  partner_area: string | null;
  partner_earnings: number;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase.rpc('get_admin_orders');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as AdminOrder[];
}
