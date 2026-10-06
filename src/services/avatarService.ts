import { supabase } from '../../lib/supabase';

const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

export async function getAvatarSignedUrl(
  path: string,
  expiresIn = SIGNED_URL_LIFETIME_SECONDS
) {
  if (!path) {
    throw new Error('Avatar object path is required.');
  }

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export function getLegacyAvatarObjectPath(
  legacyUrl: string | null | undefined,
  userId: string
): string | null {
  const marker = '/object/sign/avatars/';
  const markerIndex = legacyUrl?.indexOf(marker) ?? -1;
  if (!legacyUrl || markerIndex < 0) {
    return null;
  }

  const encodedPath = legacyUrl
    .slice(markerIndex + marker.length)
    .split(/[?#]/, 1)[0];

  try {
    const objectPath = decodeURIComponent(encodedPath);
    return objectPath.startsWith(`${userId}/`) ? objectPath : null;
  } catch {
    return null;
  }
}
