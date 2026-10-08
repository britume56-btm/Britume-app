import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

function GalleryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (createdPlayer) => {
    createdPlayer.loop = false;
  });
  return <VideoView player={player} nativeControls contentFit="contain" style={styles.fullVideo} />;
}

export default function GalleryScreen({ navigation, route }: Props) {
  const { palette, selectGalleryBackground } = useAppTheme();
  const [assets, setAssets] = useState<ImagePickerAsset[]>([]);
  const [viewer, setViewer] = useState<ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function openLibrary() {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.85,
      });
      if (!result.canceled) {
        setAssets(result.assets);
        setNotice(`${result.assets.length} item${result.assets.length === 1 ? '' : 's'} selected on this device. Nothing was uploaded.`);
      } else {
        setNotice('Selection cancelled. Your previous selection is unchanged.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The media library could not be opened.');
    } finally {
      setLoading(false);
    }
  }

  function useAsThemeBackground(asset: ImagePickerAsset) {
    if (asset.type !== 'image') {
      setError('Choose a photo to use as a theme background.');
      return;
    }
    selectGalleryBackground(asset.uri);
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • MEDIA</Text>
      <Text style={[styles.title, { color: palette.text }]}>Gallery</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        Browse photos and videos from your device. Only selected items are shown here; media stays
        on your device unless you choose a photo as a theme wallpaper, which Themes uploads to your
        private account storage when you save it.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => void openLibrary()}
        style={[styles.button, { backgroundColor: palette.accent }, loading && styles.disabled]}
      >
        {loading ? <ActivityIndicator color="#090d15" /> : <Text style={styles.buttonText}>{assets.length ? 'Choose different media' : 'Open device gallery'}</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={[styles.notice, { color: palette.muted }]}>{notice}</Text> : null}
      {assets.length ? (
        <>
          <View style={styles.selectionActions}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{assets.length} selected</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAssets([]);
                setViewer(null);
                setNotice('Selection cleared. Your device files were not changed.');
              }}
            >
              <Text style={[styles.clearText, { color: palette.accent }]}>Clear selection</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
          {assets.map((asset, index) => (
            <View
              key={`${asset.assetId ?? asset.uri}-${index}`}
              style={[styles.mediaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview ${asset.fileName || asset.type || 'media item'}`}
                onPress={() => setViewer(asset)}
              >
                {asset.type === 'image' ? (
                  <Image source={{ uri: asset.uri }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.videoPreview, { backgroundColor: palette.background }]}>
                    <Text style={[styles.videoLabel, { color: palette.accent }]}>▶ VIDEO</Text>
                    <Text style={[styles.videoHint, { color: palette.muted }]}>Tap to play</Text>
                  </View>
                )}
              </Pressable>
              <Text numberOfLines={1} style={[styles.mediaName, { color: palette.text }]}>
                {asset.fileName || (asset.type === 'video' ? 'Selected video' : 'Selected photo')}
              </Text>
              <Text style={[styles.mediaDetails, { color: palette.muted }]}>
                {asset.type === 'video' ? 'Video' : 'Photo'}
                {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                {asset.fileSize ? ` · ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
                {asset.duration ? ` · ${Math.round(asset.duration / 1000)} sec` : ''}
              </Text>
              {route.params?.selectForTheme ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={asset.type !== 'image'}
                  onPress={() => useAsThemeBackground(asset)}
                  style={styles.useButton}
                >
                  <Text style={[styles.useText, { color: asset.type === 'image' ? palette.accent : palette.muted }]}>
                    {asset.type === 'image' ? 'Use as theme background' : 'Photos only'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setAssets((current) => current.filter((_, assetIndex) => assetIndex !== index))}
                style={styles.removeButton}
              >
                <Text style={[styles.removeText, { color: palette.muted }]}>Remove from selection</Text>
              </Pressable>
            </View>
          ))}
          </View>
        </>
      ) : (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Your selected media appears here</Text>
          <Text style={[styles.body, { color: palette.muted }]}>
            Pick media above to preview it or send a photo to Themes as a background.
          </Text>
        </View>
      )}
      <Modal
        visible={viewer !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewer(null)}
      >
        <View style={[styles.viewer, { backgroundColor: '#05080d' }]}>
          <View style={styles.viewerHeader}>
            <Text numberOfLines={1} style={styles.viewerTitle}>{viewer?.fileName || 'Selected media'}</Text>
            <Pressable accessibilityRole="button" onPress={() => setViewer(null)}>
              <Text style={[styles.closeText, { color: palette.accent }]}>Close</Text>
            </Pressable>
          </View>
          {viewer?.type === 'video' ? (
            <GalleryVideo uri={viewer.uri} />
          ) : viewer ? (
            <Image source={{ uri: viewer.uri }} resizeMode="contain" style={styles.fullImage} />
          ) : null}
          {viewer ? (
            <Text style={styles.viewerDetails}>
              {viewer.width}×{viewer.height}
              {viewer.fileSize ? ` · ${(viewer.fileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
              {viewer.duration ? ` · ${Math.round(viewer.duration / 1000)} sec` : ''}
            </Text>
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  button: { alignItems: 'center', borderRadius: 11, justifyContent: 'center', minHeight: 46, padding: 12 },
  buttonText: { color: '#090d15', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  error: { color: '#f18e8e', fontSize: 13, lineHeight: 19, marginTop: 12 },
  settingsLink: { alignSelf: 'flex-start', marginTop: 7 },
  notice: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  selectionActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  clearText: { fontSize: 12, fontWeight: '800', padding: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  mediaCard: { borderRadius: 13, borderWidth: 1, overflow: 'hidden', padding: 9, width: '48%' },
  thumbnail: { aspectRatio: 1, borderRadius: 8, width: '100%' },
  videoPreview: { alignItems: 'center', aspectRatio: 1, borderRadius: 8, justifyContent: 'center' },
  videoLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  videoHint: { fontSize: 10, marginTop: 6 },
  mediaName: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  mediaDetails: { fontSize: 10, lineHeight: 14, marginTop: 4 },
  useButton: { paddingVertical: 9 },
  useText: { fontSize: 11, fontWeight: '800' },
  removeButton: { borderTopColor: '#263247', borderTopWidth: 1, marginTop: 4, paddingTop: 8 },
  removeText: { fontSize: 10, fontWeight: '700' },
  empty: { borderRadius: 14, borderWidth: 1, marginTop: 16, padding: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  viewer: { flex: 1, justifyContent: 'center', padding: 14 },
  viewerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  viewerTitle: { color: '#f4f6fa', flex: 1, fontSize: 14, fontWeight: '800' },
  closeText: { fontSize: 13, fontWeight: '800', padding: 8 },
  fullImage: { flex: 1, width: '100%' },
  fullVideo: { alignSelf: 'center', height: '70%', width: '100%' },
  viewerDetails: { color: '#c5ccd7', fontSize: 11, paddingVertical: 10, textAlign: 'center' },
});
