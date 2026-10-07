import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import CommentsModal from '../../components/social/CommentsModal';
import PostCard from '../../components/social/PostCard';
import type { RootStackParamList } from '../../navigation/types';
import {
  deletePost,
  ensureOwnPublicProfile,
  getFollowCounts,
  getFollowStatus,
  getPublicProfile,
  listUserPosts,
  setFollow,
  togglePostLike,
  type FeedPost,
  type PublicProfile,
} from '../../services/socialService';
import { getOrCreateDirectConversation } from '../../services/chatService';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const [currentUserId, setCurrentUserId] = useState('');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const ownProfile = currentUserId === userId;

  const refreshProfile = useCallback(async (viewerId: string) => {
    const [profileData, followCounts, followed, profilePosts] = await Promise.all([
      getPublicProfile(userId),
      getFollowCounts(userId),
      viewerId === userId ? Promise.resolve(false) : getFollowStatus(viewerId, userId),
      listUserPosts(userId),
    ]);
    if (!profileData) {
      throw new Error('This BRITUME profile is not available.');
    }
    setProfile(profileData);
    setCounts(followCounts);
    setIsFollowing(followed);
    setPosts(profilePosts);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          await ensureOwnPublicProfile();
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) {
            throw userError;
          }
          if (!data.user) {
            throw new Error('Your BRITUME session has expired. Please sign in again.');
          }
          if (active) {
            setCurrentUserId(data.user.id);
            await refreshProfile(data.user.id);
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Could not load this profile.');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [refreshProfile])
  );

  async function handleFollow() {
    if (!profile || ownProfile) {
      return;
    }
    try {
      await setFollow(currentUserId, profile.id, isFollowing);
      setIsFollowing((value) => !value);
      setCounts((value) => ({
        ...value,
        followers: value.followers + (isFollowing ? -1 : 1),
      }));
    } catch (cause) {
      Alert.alert('Follow update failed', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  async function openChat() {
    try {
      const conversationId = await getOrCreateDirectConversation(userId);
      navigation.navigate('Conversation', { conversationId, partnerId: userId });
    } catch (cause) {
      Alert.alert('Could not open chat', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  async function handleLike(post: FeedPost) {
    try {
      await togglePostLike(post.id, currentUserId, post.liked_by_me);
      await refreshProfile(currentUserId);
    } catch (cause) {
      Alert.alert('Like update failed', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  function confirmDeletePost(post: FeedPost) {
    Alert.alert('Delete this post?', 'This removes the post and its likes and comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete post',
        style: 'destructive',
        onPress: () => {
          void deletePost(post.id)
            .then(() => refreshProfile(currentUserId))
            .catch((cause: unknown) => {
              Alert.alert(
                'Could not delete post',
                cause instanceof Error ? cause.message : 'Try again.'
              );
            });
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#d9b867" />
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Profile unavailable</Text>
        <Text style={styles.error}>{error || 'This BRITUME profile is not available.'}</Text>
      </View>
    );
  }

  const displayName = profile.display_name?.trim() || 'BRITUME User';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>
            {profile.username ? `@${profile.username}` : 'BRITUME member'}
          </Text>
          <View style={styles.counts}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('FollowList', { userId, kind: 'followers' })}
              style={styles.countButton}
            >
              <Text style={styles.countValue}>{counts.followers}</Text>
              <Text style={styles.countLabel}>followers</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('FollowList', { userId, kind: 'following' })}
              style={styles.countButton}
            >
              <Text style={styles.countValue}>{counts.following}</Text>
              <Text style={styles.countLabel}>following</Text>
            </Pressable>
          </View>
          {!ownProfile && (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleFollow()}
                style={[styles.actionButton, isFollowing && styles.secondaryAction]}
              >
                <Text style={[styles.actionText, isFollowing && styles.secondaryActionText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void openChat()}
                style={[styles.actionButton, styles.secondaryAction]}
              >
                <Text style={[styles.actionText, styles.secondaryActionText]}>Message</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.postsHeading}>Posts</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>No posts yet.</Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onOpenProfile={(profileId) =>
                navigation.navigate('PublicProfile', { userId: profileId })
              }
              onLike={(selected) => void handleLike(selected)}
              onComment={(selected) => setSelectedPostId(selected.id)}
              onDelete={ownProfile ? confirmDeletePost : undefined}
            />
          ))
        )}
      </ScrollView>
      <CommentsModal
        visible={selectedPostId !== null}
        postId={selectedPostId}
        currentUserId={currentUserId}
        onClose={() => {
          setSelectedPostId(null);
          if (currentUserId) {
            void refreshProfile(currentUserId);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#070b12',
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#070b12',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarLetter: {
    color: '#090d15',
    fontSize: 28,
    fontWeight: '900',
  },
  displayName: {
    color: '#f4f6fa',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
  },
  username: {
    color: '#9ca8b8',
    fontSize: 13,
    marginTop: 4,
  },
  counts: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 18,
  },
  countButton: {
    alignItems: 'center',
    minWidth: 78,
    padding: 6,
  },
  countValue: {
    color: '#f4f6fa',
    fontSize: 17,
    fontWeight: '900',
  },
  countLabel: {
    color: '#8f9aab',
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  actionText: {
    color: '#090d15',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryAction: {
    backgroundColor: '#172233',
    borderColor: '#384b61',
    borderWidth: 1,
  },
  secondaryActionText: {
    color: '#d9b867',
  },
  postsHeading: {
    color: '#f4f6fa',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 20,
    fontWeight: '900',
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 13,
    lineHeight: 20,
  },
  error: {
    color: '#f18e8e',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
