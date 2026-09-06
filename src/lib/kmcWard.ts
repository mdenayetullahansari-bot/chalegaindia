import { supabase } from './supabase';

export type KmcWardLookupResult = {
  ward_id: number;
  ward_number: number;
  boundary_version: string | null;
};

export async function findKmcWardByPoint(
  latitude: number,
  longitude: number,
): Promise<KmcWardLookupResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid location coordinates.');
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Location coordinates are outside valid ranges.');
  }

  const { data, error } = await supabase.rpc('find_kmc_ward_by_point', {
    p_lat: latitude,
    p_lng: longitude,
  });

  if (error) {
    throw new Error(error.message || 'Unable to look up your KMC ward.');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as KmcWardLookupResult;
}

export async function saveKmcWardAssignment(wardId: number) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || 'Unable to verify your account.');
  }

  if (!user) {
    throw new Error('Please sign in before saving your ward.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ward_id: wardId,
      ward_assignment_method: 'gps_postgis',
      ward_assigned_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message || 'Unable to save your ward assignment.');
  }
}
