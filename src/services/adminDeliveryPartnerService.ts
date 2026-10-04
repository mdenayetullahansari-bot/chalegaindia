import { supabase } from '@/lib/supabase';

export type AdminDeliveryPartner = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  availability: string;
  vehicle_type: string;
  vehicle_number: string | null;
  phone: string | null;
  city_area: string | null;
  approved_at: string | null;
  created_at: string;
  location_updated_at: string | null;
  jobs_count: number;
  delivered_jobs_count: number;
  pending_payout: number;
};

export async function getAdminDeliveryPartners(): Promise<AdminDeliveryPartner[]> {
  const { data, error } = await supabase.rpc('get_admin_delivery_partners');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as AdminDeliveryPartner[];
}

export async function setAdminDeliveryPartnerStatus(
  partnerId: string,
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
) {
  const { data, error } = await supabase.rpc('set_admin_delivery_partner_status', {
    p_partner_id: partnerId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
