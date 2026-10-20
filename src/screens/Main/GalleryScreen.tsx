import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
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

function getKind(mime?: string | null, name = ''): Kind {
const type = (mime || '').toLowerCase();
const ext = name.split('.').pop()?.toLowerCase() || '';

if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'photo';
if (type.startsWith('video/') || ['mp4', 'mov', 'mkv', 'webm', '3gp'].includes(ext)) return 'video';
if (type.startsWith('audio/') || ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac'].includes(ext)) return 'music';
return 'file';
}

function GalleryVideo({ uri, palette }: { uri: string; palette: any }) {
const player = useVideoPlayer(uri, p => {
p.loop = false;
});

return (
<View style={styles.videoBox}>
<VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
</View>
);
}

export default function GalleryScreen({ navigation, route }: Props) {
const { palette, selectGalleryBackground } = useAppTheme();

const [items, setItems] = useState<GalleryItem[]>([]);
const [albums, setAlbums] = useState<string[]>(['All items']);
const [selectedAlbum, setSelectedAlbum] = useState('All items');
const [tab, setTab] = useState<Tab>(route.params?.selectForTheme ? 'photo' : 'all');
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
      if (Array.isArray(parsed)) setItems(parsed);
    }

    if (savedAlbums) {
      const parsed = JSON.parse(savedAlbums);
      if (Array.isArray(parsed) && parsed.length) setAlbums(parsed);
    }
  } catch {
    Alert.alert('Gallery', 'Some saved Gallery information could not be loaded.');
  } finally {
    if (active) setLoading(false);
  }
}

void load();
return () => { active = false; };

}, []);

const importFiles = useCallback(async () => {
try {
setBusy(true);

  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'video/*', 'audio/*', 'application/*', 'text/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return;

  const directory = `${FileSystem.documentDirectory}britume-gallery/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const added: GalleryItem[] = [];

  for (const asset of result.assets) {
    const id = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = asset.name.replace(/[^\w.\- ]/g, '_');
    const destination = `${directory}${id}-${safeName}`;

    await FileSystem.copyAsync({ from: asset.uri, to: destination });

    added.push({
      id,
      uri: destination,
      name: asset.name,
      kind: getKind(asset.mimeType, asset.name),
      hidden: false,
      album: selectedAlbum === 'All items' ? 'Unsorted' : selectedAlbum,
      mimeType: asset.mimeType,
    });
  }

  await persistItems([...added, ...items]);
  Alert.alert('BRITUME Gallery', `${added.length} item(s) imported into BRITUME.`);
} catch (error) {
  Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import these files.');
} finally {
  setBusy(false);
}

}, [items, persistItems, selectedAlbum]);

const loadDeviceMedia = useCallback(async () => {
try {
setBusy(true);
const permission = await MediaLibrary.requestPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Permission needed',
      'Allow BRITUME Gallery to access your selected device photos and videos.'
    );
    return;
  }

  const result = await MediaLibrary.getAssetsAsync({
    first: 100,
    mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
    sortBy: [MediaLibrary.SortBy.creationTime],
  });

  const existing = new Set(items.map(item => item.id));
  const deviceItems: GalleryItem[] = result.assets
    .filter(asset => !existing.has(`device-${asset.id}`))
    .map(asset => ({
      id: `device-${asset.id}`,
      uri: asset.uri,
      name: asset.filename || 'Media',
      kind: asset.mediaType === 'video' ? 'video' : 'photo',
      hidden: false,
      album: 'Device media',
      duration: asset.duration,
    }));

  await persistItems([...deviceItems, ...items]);
  Alert.alert('BRITUME Gallery', `Found ${deviceItems.length} new device item(s).`);
} catch (error) {
  Alert.alert('Could not load media', error instanceof Error ? error.message : 'Please try again.');
} finally {
  setBusy(false);
}

}, [items, persistItems]);

const authenticate = useCallback(async () => {
try {
const hardware = await LocalAuthentication.hasHardwareAsync();
const enrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hardware || !enrolled) {
    Alert.alert(
      'Biometrics unavailable',
      'Set up a fingerprint or other supported biometric lock on your phone to open Hidden items.'
    );
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock BRITUME Hidden Gallery',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  if (result.success) {
    setUnlocked(true);
    return true;
  }
} catch {
  Alert.alert('Unlock failed', 'Could not verify your identity.');
}

return false;

}, []);

const toggleHidden = useCallback(async (item: GalleryItem) => {
if (!item.hidden) {
const next = items.map(current =>
current.id === item.id ? { ...current, hidden: true } : current
);
await persistItems(next);
setSelected(null);
Alert.alert('Hidden', 'This item is now hidden in BRITUME Gallery.');
return;
}

const next = items.map(current =>
  current.id === item.id ? { ...current, hidden: false } : current
);
await persistItems(next);
setSelected(null);

}, [items, persistItems]);

const createAlbum = useCallback(async () => {
const name = albumName.trim();

if (!name) {
  Alert.alert('Album name', 'Enter a name for your album first.');
  return;
}

if (albums.some(album => album.toLowerCase() === name.toLowerCase())) {
  Alert.alert('Album exists', 'Choose a different album name.');
  return;
}

const next = [...albums.filter(album => album !== 'All items'), name];
setAlbums(['All items', ...next]);
await AsyncStorage.setItem(ALBUM_KEY, JSON.stringify(['All items', ...next]));
setSelectedAlbum(name);
setAlbumName('');
Alert.alert('Album created', `Created "${name}". New imports can be assigned to this album.`);

}, [albumName, albums]);

const assignToAlbum = useCallback(async (item: GalleryItem) => {
const choices = albums.filter(album => album !== 'All items');

if (!choices.length) {
  Alert.alert('No albums', 'Create an album first.');
  return;
}

Alert.alert('Move to album', 'Choose an album', [
  ...choices.map(album => ({
    text: album,
    onPress: () => {
      const next = items.map(current =>
        current.id === item.id ? { ...current, album } : current
      );
      void persistItems(next);
      setSelected(null);
    },
  })),
  { text: 'Cancel', style: 'cancel' },
]);

}, [albums, items, persistItems]);

const shareItem = useCallback(async (item: GalleryItem) => {
try {
if (!(await Sharing.isAvailableAsync())) {
Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
return;
}

  await Sharing.shareAsync(item.uri, {
    mimeType: item.mimeType || undefined,
    dialogTitle: `Share ${item.name}`,
  });
} catch (error) {
  Alert.alert('Share failed', error instanceof Error ? error.message : 'Could not share this item.');
}

}, []);

const saveToPhone = useCallback(async (item: GalleryItem) => {
try {
if (item.kind !== 'photo' && item.kind !== 'video') {
Alert.alert('Not supported yet', 'Saving documents and music to public phone folders needs a separate file-saving flow.');
return;
}

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow BRITUME to save media to your phone.');
    return;
  }

  await MediaLibrary.createAssetAsync(item.uri);
  Alert.alert('Saved', 'A copy was saved to your phone media library. Your BRITUME item remains available.');
} catch (error) {
  Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save this item.');
}

}, []);

const editPhoto = useCallback(async (item: GalleryItem) => {
if (item.kind !== 'photo') {
Alert.alert('Photo editing', 'Editing is currently available for photos only.');
return;
}

try {
  setBusy(true);
  const result = await ImageManipulator.manipulateAsync(
    item.uri,
    [{ rotate: 90 }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
  );

  const directory = `${FileSystem.documentDirectory}britume-gallery/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}edited-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: result.uri, to: destination });

  const edited: GalleryItem = {
    ...item,
    id: `edited-${Date.now()}`,
    uri: destination,
    name: `Edited ${item.name}`,
    hidden: false,
    album: item.album,
    mimeType: 'image/jpeg',
  };

  await persistItems([edited, ...items]);
  setSelected(edited);
  Alert.alert('Edited copy created', 'The original item was not changed.');
} catch (error) {
  Alert.alert('Edit failed', error instanceof Error ? error.message : 'Could not edit this photo.');
} finally {
  setBusy(false);
}

}, [items, persistItems]);

const removeFromBritume = useCallback((item: GalleryItem) => {
Alert.alert(
'Remove from BRITUME?',
'This removes the item from this Gallery list. It will not delete the original from your phone.',
[
{ text: 'Cancel', style: 'cancel' },
{
text: 'Remove',
style: 'destructive',
onPress: () => {
void (async () => {
const next = items.filter(current => current.id !== item.id);
await persistItems(next);

          if (item.id.startsWith('import-') || item.id.startsWith('edited-')) {
            try {
              if (item.uri.startsWith(FileSystem.documentDirectory || '')) {
                await FileSystem.deleteAsync(item.uri, { idempotent: true });
              }
            } catch {
              // The Gallery entry is removed even if cleanup of its private copy fails.
            }
          }

          setSelected(null);
        })();
      },
    },
  ]
);

}, [items, persistItems]);

const chooseWallpaper = useCallback((item: GalleryItem) => {
if (item.kind !== 'photo') {
Alert.alert('Wallpaper', 'Choose a photo to use as your theme background.');
return;
}

selectGalleryBackground(item.uri);
navigation.navigate('Themes');

}, [navigation, selectGalleryBackground]);

const visibleItems = useMemo(() => {
const query = search.trim().toLowerCase();

return items.filter(item => {
  if (tab === 'hidden' && !item.hidden) return false;
  if (tab !== 'hidden' && item.hidden) return false;
  if (tab !== 'all' && tab !== 'hidden' && item.kind !== tab) return false;
  if (selectedAlbum !== 'All items' && item.album !== selectedAlbum) return false;
  if (query && !item.name.toLowerCase().includes(query)) return false;
  return true;
});

}, [items, tab, selectedAlbum, search]);

const openItem = useCallback(async (item: GalleryItem) => {
if (item.hidden && !unlocked) {
if (!(await authenticate())) return;
}

if (route.params?.selectForTheme) {
  chooseWallpaper(item);
  return;
}

setSelected(item);

}, [authenticate, chooseWallpaper, route.params?.selectForTheme, unlocked]);

const renderItem = useCallback(({ item }: { item: GalleryItem }) => (
<Pressable
onPress={() => void openItem(item)}
style={[styles.tile, { borderColor: palette.border }]}
>
{item.kind === 'photo' ? (
<Image source={{ uri: item.uri }} style={styles.thumbnail} />
) : (
<View style={[styles.fileTile, { backgroundColor: palette.surface }]}>
<Text style={styles.fileEmoji}>
{item.kind === 'video' ? '▶️' : item.kind === 'music' ? '🎵' : '📄'}
</Text>
<Text numberOfLines={2} style={[styles.fileName, { color: palette.text }]}>
{item.name}
</Text>
</View>
)}
<Text numberOfLines={1} style={[styles.tileLabel, { color: palette.text }]}>
{item.name}
</Text>
</Pressable>
), [openItem, palette, styles]);

return (
<SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
<Action label="＋ Import files" onPress={() => void importFiles()} palette={palette} />
<Action label="▣ Scan device media" onPress={() => void loadDeviceMedia()} palette={palette} />
<Action label="＋ Album" onPress={() => {
Alert.prompt?.('New album', 'Enter an album name', setAlbumName);
}} palette={palette} />
</ScrollView>

  <View style={styles.albumCreate}>
    <TextInput
      value={albumName}
      onChangeText={setAlbumName}
      placeholder="New album name"
      placeholderTextColor={palette.muted}
      style={[styles.input, { color: palette.text, borderColor: palette.border }]}
    />
    <Pressable style={[styles.smallButton, { backgroundColor: palette.accent }]} onPress={() => void createAlbum()}>
      <Text style={{ color: '#071018', fontWeight: '800' }}>Create</Text>
    </Pressable>
  </View>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
    {TABS.map(entry => (
      <Pressable
        key={entry.key}
        onPress={() => {
          if (entry.key === 'hidden' && !unlocked) {
            void authenticate().then(ok => { if (ok) setTab('hidden'); });
          } else {
            setTab(entry.key);
          }
        }}
        style={[
          styles.tab,
          { borderColor: palette.border },
          tab === entry.key && { backgroundColor: palette.accent, borderColor: palette.accent },
        ]}
      >
        <Text style={{ color: tab === entry.key ? '#071018' : palette.text, fontWeight: '700' }}>
          {entry.key === 'hidden' ? '🔒 ' : ''}{entry.label}
        </Text>
      </Pressable>
    ))}
  </ScrollView>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
    {albums.map(album => (
      <Pressable
        key={album}
        onPress={() => setSelectedAlbum(album)}
        style={[
          styles.tab,
          { borderColor: palette.border },
          selectedAlbum === album && { backgroundColor: palette.surface },
        ]}
      >
        <Text style={{ color: palette.text }}>{album}</Text>
      </Pressable>
    ))}
  </ScrollView>

  <TextInput
    value={search}
    onChangeText={setSearch}
    placeholder="Search photos, videos, music and files"
    placeholderTextColor={palette.muted}
    style={[styles.input, styles.search, { color: palette.text, borderColor: palette.border }]}
  />

  {loading || busy ? (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={{ color: palette.muted, marginTop: 10 }}>
        {loading ? 'Loading BRITUME Gallery…' : 'Working…'}
      </Text>
    </View>
  ) : visibleItems.length === 0 ? (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>🗂️</Text>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>Your Gallery starts here</Text>
      <Text style={[styles.emptyText, { color: palette.muted }]}>
        Import photos, videos, music or documents, or scan your device media.
      </Text>
    </View>
  ) : (
    <FlatList
      data={visibleItems}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      numColumns={3}
      contentContainerStyle={styles.grid}
      keyboardShouldPersistTaps="handled"
    />
  )}

  {selected && (
    <View style={[styles.details, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.detailsHeader}>
        <Text numberOfLines={1} style={[styles.detailsTitle, { color: palette.text }]}>
          {selected.name}
        </Text>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={{ color: palette.accent, fontWeight: '800' }}>Close ✕</Text>
        </Pressable>
      </View>

      {selected.kind === 'photo' ? (
        <Image source={{ uri: selected.uri }} resizeMode="contain" style={styles.preview} />
      ) : selected.kind === 'video' ? (
        <GalleryVideo uri={selected.uri} palette={palette} />
      ) : (
        <Text style={{ color: palette.muted, paddingVertical: 12 }}>
          {selected.kind === 'music' ? '🎵 Audio file selected' : '📄 Document selected'}
        </Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
        <Action label={selected.hidden ? 'Unhide' : 'Hide'} onPress={() => void toggleHidden(selected)} palette={palette} />
        <Action label="Share" onPress={() => void shareItem(selected)} palette={palette} />
        <Action label="Save to phone" onPress={() => void saveToPhone(selected)} palette={palette} />
        <Action label="Edit / rotate" onPress={() => void editPhoto(selected)} palette={palette} />
        <Action label="Album" onPress={() => void assignToAlbum(selected)} palette={palette} />
        <Action label="Wallpaper" onPress={() => chooseWallpaper(selected)} palette={palette} />
        <Action label="Remove" onPress={() => removeFromBritume(selected)} palette={palette} />
      </ScrollView>
    </View>
  )}
</SafeAreaView>

);
}

function Action({ label, onPress, palette }: {
label: string;
onPress: () => void;
palette: { surface: string; text: string; border: string; accent: string };
}) {
return (
<Pressable
onPress={onPress}
style={{
paddingHorizontal: 13,
paddingVertical: 10,
marginRight: 8,
borderRadius: 12,
borderWidth: 1,
borderColor: palette.border,
backgroundColor: palette.surface,
}}
>
<Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text>
</Pressable>
);
}

function makeStyles(palette: {
background: string;
surface: string;
text: string;
muted: string;
accent: string;
border: string;
}) {
return StyleSheet.create({
screen: { flex: 1 },
actionRow: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
albumCreate: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, alignItems: 'center' },
input: {
flex: 1,
borderWidth: 1,
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 10,
minHeight: 42,
},
smallButton: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12 },
tabs: { paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center' },
tab: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderRadius: 18, marginRight: 8 },
search: { marginHorizontal: 12, marginVertical: 6, flex: 0, },
grid: { paddingHorizontal: 7, paddingBottom: 260 },
tile: { flex: 1, margin: 5, maxWidth: '31%', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
thumbnail: { width: '100%', aspectRatio: 1, backgroundColor: '#151515' },
fileTile: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 5 },
fileEmoji: { fontSize: 28, marginBottom: 5 },
fileName: { fontSize: 10, textAlign: 'center' },
tileLabel: { fontSize: 11, padding: 6 },
loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 10 },
emptyText: { textAlign: 'center', marginTop: 8, lineHeight: 20 },
details: { position: 'absolute', left: 8, right: 8, bottom: 8, borderWidth: 1, borderRadius: 18, paddingBottom: 8, maxHeight: '72%' },
detailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, gap: 10 },
detailsTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
preview: { width: '100%', height: 230, backgroundColor: '#080808' },
videoBox: { width: '100%', height: 230, backgroundColor: '#080808' },
video: { width: '100%', height: '100%' },
});
}
