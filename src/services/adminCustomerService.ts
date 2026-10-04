import { supabase } from '@/lib/supabase';

export type AdminCustomer = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  area: string | null;
  ward_id: number | null;
  points: number;
  created_at: string;
  orders_count: number;
  total_spend: number;
  last_order_at: string | null;
  last_order_status: string | null;
};

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  const { data, error } = await supabase.rpc('get_admin_customers');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as AdminCustomer[];
}
