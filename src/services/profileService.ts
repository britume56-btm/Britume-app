import { supabase } from '../../lib/supabase';
import type { ProfileRecord } from '../types/profile';

export async function fetchProfile(userId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Profile fetch failed:', error.message);
    return null;
  }

  return data;
}

export async function saveProfile(input: {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  phone: string | null;
}): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: input.id,
        username: input.username || null,
        display_name: input.display_name || null,
        avatar_path: input.avatar_path || null,
        phone: input.phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Profile save failed:', error.message);
    return null;
  }

  return data;
}
