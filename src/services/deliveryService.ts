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
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_updated_at: string | null;
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
      'id,user_id,status,availability,vehicle_type,vehicle_number,phone,city_area,approved_at,created_at,updated_at,latitude,longitude,location_accuracy_m,location_updated_at'
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
      'id,job_id,partner_id,status,offered_at,accepted_at,rejected_at,job:chalega_delivery_jobs(id,order_id,status,pickup_address,pickup_area,pickup_pin,pickup_latitude,pickup_longitude,drop_address,drop_area,drop_pin,drop_latitude,drop_longitude,delivery_fee,partner_earnings,distance_km,waiting_minutes,demand_bonus,community_bonus,tip_amount,earnings_breakdown,batch_id,sequence_in_batch)'
    )
    .eq('partner_id', partner.id)
    .order('offered_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const orderIds = rows
    .map((item: any) => item.job?.order_id)
    .filter(Boolean);

  if (orderIds.length === 0) {
    return rows;
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('order_id,total,payment_method,payment_status')
    .in('order_id', orderIds);

  if (ordersError) {
    throw ordersError;
  }

  const orderMap = new Map(
    (orders ?? []).map((order: any) => [order.order_id, order])
  );

  return rows.map((item: any) => ({
    ...item,
    job: item.job
      ? {
          ...item.job,
          order_total: orderMap.get(item.job.order_id)?.total ?? null,
          payment_method: orderMap.get(item.job.order_id)?.payment_method ?? null,
          payment_status: orderMap.get(item.job.order_id)?.payment_status ?? null,
        }
      : item.job,
  }));
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

export async function setMyDeliveryAvailability(
  availability: 'offline' | 'online'
): Promise<{ partner_id: string; availability: string }> {
  const { data, error } = await supabase.rpc(
    'set_delivery_partner_availability',
    { p_availability: availability }
  );

  if (error) {
    throw error;
  }

  return data as { partner_id: string; availability: string };
}

export async function acceptMyDeliveryAssignment(
  assignmentId: string
): Promise<{ assignment_id: string; job_id: string; status: string }> {
  const { data, error } = await supabase.rpc(
    'accept_my_delivery_assignment',
    { p_assignment_id: assignmentId }
  );

  if (error) {
    throw error;
  }

  return data as {
    assignment_id: string;
    job_id: string;
    status: string;
  };
}

export async function markMyCODOrderCollected(
  orderId: string
): Promise<{ order_id: string; payment_status: string; amount: number }> {
  const { data, error } = await supabase.rpc(
    'mark_my_cod_order_collected',
    { p_order_id: orderId }
  );

  if (error) {
    throw error;
  }

  return data as {
    order_id: string;
    payment_status: string;
    amount: number;
  };
}

export async function updateMyDeliveryJobStatus(
  jobId: string,
  status: 'picked_up' | 'out_for_delivery' | 'delivered'
): Promise<{
  job_id: string;
  order_id: string;
  status: string;
  order_status: string;
}> {
  const { data, error } = await supabase.rpc(
    'update_my_delivery_job_status',
    {
      p_job_id: jobId,
      p_status: status,
    }
  );

  if (error) {
    throw error;
  }

  return data as {
    job_id: string;
    order_id: string;
    status: string;
    order_status: string;
  };
}

export async function rejectMyDeliveryAssignment(
  assignmentId: string
): Promise<{ assignment_id: string; job_id: string; status: string }> {
  const { data, error } = await supabase.rpc(
    'reject_my_delivery_assignment',
    { p_assignment_id: assignmentId }
  );

  if (error) {
    throw error;
  }

  return data as {
    assignment_id: string;
    job_id: string;
    status: string;
  };
}


export async function acceptMyDeliveryBatch(
  batchId: string
): Promise<{ batch_id: string; partner_id: string; jobs_accepted: number; status: string }> {
  const { data, error } = await supabase.rpc(
    'accept_my_delivery_batch',
    { p_batch_id: batchId }
  );

  if (error) throw error;

  return data as {
    batch_id: string;
    partner_id: string;
    jobs_accepted: number;
    status: string;
  };
}

export async function rejectMyDeliveryBatch(
  batchId: string
): Promise<{ batch_id: string; jobs_released: number; status: string }> {
  const { data, error } = await supabase.rpc(
    'reject_my_delivery_batch',
    { p_batch_id: batchId }
  );

  if (error) throw error;

  return data as {
    batch_id: string;
    jobs_released: number;
    status: string;
  };
}
