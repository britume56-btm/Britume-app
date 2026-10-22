
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const CATEGORY_KEY = 'britume-living-categories-v1';

const DEFAULT_CATEGORIES = [
  'SOCIAL',
  'CHAT',
  'TECHNOLOGIES',
  'TV',
  'STUDIOS',
  'WEAR',
];

const CATEGORIES = [
  { id: 'SOCIAL', label: 'Social', icon: '👥' },
  { id: 'CHAT', label: 'Chat', icon: '💬' },
  { id: 'TECHNOLOGIES', label: 'Technology', icon: '⚡' },
  { id: 'TV', label: 'TV', icon: '▶️' },
  { id: 'STUDIOS', label: 'Studios', icon: '🎬' },
  { id: 'WEAR', label: 'Wear', icon: '👕' },
  { id: 'FOUNDATION', label: 'Foundation', icon: '◇' },
  { id: 'GAMES', label: 'Games', icon: '🎮' },
  { id: 'LABS', label: 'Labs', icon: '🧪' },
  { id: 'THEMES', label: 'Themes', icon: '🎨' },
  { id: 'GALLERY', label: 'Gallery', icon: '🖼️' },
  { id: 'NOTIFICATIONS', label: 'Notifications', icon: '🔔' },
  { id: 'PREMIUM', label: 'Premium', icon: '✦' },
  { id: 'SECURITY', label: 'Security', icon: '🔒' },
] as const;

export default function HomeScreen({ navigation }: any) {
  useAppTheme();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [categories, setCategories] =
    useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedMessage, setFeedMessage] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CATEGORY_KEY);

      if (!saved) {
        setCategories(DEFAULT_CATEGORIES);
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        setCategories(DEFAULT_CATEGORIES);
        return;
      }

      const valid = parsed.filter(
        (id): id is string =>
          typeof id === 'string' &&
          CATEGORIES.some((category) => category.id === id),
      );

      setCategories(valid.slice(0, 6));
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const loadFeed = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;

      if (!user) {
        setUserId(null);
        setAvatarUrl(null);
        setPosts([]);
        setFeedMessage('Sign in to see your BRITUME feed.');
        return;
      }

      setUserId(user.id);

      const metadata = user.user_metadata ?? {};
      const photo =
        metadata.avatar_url ??
        metadata.picture ??
        metadata.photo_url ??
        null;

      setAvatarUrl(typeof photo === 'string' ? photo : null);

      const result = await listFeed(user.id);
      setPosts(result);
      setFeedMessage(
        result.length === 0
          ? 'Your feed is ready. Share the first post!'
          : '',
      );
    } catch (error) {
      setFeedMessage(
        error instanceof Error
          ? error.message
          : 'Could not load your feed. Check your connection.',
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

    return () => data.subscription.unsubscribe();
  }, [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed(false);
      void loadCategories();
    }, [loadFeed, loadCategories]),
  );

  const publishPost = async () => {
    const content = draft.trim();

    if (!userId) {
      Alert.alert('Sign in required', 'Sign in to publish a post.');
      return;
    }

    if (!content) {
      Alert.alert('Write something', 'Enter text before publishing.');
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
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const openShortcut = (route: string) => {
    if (route === 'SOCIAL') {
      navigation.navigate('Social');
      return;
    }

    if (route === 'CHAT') {
      navigation.navigate('Chat');
      return;
    }

    if (route === 'GAMES') {
      navigation.navigate('Games');
      return;
    }

    if (route === 'THEMES') {
      navigation.navigate('Themes');
      return;
    }

    if (route === 'GALLERY') {
      navigation.navigate('Gallery');
      return;
    }

    if (route === 'NOTIFICATIONS') {
      navigation.navigate('Notifications');
      return;
    }

    if (route === 'PREMIUM') {
      navigation.navigate('Premium');
      return;
    }

    if (route === 'SECURITY') {
      navigation.navigate('Security');
      return;
    }

    if (route === 'LABS') {
      navigation.navigate('Labs');
      return;
    }

    if (
      route === 'TECHNOLOGIES' ||
      route === 'TV' ||
      route === 'STUDIOS' ||
      route === 'WEAR' ||
      route === 'FOUNDATION'
    ) {
      navigation.navigate('Module', { section: route });
    }
  };

  const openCreateMenu = () => {
    Alert.alert('Create on BRITUME', 'Choose what you want to create.', [
      {
        text: 'Text post',
        onPress: () => {
          if (!userId) {
            Alert.alert('Sign in required', 'Sign in to publish a post.');
            return;
          }
          Alert.alert('Create a post', 'Write your post in the Share something box.');
        },
      },
      {
        text: 'Photo or video',
        onPress: () =>
          Alert.alert(
            'Media posts',
            'Photo and video publishing need to be connected before they can be used here.',
          ),
      },
      {
        text: 'Advertisement',
        onPress: () =>
          Alert.alert(
            'Create an advertisement',
            'The advertisement creation and review flow has not been connected yet.',
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openPublicGroups = () => {
    // The current navigator has a Social screen, but no separate
    // Public Groups route has been confirmed.
    navigation.navigate('Social');
  };

  const openAuthor = (post: FeedPost) => {
    navigation.navigate('PublicProfile', { userId: post.author_id });
  };

  const formatDate = (date: string) => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';

    return value.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderAvatar = (size: number) => (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size * 0.34 },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarLetter, { fontSize: size * 0.48 }]}>
          B
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
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
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => navigation.navigate('PROFILE')}
          >
            {renderAvatar(48)}
          </Pressable>

          <View style={styles.brandArea}>
            <Text style={styles.brand}>BRITUME</Text>
            <Text style={styles.tagline}>See Beyond. Move Forward.</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create"
            onPress={openCreateMenu}
            style={styles.headerButton}
          >
            <Text style={styles.plusText}>+</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerButton}
          >
            <Text style={styles.headerIcon}>♧</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => navigation.navigate('SETTINGS')}
            style={styles.headerButton}
          >
            <Text style={styles.headerIcon}>⚙</Text>
          </Pressable>
        </View>

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

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Explore BRITUME</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ManageCategories')}
          >
            <Text style={styles.manageLink}>Manage</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutRow}
        >
          {categories.map((id) => {
            const item = CATEGORIES.find((category) => category.id === id);
            if (!item) return null;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.label}`}
                onPress={() => openShortcut(item.id)}
                style={({ pressed }) => [
                  styles.shortcut,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.shortcutIcon}>
                  <Text style={styles.shortcutEmoji}>{item.icon}</Text>
                </View>
                <Text numberOfLines={1} style={styles.shortcutLabel}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={openPublicGroups}
          style={({ pressed }) => [
            styles.groupsButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.groupsIcon}>
            <Text style={styles.groupsEmoji}>🌐</Text>
          </View>
          <View style={styles.groupsCopy}>
            <Text style={styles.groupsTitle}>Public Groups</Text>
            <Text style={styles.groupsSubtitle}>
              Find people and communities
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Share something</Text>
          <Text style={styles.sectionHint}>Your voice matters</Text>
        </View>

        <View style={styles.composerCard}>
          <View style={styles.composerHeader}>
            {renderAvatar(42)}
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
            <Text style={styles.characterCount}>{draft.length}/2000</Text>
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

        <View style={styles.feedHeading}>
          <View>
            <Text style={styles.sectionTitle}>Living Feed</Text>
            <Text style={styles.sectionHint}>
              Posts from you and people you follow
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh feed"
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
                  <Text style={styles.metric}>♡ {post.like_count} likes</Text>
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
  screen: { flex: 1, backgroundColor: PALE_BLUE },
  content: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 35 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 20,
  },
  avatar: {
    backgroundColor: '#DCEBFF',
    borderWidth: 1,
    borderColor: '#C9DFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { color: '#2F6BB4', fontWeight: '900' },
  brandArea: { flex: 1, marginLeft: 2 },
  brand: {
    color: '#183D70',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: { color: '#607A9B', fontSize: 9, marginTop: 3 },
  headerButton: {
    width: 32,
    height: 36,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderColor: '#D6E7FF',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { color: BLUE, fontSize: 25, fontWeight: '700', lineHeight: 28 },
  headerIcon: { color: '#42658F', fontSize: 18 },
  welcomeCard: {
    minHeight: 155,
    borderRadius: 27,
    backgroundColor: '#DCEBFF',
    borderColor: '#C8DFFF',
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
    overflow: 'hidden',
  },
  welcomeCopy: { flex: 1 },
  eyebrow: {
    color: '#477CC0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  welcomeTitle: {
    color: '#183D70',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  welcomeSubtitle: {
    color: '#55769D',
    fontSize: 12,
    marginTop: 9,
    maxWidth: 225,
    lineHeight: 18,
  },
  cloudIcon: { fontSize: 42, marginLeft: 4 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: { color: '#1D3B61', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#7186A2', fontSize: 11, marginTop: 4 },
  manageLink: { color: '#367CCF', fontSize: 12, fontWeight: '800' },
  shortcutRow: { gap: 9, paddingBottom: 4 },
  shortcut: {
    width: 76,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D8E8FB',
    paddingHorizontal: 4,
    paddingVertical: 9,
    elevation: 2,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#EDF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  shortcutEmoji: { fontSize: 21 },
  shortcutLabel: {
    color: '#355477',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  groupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 19,
    borderColor: '#D8E8FB',
    borderWidth: 1,
    padding: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  groupsIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#EDF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsEmoji: { fontSize: 22 },
  groupsCopy: { flex: 1, marginLeft: 11 },
  groupsTitle: { color: '#29466A', fontSize: 13, fontWeight: '800' },
  groupsSubtitle: { color: '#8495AB', fontSize: 11, marginTop: 4 },
  chevron: { color: BLUE, fontSize: 26, paddingHorizontal: 5 },
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
  composerIdentity: { marginLeft: 11 },
  composerTitle: { color: '#25466F', fontWeight: '800', fontSize: 14 },
  composerSubtitle: { color: '#8495AB', fontSize: 11, marginTop: 3 },
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
  characterCount: { color: '#8B9BB0', fontSize: 11 },
  publishButton: {
    minWidth: 105,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 17,
  },
  publishText: { color: WHITE, fontWeight: '800', fontSize: 13 },
  disabledButton: { opacity: 0.45 },
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
  refreshText: { color: BLUE, fontSize: 25 },
  statusCard: {
    minHeight: 110,
    borderRadius: 21,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
  },
  statusText: { color: '#7186A2', fontSize: 12 },
  emptyCard: {
    backgroundColor: WHITE,
    borderColor: '#D8E8FB',
    borderWidth: 1,
    borderRadius: 23,
    padding: 23,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyEmoji: { fontSize: 33, marginBottom: 10 },
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
  postAvatarLetter: { color: '#3674BF', fontWeight: '900', fontSize: 18 },
  authorDetails: { flex: 1, marginLeft: 10 },
  authorName: { color: '#29466A', fontSize: 13, fontWeight: '800' },
  postDate: { color: '#8B9BB0', fontSize: 10, marginTop: 3 },
  postMenu: { color: '#8195AE', fontSize: 17, letterSpacing: 2 },
  postBody: { color: '#334A65', fontSize: 14, lineHeight: 22 },
  postDivider: {
    height: 1,
    backgroundColor: '#E8F0FA',
    marginTop: 15,
    marginBottom: 11,
  },
  postMetrics: { flexDirection: 'row', gap: 19 },
  metric: { color: '#7186A2', fontSize: 11, fontWeight: '600' },
  inlineMessage: { color: '#7B8DA5', fontSize: 12, marginVertical: 8 },
  footerText: {
    color: '#8B9BB0',
    textAlign: 'center',
    fontSize: 10,
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
