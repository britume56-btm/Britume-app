import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.117.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function getRecentAuthTime(accessToken: string): number | null {
  const payloadPart = accessToken.split('.')[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { auth_time?: unknown };
    return typeof payload.auth_time === 'number' ? payload.auth_time : null;
  } catch {
    return null;
  }
}

async function listUserFiles(
  admin: SupabaseClient<any, any, any>,
  bucket: string,
  folder: string
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(folder, { limit: pageSize, offset });
    if (error) {
      throw error;
    }

    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      if (entry.id === null && entry.metadata === null) {
        files.push(...(await listUserFiles(admin, bucket, path)));
      } else {
        files.push(path);
      }
    }

    if (!data || data.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return files;
}

async function removeUserFiles(
  admin: SupabaseClient<any, any, any>,
  bucket: string,
  userId: string
) {
  const files = await listUserFiles(admin, bucket, userId);
  for (let index = 0; index < files.length; index += 100) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(files.slice(index, index + 100));
    if (error) {
      throw error;
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse(401, { error: 'A signed-in account is required.' });
  }

  const authTime = getRecentAuthTime(accessToken);
  const now = Math.floor(Date.now() / 1000);
  if (authTime === null || authTime < now - 10 * 60 || authTime > now + 60) {
    return jsonResponse(401, { error: 'Please re-enter your password and try again.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(503, { error: 'Account deletion is not configured on the server.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonResponse(401, { error: 'Please sign in again before deleting your account.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
    if (bucketsError) {
      throw bucketsError;
    }

    const existingBuckets = new Set((buckets ?? []).map((bucket) => bucket.name));
    for (const bucket of ['avatars', 'theme-backgrounds']) {
      if (existingBuckets.has(bucket)) {
        await removeUserFiles(admin, bucket, authData.user.id);
      }
    }

    const { error: notificationCleanupError } = await admin
      .from('app_notifications')
      .delete()
      .eq('actor_id', authData.user.id);
    if (notificationCleanupError) {
      throw notificationCleanupError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id);
    if (deleteError) {
      throw deleteError;
    }

    return jsonResponse(200, { deleted: true });
  } catch (error) {
    console.error('Account deletion failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse(500, {
      error: 'Account deletion did not complete. Your account has not been confirmed as deleted.',
    });
  }
});
