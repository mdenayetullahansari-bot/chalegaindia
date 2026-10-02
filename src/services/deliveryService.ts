import { supabase } from '@/lib/supabase';

export type DeliveryPartnerStatus =
  | 'pending'
  | 'approved'
  | 'suspended'
  | 'rejected';

export type DeliveryAvailability =
  | 'offline'
  | 'online'
  | 'busy';

export type DeliveryVehicleType =
  | 'bike'
  | 'scooter'
  | 'car'
  | 'bicycle'
  | 'other';

export type DeliveryPartner = {
  id: string;
  user_id: string;
  status: DeliveryPartnerStatus;
  availability: DeliveryAvailability;
  vehicle_type: DeliveryVehicleType;
  vehicle_number: string | null;
  phone: string | null;
  city_area: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryPartnerApplication = {
  vehicleType: DeliveryVehicleType;
  vehicleNumber?: string;
  phone?: string;
  cityArea?: string;
};

export async function getMyDeliveryPartner(): Promise<DeliveryPartner | null> {
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

  const { data, error } = await supabase
    .from('chalega_delivery_partners')
    .select(
      'id,user_id,status,availability,vehicle_type,vehicle_number,phone,city_area,approved_at,created_at,updated_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DeliveryPartner | null;
}

export async function applyAsDeliveryPartner(
  application: DeliveryPartnerApplication
): Promise<DeliveryPartner> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('Please sign in before applying as a delivery partner.');
  }

  const existing = await getMyDeliveryPartner();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('chalega_delivery_partners')
    .insert({
      user_id: user.id,
      vehicle_type: application.vehicleType,
      vehicle_number: application.vehicleNumber?.trim() || null,
      phone: application.phone?.trim() || null,
      city_area: application.cityArea?.trim() || null,
      status: 'pending',
      availability: 'offline',
    })
    .select(
      'id,user_id,status,availability,vehicle_type,vehicle_number,phone,city_area,approved_at,created_at,updated_at'
    )
    .single();

  if (error) {
    throw error;
  }

  return data as DeliveryPartner;
}

export async function getMyDeliveryAssignments() {
  const partner = await getMyDeliveryPartner();

  if (!partner) {
    return [];
  }

  const { data, error } = await supabase
    .from('chalega_delivery_assignments')
    .select(
      'id,job_id,partner_id,status,offered_at,accepted_at,rejected_at'
    )
    .eq('partner_id', partner.id)
    .order('offered_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMyDeliveryPayouts() {
  const partner = await getMyDeliveryPartner();

  if (!partner) {
    return [];
  }

  const { data, error } = await supabase
    .from('chalega_delivery_payouts')
    .select(
      'id,job_id,partner_id,amount,status,paid_at,created_at'
    )
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
