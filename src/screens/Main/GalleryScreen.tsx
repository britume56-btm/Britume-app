import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;
type Kind = 'photo' | 'video' | 'music' | 'file';
type Tab = 'all' | Kind | 'hidden';

type GalleryItem = {
  id: string;
  uri: string;
  name: string;
  kind: Kind;
  hidden: boolean;
  album: string;
  mimeType?: string | null;
  duration?: number;
};

const STORAGE_KEY = 'britume-gallery-items-v1';
const ALBUM_KEY = 'britume-gallery-albums-v1';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photo', label: 'Photos' },
  { key: 'video', label: 'Videos' },
  { key: 'music', label: 'Music' },
  { key: 'file', label: 'Files' },
  { key: 'hidden', label: 'Hidden' },
];

const VIDEO_STYLES = StyleSheet.create({
  videoBox: {
    width: '100%',
    height: 230,
    backgroundColor: '#080808',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

function getKind(mime?: string | null, name = ''): Kind {
  const type = (mime || '').toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (
    type.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)
  ) {
    return 'photo';
  }

  if (
    type.startsWith('video/') ||
    ['mp4', 'mov', 'mkv', 'webm', '3gp'].includes(ext)
  ) {
    return 'video';
  }

  if (
    type.startsWith('audio/') ||
    ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac'].includes(ext)
  ) {
    return 'music';
  }

  return 'file';
}

function GalleryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
  });

  return (
    <View style={VIDEO_STYLES.videoBox}>
      <VideoView
        player={player}
        style={VIDEO_STYLES.video}
        nativeControls
        contentFit="contain"
      />
    </View>
  );
}

export default function GalleryScreen({ navigation, route }: Props) {
  const { palette, selectGalleryBackground } = useAppTheme();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<string[]>(['All items']);
  const [selectedAlbum, setSelectedAlbum] = useState('All items');
  const [tab, setTab] = useState<Tab>(
    route.params?.selectForTheme ? 'photo' : 'all'
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const styles = useMemo(() => makeStyles(palette), [palette]);

  const persistItems = useCallback(async (next: GalleryItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Load saved Gallery items and albums.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [savedItems, savedAlbums] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ALBUM_KEY),
        ]);

        if (!active) return;

        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }

        if (savedAlbums) {
          const parsed = JSON.parse(savedAlbums);
          if (Array.isArray(parsed) && parsed.length) {
            setAlbums(parsed);
          }
        }
      } catch {
        Alert.alert(
          'Gallery',
          'Some saved Gallery information could not be loaded.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  // Security: lock Hidden Gallery and close previews when BRITUME
  // leaves the foreground. The user must authenticate again to reopen Hidden.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setUnlocked(false);
        setSelected(null);
        setTab(current => (current === 'hidden' ? 'all' : current));
      }
    });

    return () => subscription.remove();
  }, []);

  // Import documents
