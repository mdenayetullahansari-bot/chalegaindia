import { supabase } from '@/lib/supabase';

export type AdminPartnerApplication = {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  city_area: string | null;
  partnership_type: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getAdminPartnerApplications(): Promise<AdminPartnerApplication[]> {
  const { data, error } = await supabase.rpc('get_admin_partner_applications');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as AdminPartnerApplication[];
}

export async function setAdminPartnerApplicationStatus(
  applicationId: string,
  status: 'pending' | 'approved' | 'rejected' | 'contacted' | 'closed'
) {
  const { data, error } = await supabase.rpc('set_admin_partner_application_status', {
    p_application_id: applicationId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
