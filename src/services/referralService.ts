import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

const PENDING_REFERRAL_KEY =
  'chalega_pending_referral_code';

export type ReferralResult = {
  referralId: string;
};

export type ReferralQualificationResult = {
  success: boolean;
  qualified: boolean;
  reason?: string;
  referralId?: string;
  referrerPointsAwarded?: number;
};

export async function getMyReferralCode(): Promise<string> {
  const { data, error } = await supabase.rpc(
    'get_my_referral_code'
  );

  if (error) {
    throw error;
  }

  if (
    typeof data !== 'string' ||
    data.trim().length === 0
  ) {
    throw new Error(
      'Referral code was not returned.'
    );
  }

  return data.trim();
}

export async function recordMyReferral(
  referralCode: string
): Promise<ReferralResult> {
  const code = referralCode.trim().toUpperCase();

  if (!code) {
    throw new Error(
      'Referral code is required.'
    );
  }

  const { data, error } = await supabase.rpc(
    'record_my_referral',
    {
      p_referral_code: code,
    }
  );

  if (error) {
    throw error;
  }

  if (
    typeof data !== 'string' ||
    data.trim().length === 0
  ) {
    throw new Error(
      'Referral could not be recorded.'
    );
  }

  return {
    referralId: data,
  };
}

export async function qualifyMyReferral(): Promise<ReferralQualificationResult> {
  const { data, error } = await supabase.rpc(
    'qualify_my_referral'
  );

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data !== 'object'
  ) {
    throw new Error(
      'Referral qualification response was invalid.'
    );
  }

  const result = data as ReferralQualificationResult;

  return result;
}


export type ReferralSummary = {
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  coinsEarned: number;
};

export async function getMyReferralSummary(): Promise<ReferralSummary> {
  const { data, error } = await supabase.rpc(
    'get_my_referral_summary'
  );

  if (error) {
    throw error;
  }

  const row = (data ?? {}) as Record<string, unknown>;

  return {
    totalReferrals: Number(row.total_referrals) || 0,
    pendingReferrals: Number(row.pending_referrals) || 0,
    qualifiedReferrals: Number(row.qualified_referrals) || 0,
    rewardedReferrals: Number(row.rewarded_referrals) || 0,
    coinsEarned: Number(row.coins_earned) || 0,
  };
}

export async function savePendingReferralCode(
  referralCode: string
): Promise<void> {
  const code = referralCode.trim().toUpperCase();

  if (!code) {
    return;
  }

  await AsyncStorage.setItem(
    PENDING_REFERRAL_KEY,
    code
  );
}

export async function getPendingReferralCode(): Promise<string | null> {
  const code = await AsyncStorage.getItem(
    PENDING_REFERRAL_KEY
  );

  return code?.trim() || null;
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(
    PENDING_REFERRAL_KEY
  );
}

export async function captureReferralCode(
  referralCode: string | null | undefined
): Promise<void> {
  if (!referralCode) {
    return;
  }

  await savePendingReferralCode(
    referralCode
  );
}

export async function applyPendingReferral(): Promise<ReferralResult | null> {
  const pendingCode =
    await getPendingReferralCode();

  if (!pendingCode) {
    return null;
  }

  const result =
    await recordMyReferral(pendingCode);

  await clearPendingReferralCode();

  return result;
}
