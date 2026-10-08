import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { VideoSource } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  isModuleContentSection,
  isOfflineVideoUrl,
  isPlayableVideoUrl,
  matchesModulePost,
  OFFLINE_VIDEO_KEY_PREFIX,
} from '../../services/contentRules.mjs';
import {
  createModulePost,
  deleteModulePost,
  listModulePosts,
  type ModulePost,
  type ModuleSection,
} from '../../services/moduleContentService';
import { useAppTheme } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Module'>;
type ReadySection = ModuleSection;

const sectionCopy: Record<ReadySection, { title: string; intro: string; add: string }> = {
  TV: {
    title: 'Shorts & video',
    intro: 'Share a direct MP4 or HLS video link. MP4 videos can be saved on this device.',
    add: 'Post a video',
  },
  TECHNOLOGIES: {
    title: 'Technology & ideas',
    intro: 'Share technology, business, and news updates with the BRITUME community.',
    add: 'Write an update',
  },
  STUDIOS: {
    title: 'Creator stories',
    intro: 'Find and share music, drama, and other creator work.',
    add: 'Share creator work',
  },
  WEAR: {
    title: 'Brands & products',
    intro: 'Share a product or brand update with a description, price, and optional link.',
    add: 'Post a product',
  },
  FOUNDATION: {
    title: 'Community',
    intro: 'Share updates and activities from the BRITUME community.',
    add: 'Share an update',
  },
};

function VideoPost({
  source,
}: {
  source: string;
}) {
  const player = useVideoPlayer(source as VideoSource, (createdPlayer) => {
    createdPlayer.loop = false;
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={styles.video}
    />
  );
}

export default function ModuleScreen({ route }: Props) {
  const { palette } = useAppTheme();
  const { section } = route.params;
  const [posts, setPosts] = useState<ModulePost[]>([]);
  const [offlineUris, setOfflineUris] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerVisible, setComposerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ title: string; uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const copy = isModuleContentSection(section) ? sectionCopy[section] : null;

  const loadPosts = useCallback(async () => {
    if (!copy || !isModuleContentSection(section)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await listModulePosts(section);
      setPosts(rows);
      if (section === 'TV') {
        const entries = await Promise.all(
          rows.map(async (post) => {
            const uri = await AsyncStorage.getItem(`${OFFLINE_VIDEO_KEY_PREFIX}${post.id}`);
            if (uri && new File(uri).exists) {
              return [post.id, uri] as const;
            }
            return null;
          })
        );
        setOfflineUris(Object.fromEntries(entries.filter((entry) => entry !== null)));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this section.');
    } finally {
      setLoading(false);
    }
  }, [copy, section]);

  useFocusEffect(
    useCallback(() => {
      void loadPosts();
    }, [loadPosts])
  );

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => matchesModulePost(post, query));
  }, [posts, query]);

  function resetComposer() {
    setTitle('');
    setBody('');
    setMediaUrl('');
    setPriceLabel('');
    setComposerVisible(false);
  }

  async function publishPost() {
    if (!copy || !isModuleContentSection(section) || saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createModulePost({
        section,
        title,
        body,
        mediaUrl,
        priceLabel: section === 'WEAR' ? priceLabel : '',
      });
      resetComposer();
      await loadPosts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish this post.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(post: ModulePost) {
    Alert.alert('Delete this post?', 'This removes the post from this section.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteModulePost(post.id)
            .then(loadPosts)
            .catch((cause: unknown) =>
              setError(cause instanceof Error ? cause.message : 'Could not delete this post.')
            );
        },
      },
    ]);
  }

  async function saveOffline(post: ModulePost) {
    if (!post.media_url || !isOfflineVideoUrl(post.media_url)) {
      Alert.alert('MP4 link required', 'Offline saving currently supports direct MP4 video links.');
      return;
    }
    setDownloadingId(post.id);
    try {
      const folder = new Directory(Paths.document, 'britume-offline-tv');
      folder.create({ idempotent: true, intermediates: true });
      const downloaded = await File.downloadFileAsync(
        post.media_url,
        new File(folder, `${post.id}.mp4`),
        { idempotent: true }
      );
      await AsyncStorage.setItem(`${OFFLINE_VIDEO_KEY_PREFIX}${post.id}`, downloaded.uri);
      setOfflineUris((current) => ({ ...current, [post.id]: downloaded.uri }));
    } catch (cause) {
      Alert.alert(
        'Download failed',
        cause instanceof Error ? cause.message : 'This video could not be downloaded.'
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (!copy) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • {section}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{section}</Text>
        <Text style={[styles.body, { color: palette.muted }]}>
          This section is connected to BRITUME navigation and is not part of this release.
          Your account, profile, and app lock remain available.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • {section}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
        <Text style={[styles.body, { color: palette.muted }]}>{copy.intro}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setComposerVisible(true)}
          style={[styles.primaryButton, { backgroundColor: palette.accent }]}
        >
          <Text style={styles.primaryButtonText}>{copy.add}</Text>
        </Pressable>
        <TextInput
          accessibilityLabel={`Search ${section}`}
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${section.toLowerCase()}`}
          placeholderTextColor="#7d8797"
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        />
        {loading ? (
          <View style={[styles.stateBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.muted, { color: palette.muted }]}>Loading posts…</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadPosts()} style={[styles.secondaryButton, { borderColor: palette.border }]}>
              <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Try again</Text>
            </Pressable>
          </View>
        ) : visiblePosts.length === 0 ? (
          <View style={[styles.stateBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.postTitle, { color: palette.text }]}>{query ? 'No matching posts' : 'Nothing here yet'}</Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              {query ? 'Try another search.' : `Be the first to share something in ${section}.`}
            </Text>
          </View>
        ) : (
          visiblePosts.map((post) => {
            const videoUrl = post.media_url ?? '';
            const isVideoFile = isPlayableVideoUrl(videoUrl);
            const playableSource = offlineUris[post.id] ?? videoUrl;
            return (
              <View key={post.id} style={[styles.postCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.postHeader}>
                  <View style={styles.postAuthor}>
                      <Text style={[styles.authorName, { color: palette.text }]}>
                      {post.author?.display_name || post.author?.username || 'BRITUME member'}
                    </Text>
                    {post.author?.username ? (
                      <Text style={[styles.authorHandle, { color: palette.muted }]}>@{post.author.username}</Text>
                    ) : null}
                  </View>
                  {post.author_id === post.current_user_id ? (
                    <Pressable accessibilityRole="button" onPress={() => confirmDelete(post)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.postTitle, { color: palette.text }]}>{post.title}</Text>
                {post.price_label ? <Text style={[styles.price, { color: palette.accent }]}>{post.price_label}</Text> : null}
                <Text style={[styles.postBody, { color: palette.muted }]}>{post.body}</Text>
                {section === 'TV' && videoUrl && isVideoFile ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setActiveVideo({ title: post.title, uri: playableSource })}
                      style={styles.linkButton}
                    >
                      <Text style={[styles.linkButtonText, { color: palette.accent }]}>Watch video</Text>
                    </Pressable>
                    {Platform.OS !== 'web' && isOfflineVideoUrl(videoUrl) ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={downloadingId === post.id}
                        onPress={() => void saveOffline(post)}
                        style={[styles.offlineButton, { borderColor: palette.border }]}
                      >
                          <Text style={[styles.offlineButtonText, { color: palette.accent }]}>
                          {downloadingId === post.id
                            ? 'Downloading…'
                            : offlineUris[post.id]
                              ? 'Saved offline · download again'
                              : 'Save offline'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : post.media_url ? (
                  <Pressable
                    accessibilityRole="link"
                  onPress={() => void Linking.openURL(post.media_url!)}
                    style={styles.linkButton}
                  >
                    <Text style={[styles.linkButtonText, { color: palette.accent }]}>
                      {section === 'TV' ? 'Open video link' : 'Open link'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={composerVisible}
        transparent
        animationType="slide"
        onRequestClose={resetComposer}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.composerTitle, { color: palette.text }]}>{copy.add}</Text>
            <TextInput
              accessibilityLabel="Post title"
              value={title}
              onChangeText={setTitle}
              placeholder={section === 'WEAR' ? 'Product or brand name' : 'Title'}
              placeholderTextColor="#7d8797"
              maxLength={120}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            {section === 'WEAR' ? (
              <TextInput
                accessibilityLabel="Product price"
                value={priceLabel}
                onChangeText={setPriceLabel}
                placeholder="Price (optional)"
                placeholderTextColor="#7d8797"
                maxLength={50}
                style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
              />
            ) : null}
            <TextInput
              accessibilityLabel="Post description"
              value={body}
              onChangeText={setBody}
              placeholder="Add a description"
              placeholderTextColor="#7d8797"
              maxLength={4000}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.bodyInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            <TextInput
              accessibilityLabel={section === 'TV' ? 'Direct video URL' : 'Content link'}
              value={mediaUrl}
              onChangeText={setMediaUrl}
              placeholder={section === 'TV' ? 'Direct MP4 or HLS video URL' : 'Link (optional)'}
              placeholderTextColor="#7d8797"
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={resetComposer} style={[styles.secondaryButton, { borderColor: palette.border }]}>
                <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!title.trim() || !body.trim() || saving}
                onPress={() => void publishPost()}
                style={[styles.primaryButton, { backgroundColor: palette.accent }, (!title.trim() || !body.trim() || saving) && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>{saving ? 'Publishing…' : 'Publish'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeVideo !== null}
        animationType="slide"
        onRequestClose={() => setActiveVideo(null)}
      >
        <View style={[styles.videoModal, { backgroundColor: palette.background }]}>
          <View style={styles.videoModalHeader}>
            <Text numberOfLines={1} style={[styles.videoModalTitle, { color: palette.text }]}>
              {activeVideo?.title ?? 'BRITUME TV'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setActiveVideo(null)}>
              <Text style={[styles.closeText, { color: palette.accent }]}>Close</Text>
            </Pressable>
          </View>
          {activeVideo ? <VideoPost source={activeVideo.uri} /> : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070b12',
    padding: 20,
    paddingBottom: 40,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#c5ccd7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#101722',
    borderColor: '#2c3a4d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f6fa',
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  bodyInput: {
    minHeight: 110,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 11,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#090d15',
    fontSize: 13,
    fontWeight: '900',
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
    color: '#f4f6fa',
    fontSize: 12,
    fontWeight: '800',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    padding: 18,
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#f18e8e',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  postCard: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postAuthor: {
    flex: 1,
  },
  authorName: {
    color: '#f4f6fa',
    fontSize: 13,
    fontWeight: '800',
  },
  authorHandle: {
    color: '#8f9aab',
    fontSize: 11,
    marginTop: 2,
  },
  deleteText: {
    color: '#f18e8e',
    fontSize: 12,
    fontWeight: '700',
    padding: 8,
  },
  postTitle: {
    color: '#f4f6fa',
    fontSize: 17,
    fontWeight: '800',
  },
  price: {
    color: '#d9b867',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  postBody: {
    color: '#c5ccd7',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  video: {
    backgroundColor: '#05080d',
    borderRadius: 12,
    height: 220,
    marginTop: 13,
    overflow: 'hidden',
    width: '100%',
  },
  videoModal: {
    backgroundColor: '#070b12',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  videoModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  videoModalTitle: {
    color: '#f4f6fa',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  closeText: {
    color: '#d9b867',
    fontSize: 13,
    fontWeight: '800',
    padding: 8,
  },
  offlineButton: {
    alignSelf: 'flex-start',
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  offlineButtonText: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '800',
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 11,
    paddingVertical: 5,
  },
  linkButtonText: {
    color: '#d9b867',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  composer: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  composerTitle: {
    color: '#f4f6fa',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 3,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  disabled: {
    opacity: 0.55,
  },
});