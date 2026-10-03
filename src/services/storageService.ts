import { supabase } from '../../lib/supabase';

export async function uploadAvatar(fileUri: string, userId: string) {
  const fileName = `${userId}/avatar-${Date.now()}.jpg`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  // Use signed URL for private bucket (1 hour expiry = 3600 seconds)
  const { data, error: signedUrlError } = await supabase.storage
    .from('avatars')
    .createSignedUrl(fileName, 60 * 60);

  if (signedUrlError) {
    throw signedUrlError;
  }

  return data.signedUrl;
}
