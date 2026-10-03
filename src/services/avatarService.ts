import { supabase } from '../../lib/supabase';

export async function getAvatarSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
