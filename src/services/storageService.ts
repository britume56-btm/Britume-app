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

  // Persist only this stable object path. The UI requests a fresh signed URL
  // whenever it needs to display the private avatar.
  return fileName;
}
