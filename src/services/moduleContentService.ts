import { supabase } from '../../lib/supabase';

export type ModuleSection = 'TV' | 'TECHNOLOGIES' | 'STUDIOS' | 'WEAR' | 'FOUNDATION';

export type ModulePost = {
  id: string;
  section: ModuleSection;
  title: string;
  body: string;
  media_url: string | null;
  price_label: string | null;
  author_id: string;
  current_user_id: string;
  created_at: string;
  author: { username: string | null; display_name: string | null } | null;
};

export async function listModulePosts(section: ModuleSection): Promise<ModulePost[]> {
  const { error: profileError } = await supabase.rpc('ensure_own_public_profile');
  if (profileError) {
    throw profileError;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    throw new Error('Your BRITUME session has expired. Please sign in again.');
  }

  const { data, error } = await supabase
    .from('module_posts')
    .select(
      'id, section, title, body, media_url, price_label, author_id, created_at, author:public_profiles!module_posts_author_id_fkey(username, display_name)'
    )
    .eq('section', section)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    throw error;
  }

  type Author = NonNullable<ModulePost['author']>;
  const rows = (data ?? []) as unknown as (
    Omit<ModulePost, 'current_user_id' | 'author'> & { author: Author | Author[] | null }
  )[];
  return rows.map((post) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] ?? null : post.author,
    current_user_id: userData.user!.id,
  }));
}

export async function createModulePost(input: {
  section: ModuleSection;
  title: string;
  body: string;
  mediaUrl: string;
  priceLabel: string;
}): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!data.user) {
    throw new Error('Your BRITUME session has expired. Please sign in again.');
  }

  const mediaUrl = input.mediaUrl.trim();
  if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) {
    throw new Error('Links must start with https:// or http://.');
  }
  if (input.section === 'TV' && !mediaUrl) {
    throw new Error('Add a direct MP4 or HLS video link to publish a TV post.');
  }

  const { error } = await supabase.from('module_posts').insert({
    author_id: data.user.id,
    section: input.section,
    title: input.title.trim(),
    body: input.body.trim(),
    media_url: mediaUrl || null,
    price_label: input.section === 'WEAR' ? input.priceLabel.trim() || null : null,
  });
  if (error) {
    throw error;
  }
}

export async function deleteModulePost(postId: string): Promise<void> {
  const { error } = await supabase.from('module_posts').delete().eq('id', postId);
  if (error) {
    throw error;
  }
}
