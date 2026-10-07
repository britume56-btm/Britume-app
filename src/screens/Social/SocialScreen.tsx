import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import CommentsModal from '../../components/social/CommentsModal';
import PostCard from '../../components/social/PostCard';
import type { RootStackParamList } from '../../navigation/types';
import {
  createPost,
  deletePost,
  ensureOwnPublicProfile,
  listFeed,
  searchPublicProfiles,
  setFollow,
  togglePostLike,
  updatePost,
  type DiscoverableProfile,
  type FeedPost,
} from '../../services/socialService';
import { getOrCreateDirectConversation } from '../../services/chatService';

type Props = NativeStackScreenProps<RootStackParamList, 'Social'>;
type FeedTab = 'feed' | 'discover';

export default function SocialScreen({ navigation }: Props) {
  const [currentUserId, setCurrentUserId] = useState('');
  const [tab, setTab] = useState<FeedTab>('feed');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [postDraft, setPostDraft] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [people, setPeople] = useState<DiscoverableProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const reloadFeed = useCallback(async (userId: string) => {
    setError(null);
    try {
      setPosts(await listFeed(userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your feed.');
    }
  }, []);

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
            setPosts(await listFeed(data.user.id));
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Could not load SOCIAL.');
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
    }, [])
  );

  async function refreshFeed() {
    if (!currentUserId) {
      return;
    }
    setRefreshing(true);
    await reloadFeed(currentUserId);
    setRefreshing(false);
  }

  function openComposer(post?: FeedPost) {
    setEditingPost(post ?? null);
    setPostDraft(post?.body ?? '');
    setComposerVisible(true);
  }

  async function savePost() {
    if (!postDraft.trim() || savingPost || !currentUserId) {
      return;
    }
    setSavingPost(true);
    setError(null);
    try {
      if (editingPost) {
        await updatePost(editingPost.id, postDraft);
      } else {
        await createPost(currentUserId, postDraft);
      }
      setComposerVisible(false);
      setEditingPost(null);
      setPostDraft('');
      await reloadFeed(currentUserId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your post.');
    } finally {
      setSavingPost(false);
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
            .then(() => reloadFeed(currentUserId))
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Could not delete the post.');
            });
        },
      },
    ]);
  }

  async function handleLike(post: FeedPost) {
    try {
      await togglePostLike(post.id, currentUserId, post.liked_by_me);
      await reloadFeed(currentUserId);
    } catch (cause) {
      Alert.alert('Like update failed', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  async function runSearch() {
    if (!currentUserId) {
      setSearchError('Your account is still loading. Try again in a moment.');
      return;
    }
    const query = searchText.trim();
    if (query.length < 2) {
      setPeople([]);
      setSearchError('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchPublicProfiles(query, currentUserId);
      setPeople(results.filter((profile) => profile.id !== currentUserId));
    } catch (cause) {
      setSearchError(cause instanceof Error ? cause.message : 'Could not search profiles.');
    } finally {
      setSearching(false);
    }
  }

  async function toggleFollow(profile: DiscoverableProfile) {
    try {
      await setFollow(currentUserId, profile.id, profile.isFollowing);
      setPeople((current) =>
        current.map((person) =>
          person.id === profile.id
            ? { ...person, isFollowing: !person.isFollowing }
            : person
        )
      );
      await reloadFeed(currentUserId);
    } catch (cause) {
      Alert.alert('Follow update failed', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  async function messageProfile(profileId: string) {
    try {
      const conversationId = await getOrCreateDirectConversation(profileId);
      navigation.navigate('Conversation', { conversationId, partnerId: profileId });
    } catch (cause) {
      Alert.alert('Could not open chat', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>BRITUME • SOCIAL</Text>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>Your people, your feed</Text>
            <Text style={styles.subtitle}>
              Posts from you and the people you follow.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshFeed()}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>{refreshing ? '…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'feed' }}
            onPress={() => setTab('feed')}
            style={[styles.tab, tab === 'feed' && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === 'feed' && styles.activeTabText]}>FEED</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'discover' }}
            onPress={() => setTab('discover')}
            style={[styles.tab, tab === 'discover' && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === 'discover' && styles.activeTabText]}>
              DISCOVER
            </Text>
          </Pressable>
        </View>

        {tab === 'feed' ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => openComposer()}
              style={styles.composePrompt}
            >
              <Text style={styles.composePromptText}>Share something with your people…</Text>
              <Text style={styles.composeAction}>Write a post</Text>
            </Pressable>

            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color="#d9b867" />
                <Text style={styles.muted}>Loading your feed…</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorTitle}>Your feed could not load</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refreshFeed()}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.emptyTitle}>Your feed is quiet for now.</Text>
                <Text style={styles.muted}>
                  Share your first post or discover people to follow. Their new posts will appear
                  here.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTab('discover')}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Find people</Text>
                </Pressable>
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
                  onEdit={(selected) => openComposer(selected)}
                  onDelete={confirmDeletePost}
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionIntro}>
              Find BRITUME members by username or display name. Phone numbers and private avatar
              files are never part of discovery.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                accessibilityLabel="Search BRITUME members"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={() => void runSearch()}
                returnKeyType="search"
                autoCapitalize="none"
                maxLength={80}
                placeholder="Username or display name"
                placeholderTextColor="#7d8797"
                style={styles.searchInput}
              />
              <Pressable
                accessibilityRole="button"
                disabled={searching}
                onPress={() => void runSearch()}
                style={[styles.searchButton, searching && styles.disabled]}
              >
                <Text style={styles.searchButtonText}>{searching ? '…' : 'Search'}</Text>
              </Pressable>
            </View>
            {searching && <ActivityIndicator color="#d9b867" style={styles.searchSpinner} />}
            {searchError && <Text style={styles.errorText}>{searchError}</Text>}
            {!searching && !searchError && people.length === 0 && searchText.trim().length >= 2 && (
              <Text style={styles.muted}>No matching profiles found.</Text>
            )}
            {people.map((profile) => (
              <View key={profile.id} style={styles.personCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('PublicProfile', { userId: profile.id })}
                  style={styles.personIdentity}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>
                      {(profile.display_name || profile.username || 'B').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.personCopy}>
                    <Text style={styles.personName}>
                      {profile.display_name || 'BRITUME User'}
                    </Text>
                    <Text style={styles.personHandle}>
                      {profile.username ? `@${profile.username}` : 'BRITUME member'}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.personActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={profile.isFollowing ? 'Unfollow' : 'Follow'}
                    onPress={() => void toggleFollow(profile)}
                    style={[styles.followButton, profile.isFollowing && styles.followingButton]}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        profile.isFollowing && styles.followingButtonText,
                      ]}
                    >
                      {profile.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${profile.display_name || profile.username || 'member'}`}
                    onPress={() => void messageProfile(profile.id)}
                    style={styles.messageButton}
                  >
                    <Text style={styles.messageButtonText}>Message</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={composerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.composer}>
            <Text style={styles.composerTitle}>{editingPost ? 'Edit your post' : 'New post'}</Text>
            <TextInput
              accessibilityLabel="Post text"
              value={postDraft}
              onChangeText={setPostDraft}
              placeholder="What would you like to share?"
              placeholderTextColor="#7d8797"
              maxLength={2000}
              multiline
              textAlignVertical="top"
              style={styles.postInput}
            />
            <Text style={styles.characterCount}>{postDraft.length}/2000</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setComposerVisible(false);
                  setError(null);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!postDraft.trim() || savingPost}
                onPress={() => void savePost()}
                style={[styles.primaryButton, (!postDraft.trim() || savingPost) && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {savingPost ? 'Saving…' : editingPost ? 'Save changes' : 'Share post'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CommentsModal
        visible={selectedPostId !== null}
        postId={selectedPostId}
        currentUserId={currentUserId}
        onClose={() => {
          setSelectedPostId(null);
          if (currentUserId) {
            void reloadFeed(currentUserId);
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
  kicker: {
    color: '#d9b867',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: '#9ca8b8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  smallButton: {
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginVertical: 17,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: '#d9b867',
  },
  tabText: {
    color: '#9ca8b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#090d15',
  },
  composePrompt: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  composePromptText: {
    color: '#9ca8b8',
    fontSize: 14,
  },
  composeAction: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 9,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
    padding: 20,
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyTitle: {
    color: '#f4f6fa',
    fontSize: 17,
    fontWeight: '800',
  },
  errorTitle: {
    color: '#f4f6fa',
    fontSize: 17,
    fontWeight: '800',
  },
  errorText: {
    color: '#f18e8e',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#090d15',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionIntro: {
    color: '#aab4c1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#101722',
    borderColor: '#2c3a4d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f6fa',
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: '#090d15',
    fontWeight: '800',
  },
  searchSpinner: {
    marginVertical: 14,
  },
  personCard: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 9,
    padding: 12,
  },
  personIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarLetter: {
    color: '#090d15',
    fontSize: 16,
    fontWeight: '900',
  },
  personCopy: {
    flex: 1,
  },
  personName: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '800',
  },
  personHandle: {
    color: '#8f9aab',
    fontSize: 12,
    marginTop: 3,
  },
  personActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  followButtonText: {
    color: '#090d15',
    fontSize: 12,
    fontWeight: '900',
  },
  followingButton: {
    backgroundColor: '#172233',
    borderColor: '#384b61',
    borderWidth: 1,
  },
  followingButtonText: {
    color: '#dce3ed',
  },
  messageButton: {
    alignItems: 'center',
    borderColor: '#384b61',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  messageButtonText: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  composer: {
    backgroundColor: '#101722',
    borderColor: '#384b61',
    borderRadius: 18,
    borderWidth: 1,
    padding: 17,
  },
  composerTitle: {
    color: '#f4f6fa',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 13,
  },
  postInput: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f6fa',
    minHeight: 160,
    padding: 12,
  },
  characterCount: {
    color: '#8f9aab',
    fontSize: 11,
    marginTop: 7,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#dfe5ee',
    fontSize: 12,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
});
