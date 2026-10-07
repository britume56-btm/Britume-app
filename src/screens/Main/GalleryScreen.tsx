import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

export default function GalleryScreen({ navigation, route }: Props) {
  const { palette, selectGalleryBackground } = useAppTheme();
  const [assets, setAssets] = useState<ImagePickerAsset[]>([]);
  const [error, setError] = useState('');

  async function openLibrary() {
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted && permission.accessPrivileges !== 'limited') {
        setError('Allow photo-library access in your device settings to select media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.85,
      });
      if (!result.canceled) {
        setAssets(result.assets);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The media library could not be opened.');
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
        Choose photos or videos from your device. BRITUME only sees items you select; your device’s
        permission controls what is available.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void openLibrary()}
        style={[styles.button, { backgroundColor: palette.accent }]}
      >
        <Text style={styles.buttonText}>{assets.length ? 'Choose different media' : 'Open device gallery'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {assets.length ? (
        <View style={styles.grid}>
          {assets.map((asset, index) => (
            <View
              key={`${asset.assetId ?? asset.uri}-${index}`}
              style={[styles.mediaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              {asset.type === 'image' ? (
                <Image source={{ uri: asset.uri }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.videoPreview, { backgroundColor: palette.background }]}>
                  <Text style={[styles.videoLabel, { color: palette.accent }]}>VIDEO</Text>
                </View>
              )}
              <Text numberOfLines={1} style={[styles.mediaName, { color: palette.text }]}>
                {asset.fileName || (asset.type === 'video' ? 'Selected video' : 'Selected photo')}
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
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Your selected media appears here</Text>
          <Text style={[styles.body, { color: palette.muted }]}>
            Pick media above to preview it or send a photo to Themes as a background.
          </Text>
        </View>
      )}
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
  error: { color: '#f18e8e', fontSize: 13, lineHeight: 19, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  mediaCard: { borderRadius: 13, borderWidth: 1, overflow: 'hidden', padding: 9, width: '48%' },
  thumbnail: { aspectRatio: 1, borderRadius: 8, width: '100%' },
  videoPreview: { alignItems: 'center', aspectRatio: 1, borderRadius: 8, justifyContent: 'center' },
  videoLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  mediaName: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  useButton: { paddingVertical: 9 },
  useText: { fontSize: 11, fontWeight: '800' },
  empty: { borderRadius: 14, borderWidth: 1, marginTop: 16, padding: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
});
