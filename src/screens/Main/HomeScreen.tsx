import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeContext';
import { useCategoryStore } from '../../store/useCategoryStore';

type CategoryInfo = { name: string; icon: string };
const CATEGORY_MAP: Record<string, CategoryInfo> = {
  SOCIAL: { name: 'Social', icon: '👥' }, CHAT: { name: 'Chat', icon: '💬' }, TECHNOLOGIES: { name: 'Technology', icon: '⚡' },
  TV: { name: 'TV', icon: '▶️' }, STUDIOS: { name: 'Studios', icon: '🎬' }, WEAR: { name: 'Wear', icon: '👕' },
  GAMES: { name: 'Games', icon: '🎮' }, FOUNDATION: { name: 'Foundation', icon: '◇' }, LABS: { name: 'Labs', icon: '🧪' },
  THEMES: { name: 'Themes', icon: '🎨' }, GALLERY: { name: 'Gallery', icon: '🖼️' }, NOTIFICATIONS: { name: 'Notifications', icon: '🔔' },
  PREMIUM: { name: 'Premium', icon: '✦' }, SECURITY: { name: 'Security', icon: '🔒' }, SETTINGS: { name: 'Settings', icon: '⚙️' },
};

export default function HomeScreen({ navigation }: any) {
  const { selected, loading, loadCategories } = useCategoryStore();
  const { palette, experiments } = useAppTheme();
  const styles = useMemo(() => makeStyles(palette, experiments['compact-home']), [palette, experiments]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const openCategory = (categoryId: string) => {
    switch (categoryId) {
      case 'SOCIAL': navigation.navigate('Social'); return;
      case 'CHAT': navigation.navigate('Chat'); return;
      case 'GAMES': navigation.navigate('Games'); return;
      case 'THEMES': navigation.navigate('Themes'); return;
      case 'GALLERY': navigation.navigate('Gallery'); return;
      case 'NOTIFICATIONS': navigation.navigate('Notifications'); return;
      case 'PREMIUM': navigation.navigate('Premium'); return;
      case 'SECURITY': navigation.navigate('Security'); return;
      case 'SETTINGS': navigation.navigate('SETTINGS'); return;
      case 'LABS': navigation.navigate('Labs'); return;
      case 'TECHNOLOGIES': case 'TV': case 'STUDIOS': case 'WEAR': case 'FOUNDATION':
        navigation.navigate('Module', { section: categoryId }); return;
      default: Alert.alert('Unavailable', 'This shortcut is not available yet.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>{experiments['focus-mode'] ? 'Your BRITUME' : 'LIVING Dashboard'}</Text>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Shortcuts</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ManageCategories')}>
          <Text style={styles.manageLink}>Edit Shortcuts</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={palette.accent} style={styles.loader} /> : (
        <View style={styles.grid}>
          {selected.map((id) => {
            const category = CATEGORY_MAP[id];
            if (!category) return null;
            return (
              <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Open ${category.name}`} style={({ pressed }) => [styles.shortcutCard, pressed && styles.pressed]} onPress={() => openCategory(id)}>
                <Text style={styles.icon}>{category.icon}</Text>
                <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
              </Pressable>
            );
          })}
          {selected.length === 0 && <Text style={styles.emptyText}>No shortcuts yet. Tap “Edit Shortcuts” to configure your dashboard.</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(palette: { background: string; surface: string; text: string; muted: string; accent: string; border: string }, compact: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background }, content: { padding: 18 },
    brand: { color: palette.accent, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    heading: { color: palette.text, fontSize: 26, fontWeight: '900', marginTop: 8, marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: palette.text, fontSize: 16, fontWeight: '800' }, manageLink: { color: palette.accent, fontSize: 13, fontWeight: '700' },
    loader: { marginVertical: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    shortcutCard: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: compact ? 9 : 14, width: '31%', aspectRatio: compact ? 1.15 : 1, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 24, marginBottom: 6 }, name: { color: palette.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] }, emptyText: { color: palette.muted, fontSize: 13, textAlign: 'center', width: '100%', marginTop: 10 },
  });
}
