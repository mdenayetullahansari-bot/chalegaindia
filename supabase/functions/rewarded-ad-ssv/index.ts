import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase server environment variables.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifying_keys.json';
const EXPECTED_REWARD_ITEM = 'chalega_coins';
const EXPECTED_REWARD_AMOUNT = 25;
const MAX_TIMESTAMP_SKEW_MS = 10 * 60 * 1000;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    + '==='.slice((value.length + 3) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function derEcdsaToP1363(signature: Uint8Array): Uint8Array {
  let offset = 0;

  const readLength = (): number => {
    const first = signature[offset++];
    if (first === undefined) throw new Error('Invalid DER length.');
    if ((first & 0x80) === 0) return first;

    const byteCount = first & 0x7f;
    if (byteCount < 1 || byteCount > 2) {
      throw new Error('Unsupported DER length.');
    }

    let length = 0;
    for (let i = 0; i < byteCount; i += 1) {
      length = (length << 8) | signature[offset++];
    }
    return length;
  };

  if (signature[offset++] !== 0x30) {
    throw new Error('Invalid DER sequence.');
  }

  const sequenceLength = readLength();
  const sequenceEnd = offset + sequenceLength;

  if (signature[offset++] !== 0x02) {
    throw new Error('Invalid DER integer r.');
  }
  const rLength = readLength();
  const r = signature.slice(offset, offset + rLength);
  offset += rLength;

  if (signature[offset++] !== 0x02) {
    throw new Error('Invalid DER integer s.');
  }
  const sLength = readLength();
  const s = signature.slice(offset, offset + sLength);
  offset += sLength;

  if (offset !== sequenceEnd) {
    throw new Error('Invalid DER sequence length.');
  }

  const normalize = (value: Uint8Array): Uint8Array => {
    let start = 0;
    while (start < value.length - 32 && value[start] === 0) {
      start += 1;
    }

    const trimmed = value.slice(start);

    if (trimmed.length > 32) {
      throw new Error('ECDSA integer is too large.');
    }

    const out = new Uint8Array(32);
    out.set(trimmed, 32 - trimmed.length);
    return out;
  };

  const out = new Uint8Array(64);
  out.set(normalize(r), 0);
  out.set(normalize(s), 32);
  return out;
}

async function fetchKey(keyId: string): Promise<CryptoKey> {
  const response = await fetch(KEYS_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Could not fetch AdMob verification keys.');
  }

  const payload = await response.json() as {
    keys?: Array<{
      keyId?: number;
      base64?: string;
    }>;
  };

  const key = (payload.keys ?? []).find(
    (candidate) => String(candidate.keyId) === keyId,
  );

  if (!key?.base64) {
    throw new Error('AdMob verification key not found.');
  }

  return crypto.subtle.importKey(
    'spki',
    decodeBase64Url(key.base64),
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['verify'],
  );
}

function getUnsignedQuery(rawQuery: string): {
  unsignedQuery: string;
  signature: string;
  keyId: string;
} {
  const signatureMarker = '&signature=';
  const keyMarker = '&key_id=';

  const signatureIndex = rawQuery.indexOf(signatureMarker);

  if (signatureIndex < 0) {
    throw new Error('Missing signature.');
  }

  const keyIndex = rawQuery.indexOf(keyMarker, signatureIndex + signatureMarker.length);

  if (keyIndex < 0) {
    throw new Error('Missing key_id.');
  }

  const unsignedQuery = rawQuery.slice(0, signatureIndex);
  const signature = rawQuery.slice(
    signatureIndex + signatureMarker.length,
    keyIndex,
  );
  const keyId = rawQuery.slice(keyIndex + keyMarker.length);

  if (!signature || !keyId) {
    throw new Error('Incomplete signature parameters.');
  }

  return { unsignedQuery, signature, keyId };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'GET') {
      return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
    }

    const rawQuery = new URL(req.url).search.slice(1);
    const { unsignedQuery, signature, keyId } = getUnsignedQuery(rawQuery);
    const params = new URLSearchParams(rawQuery);

    const userId = params.get('user_id');
    const rewardItem = params.get('reward_item');
    const rewardAmount = Number(params.get('reward_amount'));
    const transactionId = params.get('transaction_id');
    const timestamp = Number(params.get('timestamp'));

    if (!userId || !transactionId || !Number.isInteger(rewardAmount)) {
      return jsonResponse({ success: false, error: 'Invalid reward payload.' }, 400);
    }

    if (rewardItem !== EXPECTED_REWARD_ITEM || rewardAmount !== EXPECTED_REWARD_AMOUNT) {
      return jsonResponse({ success: false, error: 'Unexpected reward configuration.' }, 400);
    }

    if (!Number.isFinite(timestamp)) {
      return jsonResponse({ success: false, error: 'Invalid timestamp.' }, 400);
    }

    if (Math.abs(Date.now() - timestamp) > MAX_TIMESTAMP_SKEW_MS) {
      return jsonResponse({ success: false, error: 'Reward timestamp is outside the allowed window.' }, 400);
    }

    const key = await fetchKey(keyId);
    const signatureBytes = derEcdsaToP1363(decodeBase64Url(signature));

    const valid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      key,
      signatureBytes,
      new TextEncoder().encode(unsignedQuery),
    );

    if (!valid) {
      return jsonResponse({ success: false, error: 'Invalid AdMob signature.' }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return jsonResponse({ success: false, error: 'User not found.' }, 404);
    }

    const { data: rewardResult, error: rewardError } = await admin.rpc(
      'issue_internal_chalega_coins',
      {
        p_user_id: userId,
        p_amount: rewardAmount,
        p_transaction_type: 'rewarded_ad',
        p_transaction_key: 'rewarded_ad:' + transactionId,
        p_description: 'Rewarded ad completed',
        p_event_type: 'rewarded_ad',
        p_provider: 'admob',
        p_provider_event_id: transactionId,
        p_metadata: {
          ad_network: params.get('ad_network'),
          ad_unit: params.get('ad_unit'),
          reward_item: rewardItem,
          reward_amount: rewardAmount,
          timestamp,
          key_id: keyId,
          custom_data: params.get('custom_data'),
        },
      },
    );

    if (rewardError) throw rewardError;

    return jsonResponse({
      success: true,
      rewarded: rewardResult?.already_awarded !== true,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error('[rewarded-ad-ssv]', error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error.',
      },
      500,
    );
  }
});
