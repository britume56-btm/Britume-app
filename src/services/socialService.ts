import { supabase } from '../../lib/supabase';

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscoverableProfile = PublicProfile & {
  isFollowing: boolean;
};

export type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: PublicProfile;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: PublicProfile;
};

type PostRow = Omit<FeedPost, 'author' | 'like_count' | 'comment_count' | 'liked_by_me'>;
type MetricRow = {
  post_id: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

function fail(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureOwnPublicProfile(): Promise<void> {
  const { error } = await supabase.rpc('ensure_own_public_profile');
  fail(error);
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();
  fail(error);
  return (data as PublicProfile | null) ?? null;
}

export async function searchPublicProfiles(
  searchText: string,
  currentUserId: string
): Promise<DiscoverableProfile[]> {
  const query = searchText.trim();
  if (query.length < 2 || query.length > 80) {
    return [];
  }
  const { data, error } = await supabase.rpc('search_public_profiles', {
    search_text: query,
  });
  fail(error);

  const profiles = (data ?? []) as PublicProfile[];
  if (profiles.length === 0) {
    return [];
  }

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)
    .in(
      'following_id',
      profiles.map((profile) => profile.id)
    );
  fail(followsError);
  const followedIds = new Set(
    ((follows ?? []) as { following_id: string }[]).map((row) => row.following_id)
  );

  return profiles.map((profile) => ({
    ...profile,
    isFollowing: followedIds.has(profile.id),
  }));
}

async function enrichPosts(rows: PostRow[]): Promise<FeedPost[]> {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((post) => post.id);
  const authorIds = [...new Set(rows.map((post) => post.author_id))];
  const [profilesResult, metricsResult] = await Promise.all([
    supabase
      .from('public_profiles')
      .select('id, username, display_name, created_at, updated_at')
      .in('id', authorIds),
    supabase.rpc('social_post_metrics', { post_ids: ids }),
  ]);
  fail(profilesResult.error);
  fail(metricsResult.error);

  const profiles = new Map(
    ((profilesResult.data ?? []) as PublicProfile[]).map((profile) => [profile.id, profile])
  );
  const metrics = new Map(
    ((metricsResult.data ?? []) as MetricRow[]).map((metric) => [metric.post_id, metric])
  );

  return rows.flatMap((post) => {
    const author = profiles.get(post.author_id);
    if (!author) {
      return [];
    }
    const metric = metrics.get(post.id);
    return [
      {
        ...post,
        author,
        like_count: Number(metric?.like_count ?? 0),
        comment_count: Number(metric?.comment_count ?? 0),
        liked_by_me: metric?.liked_by_me ?? false,
      },
    ];
  });
}

export async function listFeed(currentUserId: string): Promise<FeedPost[]> {
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);
  fail(followsError);

  const authorIds = [
    ...new Set([
      currentUserId,
      ...((follows ?? []) as { following_id: string }[]).map((row) => row.following_id),
    ]),
  ];
  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, body, created_at, updated_at')
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .limit(50);
  fail(error);
  return enrichPosts((data ?? []) as PostRow[]);
}

export async function listUserPosts(profileId: string): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, body, created_at, updated_at')
    .eq('author_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);
  fail(error);
  return enrichPosts((data ?? []) as PostRow[]);
}

export async function createPost(authorId: string, body: string): Promise<void> {
  const content = body.trim();
  if (!content || content.length > 2000) {
    throw new Error('Posts must be between 1 and 2,000 characters.');
  }

  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    body: content,
  });
  fail(error);
}

export async function updatePost(postId: string, body: string): Promise<void> {
  const content = body.trim();
  if (!content || content.length > 2000) {
    throw new Error('Posts must be between 1 and 2,000 characters.');
  }

  const { error } = await supabase.from('posts').update({ body: content }).eq('id', postId);
  fail(error);
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  fail(error);
}

export async function togglePostLike(
  postId: string,
  userId: string,
  likedByMe: boolean
): Promise<void> {
  if (likedByMe) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    fail(error);
    return;
  }

  const { error } = await supabase.from('post_likes').insert({
    post_id: postId,
    user_id: userId,
  });
  fail(error);
}

export async function getFollowCounts(
  profileId: string
): Promise<{ followers: number; following: number }> {
  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);
  fail(followersResult.error);
  fail(followingResult.error);
  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
  };
}

export async function setFollow(
  followerId: string,
  followingId: string,
  currentlyFollowing: boolean
): Promise<void> {
  if (followerId === followingId) {
    throw new Error('You cannot follow your own profile.');
  }

  if (currentlyFollowing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    fail(error);
    return;
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  });
  fail(error);
}

export async function getFollowStatus(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  fail(error);
  return Boolean(data);
}

export async function getFollowedIds(
  followerId: string,
  followingIds: string[]
): Promise<Set<string>> {
  if (followingIds.length === 0) {
    return new Set();
  }
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .in('following_id', followingIds);
  fail(error);
  return new Set(
    ((data ?? []) as { following_id: string }[]).map((row) => row.following_id)
  );
}

export async function listFollowedProfiles(
  profileId: string,
  kind: 'followers' | 'following'
): Promise<PublicProfile[]> {
  const column = kind === 'followers' ? 'follower_id' : 'following_id';
  const filterColumn = kind === 'followers' ? 'following_id' : 'follower_id';
  const { data, error } = await supabase
    .from('follows')
    .select(column)
    .eq(filterColumn, profileId)
    .order('created_at', { ascending: false });
  fail(error);

  const ids = [
    ...new Set(
      ((data ?? []) as Record<string, string>[]).map((row) => row[column])
    ),
  ];
  if (ids.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, created_at, updated_at')
    .in('id', ids);
  fail(profilesError);
  const profileById = new Map(
    ((profiles ?? []) as PublicProfile[]).map((profile) => [profile.id, profile])
  );
  return ids.flatMap((id) => {
    const profile = profileById.get(id);
    return profile ? [profile] : [];
  });
}

export async function listPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(200);
  fail(error);

  const rows = ((data ?? []) as Omit<PostComment, 'author'>[]).reverse();
  if (rows.length === 0) {
    return [];
  }

  const authorIds = [...new Set(rows.map((comment) => comment.author_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, created_at, updated_at')
    .in('id', authorIds);
  fail(profilesError);
  const profileById = new Map(
    ((profiles ?? []) as PublicProfile[]).map((profile) => [profile.id, profile])
  );
  return rows.flatMap((comment) => {
    const author = profileById.get(comment.author_id);
    return author ? [{ ...comment, author }] : [];
  });
}

export async function createComment(
  postId: string,
  authorId: string,
  body: string
): Promise<void> {
  const content = body.trim();
  if (!content || content.length > 1000) {
    throw new Error('Comments must be between 1 and 1,000 characters.');
  }

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    author_id: authorId,
    body: content,
  });
  fail(error);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  fail(error);
}
