
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../theme/AppThemeContext';
import {
  createPost,
  listFeed,
  type FeedPost,
} from '../../services/socialService';
import { supabase } from '../../../lib/supabase';

const BLUE = '#5598F5';
const PALE_BLUE = '#EAF3FF';
const WHITE = '#FFFFFF';

const SHORTCUTS = [
  { label: 'Social', icon: '👥', route: 'Social' },
  { label: 'Chat', icon: '💬', route: 'Chat' },
  { label: 'Technology', icon: '⚡', route: 'TECHNOLOGIES' },
  { label: 'TV', icon: '▶️', route: 'TV' },
  { label: 'Studios', icon: '🎬', route: 'STUDIOS' },
  { label: 'Wear', icon: '👕', route: 'WEAR' },
];

export default function HomeScreen({ navigation }: any) {
  const { palette } = useAppTheme();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedMessage, setFeedMessage] = useState('');

  const loadFeed = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;

      const user = data.user;

      if (!user) {
        setUserId(null);
        setPosts([]);
        setFeedMessage('Sign in to see your BRITUME feed.');
        return;
      }

      setUserId(user.id);

      const result = await listFeed(user.id);
      setPosts(result);
      setFeedMessage(
        result.length === 0
          ? 'Your feed is ready. Share the first post!'
          : ''
      );
    } catch (error) {
      setFeedMessage(
        error instanceof Error
          ? error.message
          : 'Could not load your feed. Check your connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadFeed(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed(false);
    }, [loadFeed])
  );

  const publishPost = async () => {
    const content = draft.trim();

    if (!userId) {
      Alert.alert('Sign in required', 'Sign in to publish a post.');
      return;
    }

    if (!content) {
      Alert.alert('Write something', 'Enter some text before publishing.');
      return;
    }

    if (content.length > 2000) {
      Alert.alert('Post too long', 'Posts can contain up to 2,000 characters.');
      return;
    }

    setPublishing(true);

    try {
      await createPost(userId, content);
      setDraft('');
      await loadFeed(false);
      Alert.alert('Published', 'Your post is now on your BRITUME feed.');
    } catch (error) {
      Alert.alert(
        'Could not publish',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const openShortcut = (route: string) => {
    if (route === 'Social' || route === 'Chat') {
      navigation.navigate(route);
      return;
    }

    if (route === 'TECHNOLOGIES' || route === 'TV' ||
        route === 'STUDIOS' || route === 'WEAR') {
      navigation.navigate('Module', { section: route });
      return;
    }
  };

  const openAuthor = (post: FeedPost) => {
    navigation.navigate('PublicProfile', {
      userId: post.author_id,
    });
  };

  const formatDate = (date: string) => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: PALE_BLUE }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={PALE_BLUE} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadFeed(false);
            }}
            tintColor={BLUE}
          />
        }
      >
        {/* BRITUME identity */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BRITUME</Text>
            <Text style={styles.tagline}>See Beyond. Move Forward.</Text>
          </View>

          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>B</Text>
          </View>
        </View>

        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>YOUR WORLD, CONNECTED</Text>
            <Text style={styles.welcomeTitle}>
              Make room for{'\n'}what matters.
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Discover, share and create with BRITUME.
            </Text>
          </View>
          <Text style={styles.cloudIcon}>☁️</Text>
        </View>

        {/* Six compact category shortcuts */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Explore BRITUME</Text>
          <Text style={styles.sectionHint}>Your spaces</Text>
        </View>

        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
              onPress={() => openShortcut(item.route)}
              style={({ pressed }) => [
                styles.shortcut,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.shortcutIcon}>
                <Text style={styles.shortcutEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Create post */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Share something</Text>
          <Text style={styles.sectionHint}>Your voice matters</Text>
        </View>

        <View style={styles.composerCard}>
          <View style={styles.composerHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>B</Text>
            </View>
            <View style={styles.composerIdentity}>
              <Text style={styles.composerTitle}>Create a post</Text>
              <Text style={styles.composerSubtitle}>
                What would you like to share?
              </Text>
            </View>
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write your thoughts here..."
            placeholderTextColor="#8495AB"
            multiline
            maxLength={2000}
            textAlignVertical="top"
            editable={Boolean(userId) && !publishing}
            style={styles.postInput}
            accessibilityLabel="Write a BRITUME post"
          />

          <View style={styles.composerFooter}>
            <Text style={styles.characterCount}>
              {draft.length}/2000
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={!userId || !draft.trim() || publishing}
              onPress={() => void publishPost()}
              style={({ pressed }) => [
                styles.publishButton,
                (!userId || !draft.trim() || publishing) &&
                  styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              {publishing ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Text style={styles.publishText}>Publish ↑</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Living feed */}
        <View style={styles.feedHeading}>
          <View>
            <Text style={styles.sectionTitle}>Living Feed</Text>
            <Text style={styles.sectionHint}>
              Posts from you and people you follow
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void loadFeed()}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>↻</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={BLUE} />
            <Text style={styles.statusText}>Loading your feed...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌤️</Text>
            <Text style={styles.emptyTitle}>A fresh start</Text>
            <Text style={styles.emptyMessage}>
              {feedMessage || 'No posts yet. Be the first to share!'}
            </Text>
          </View>
        ) : (
          posts.map((post) => {
            const author =
              post.author?.display_name ||
              post.author?.username ||
              'BRITUME member';

            return (
              <View key={post.id} style={styles.postCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openAuthor(post)}
                  style={styles.postAuthorRow}
                >
                  <View style={styles.postAvatar}>
                    <Text style={styles.postAvatarLetter}>
                      {author.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{author}</Text>
                    <Text style={styles.postDate}>
                      {formatDate(post.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.postMenu}>•••</Text>
                </Pressable>

                <Text style={styles.postBody}>{post.body}</Text>

                <View style={styles.postDivider} />

                <View style={styles.postMetrics}>
                  <Text style={styles.metric}>
                    ♡ {post.like_count} likes
                  </Text>
                  <Text style={styles.metric}>
                    ◯ {post.comment_count} comments
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {!loading && feedMessage && posts.length > 0 ? (
          <Text style={styles.inlineMessage}>{feedMessage}</Text>
        ) : null}

        <Text style={styles.footerText}>
          BRITUME · See Beyond. Move Forward.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    color: '#183D70',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: '#607A9B',
    fontSize: 12,
    marginTop: 3,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#D6E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  brandMarkText: {
    color: BLUE,
    fontSize: 28,
    fontWeight: '900',
  },
  welcomeCard: {
    minHeight: 165,
    borderRadius: 27,
    backgroundColor: '#DCEBFF',
    borderColor: '#C8DFFF',
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    overflow: 'hidden',
  },
  welcomeCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#477CC0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  welcomeTitle: {
    color: '#183D70',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    color: '#55769D',
    fontSize: 12,
    marginTop: 9,
    maxWidth: 225,
    lineHeight: 18,
  },
  cloudIcon: {
    fontSize: 47,
    marginLeft: 5,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#1D3B61',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#7186A2',
    fontSize: 11,
    marginTop: 4,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  shortcut: {
    width: '31.5%',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#D8E8FB',
    marginBottom: 9,
    paddingVertical: 12,
    elevation: 2,
  },
  shortcutIcon: {
    width: 47,
    height: 47,
    borderRadius: 17,
    backgroundColor: '#EDF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutEmoji: {
    fontSize: 23,
  },
  shortcutLabel: {
    color: '#355477',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  composerCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: '#D7E6F8',
    borderWidth: 1,
    borderRadius: 23,
    padding: 15,
    marginBottom: 25,
    elevation: 2,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#DCEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#2F6BB4',
    fontSize: 22,
    fontWeight: '900',
  },
  composerIdentity: {
    marginLeft: 11,
  },
  composerTitle: {
    color: '#25466F',
    fontWeight: '800',
    fontSize: 14,
  },
  composerSubtitle: {
    color: '#8495AB',
    fontSize: 11,
    marginTop: 3,
  },
  postInput: {
    minHeight: 100,
    maxHeight: 180,
    backgroundColor: '#F5F9FF',
    borderColor: '#E3EDF9',
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    color: '#243D5C',
    fontSize: 14,
    lineHeight: 21,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  characterCount: {
    color: '#8B9BB0',
    fontSize: 11,
  },
  publishButton: {
    minWidth: 105,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 17,
  },
  publishText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
  feedHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  refreshButton: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: WHITE,
    borderColor: '#D8E8FB',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: BLUE,
    fontSize: 25,
  },
  statusCard: {
    minHeight: 110,
    borderRadius: 21,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
  },
  statusText: {
    color: '#7186A2',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderColor: '#D8E8FB',
    borderWidth: 1,
    borderRadius: 23,
    padding: 23,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyEmoji: {
    fontSize: 33,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#294D78',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 7,
  },
  emptyMessage: {
    color: '#7C8EA5',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
  },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#D7E6F8',
    borderWidth: 1,
    borderRadius: 23,
    padding: 15,
    marginBottom: 13,
    elevation: 2,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#E5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarLetter: {
    color: '#3674BF',
    fontWeight: '900',
    fontSize: 18,
  },
  authorDetails: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    color: '#29466A',
    fontSize: 13,
    fontWeight: '800',
  },
  postDate: {
    color: '#8B9BB0',
    fontSize: 10,
    marginTop: 3,
  },
  postMenu: {
    color: '#8195AE',
    fontSize: 17,
    letterSpacing: 2,
  },
  postBody: {
    color: '#334A65',
    fontSize: 14,
    lineHeight: 22,
  },
  postDivider: {
    height: 1,
    backgroundColor: '#E8F0FA',
    marginTop: 15,
    marginBottom: 11,
  },
  postMetrics: {
    flexDirection: 'row',
    gap: 19,
  },
  metric: {
    color: '#7186A2',
    fontSize: 11,
    fontWeight: '600',
  },
  inlineMessage: {
    color: '#7B8DA5',
    fontSize: 12,
    marginVertical: 8,
  },
  footerText: {
    color: '#8B9BB0',
    textAlign: 'center',
    fontSize: 10,
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
