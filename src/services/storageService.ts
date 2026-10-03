import { supabase } from '../../lib/supabase';

export async function uploadAvatar(fileUri: string, userId: string) {
  const fileName = `${userId}/avatar-${Date.now()}.jpg`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
