import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase server environment variables.');
}
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
Deno.serve(async (req)=>{
  try {
    if (req.method !== 'POST') {
      return jsonResponse({
        success: false,
        error: 'Method not allowed.'
      }, 405);
    }
    /*
     * Server-to-server protection.
     *
     * The caller must provide the Supabase service-role key.
     * A normal anon/authenticated client must never have this key.
     */ const authorization = req.headers.get('Authorization') ?? '';
    const expectedAuthorization = `Bearer ${serviceRoleKey}`;
    if (authorization !== expectedAuthorization) {
      return jsonResponse({
        success: false,
        error: 'Unauthorized.'
      }, 401);
    }
    let body;
    try {
      body = await req.json();
    } catch  {
      return jsonResponse({
        success: false,
        error: 'Invalid JSON request body.'
      }, 400);
    }
    const winnerId = body.winner_id;
    if (typeof winnerId !== 'string' || winnerId.trim().length === 0) {
      return jsonResponse({
        success: false,
        error: 'winner_id is required.'
      }, 400);
    }
    /*
     * Call the single server-side Points reward mechanism.
     *
     * This function does NOT calculate the reward amount.
     * The database function gets the configured prize amount
     * from competition_prizes.
     */ const { data, error } = await supabaseAdmin.rpc('issue_competition_reward', {
      p_winner_id: winnerId
    });
    if (error) {
      console.error('[issue-competition-reward] RPC error:', error);
      return jsonResponse({
        success: false,
        error: error.message
      }, 400);
    }
    return jsonResponse({
      success: true,
      result: data
    });
  } catch (error) {
    console.error('[issue-competition-reward] Unexpected error:', error);
    return jsonResponse({
      success: false,
      error: 'Internal server error.'
    }, 500);
  }
});
