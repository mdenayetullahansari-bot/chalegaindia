import { createClient } from "jsr:@supabase/supabase-js@2";

const VERIFY_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const CACHE_MAX_AGE_MS = 23 * 60 * 60 * 1000;

type AdMobKey = { keyId: number; base64: string };
let cachedKeys: Map<number, CryptoKey> | null = null;
let cachedAt = 0;

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const bin = atob(normalized);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function derToP1363(der: Uint8Array): Uint8Array {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error("Invalid DER signature.");
  const lenByte = der[i++];
  if (lenByte & 0x80) i += lenByte & 0x7f;
  if (der[i++] !== 0x02) throw new Error("Invalid DER r value.");
  const rLen = der[i++];
  const r = der.slice(i, i + rLen);
  i += rLen;
  if (der[i++] !== 0x02) throw new Error("Invalid DER s value.");
  const sLen = der[i++];
  const s = der.slice(i, i + sLen);
  const out = new Uint8Array(64);
  const normalize = (value: Uint8Array, offset: number) => {
    let start = 0;
    while (start < value.length - 1 && value[start] === 0) start++;
    const trimmed = value.slice(start);
    if (trimmed.length > 32) throw new Error("Invalid ECDSA integer.");
    out.set(trimmed, offset + (32 - trimmed.length));
  };
  normalize(r, 0);
  normalize(s, 32);
  return out;
}

async function loadKeys(): Promise<Map<number, CryptoKey>> {
  if (cachedKeys && Date.now() - cachedAt < CACHE_MAX_AGE_MS) return cachedKeys;
  const response = await fetch(VERIFY_URL);
  if (!response.ok) throw new Error("Could not fetch AdMob verification keys.");
  const payload = await response.json() as { keys?: AdMobKey[] };
  const map = new Map<number, CryptoKey>();
  for (const key of payload.keys ?? []) {
    const spki = base64UrlToBytes(key.base64);
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      spki,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    map.set(Number(key.keyId), cryptoKey);
  }
  if (map.size === 0) throw new Error("No AdMob verification keys available.");
  cachedKeys = map;
  cachedAt = Date.now();
  return map;
}

async function verifyCallback(requestUrl: string) {
  const rawQuery = new URL(requestUrl).search.slice(1);
  const marker = "&signature=";
  const signatureIndex = rawQuery.lastIndexOf(marker);
  if (signatureIndex < 0) throw new Error("Missing AdMob signature.");

  const signedQuery = rawQuery.slice(0, signatureIndex);
  const tail = rawQuery.slice(signatureIndex + 1);
  const match = tail.match(/^signature=([^&]+)&key_id=(\d+)$/);
  if (!match) throw new Error("Invalid AdMob signature parameters.");

  const signature = base64UrlToBytes(decodeURIComponent(match[1]));
  const keyId = Number(match[2]);
  const key = (await loadKeys()).get(keyId);
  if (!key) throw new Error("Unknown AdMob verification key.");

  const data = new TextEncoder().encode(signedQuery);
  let valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signature,
    data,
  );

  if (!valid) {
    valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      derToP1363(signature),
      data,
    );
  }

  if (!valid) throw new Error("Invalid AdMob signature.");

  const url = new URL(requestUrl);
  const userId = url.searchParams.get("user_id");
  const transactionId = url.searchParams.get("transaction_id");
  const customData = url.searchParams.get("custom_data");
  const rewardAmount = Number(url.searchParams.get("reward_amount") ?? "0");
  const rewardItem = url.searchParams.get("reward_item") ?? "";

  if (!userId || !transactionId) throw new Error("Missing AdMob reward identity.");
  if (!customData) throw new Error("Missing rewarded-ad custom data.");
  if (rewardAmount !== 25 || rewardItem.toLowerCase() !== "coins") {
    throw new Error("Unexpected rewarded-ad reward configuration.");
  }
  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw new Error("Invalid user ID.");

  const timestamp = Number(url.searchParams.get("timestamp") ?? "0");
  if (!Number.isFinite(timestamp)) throw new Error("Invalid reward timestamp.");
  if (Math.abs(Date.now() - timestamp) > 24 * 60 * 60 * 1000) {
    throw new Error("Reward callback timestamp is outside the allowed window.");
  }

  return {
    userId,
    transactionId,
    customData,
    rewardAmount,
    adUnit: url.searchParams.get("ad_unit"),
    adNetwork: url.searchParams.get("ad_network"),
    timestamp,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  try {
    const verified = await verifyCallback(req.url);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase.rpc("process_verified_rewarded_ad", {
      p_user_id: verified.userId,
      p_provider_event_id: verified.transactionId,
      p_coins: verified.rewardAmount,
      p_metadata: {
        custom_data: verified.customData,
        ad_unit: verified.adUnit,
        ad_network: verified.adNetwork,
        timestamp: verified.timestamp,
      },
    });

    if (error) throw error;
    return Response.json({ ok: true, result: data });
  } catch (error) {
    console.error("[admob-reward-ssv]", error);
    return new Response("Invalid rewarded-ad callback", { status: 400 });
  }
});
