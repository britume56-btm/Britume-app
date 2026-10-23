import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCategoryStore } from '../useCategoryStore'; // Adjusted path relative to src/screens

// Map category metadata locally for quick layout lookups on the Home dashboard
const CATEGORY_MAP: Record<string, { name: string; icon: string; screenName: string }> = {
  SOCIAL: { name: 'Social', icon: '👥', screenName: 'GalleryScreen' },
  CHAT: { name: 'Chat', icon: '💬', screenName: 'SettingsScreen' }, // Map to your respective screens
  TECHNOLOGIES: { name: 'Technology', icon: '⚡', screenName: 'ModulesScreen' },
  TV: { name: 'TV', icon: '▶️', screenName: 'HomeScreen' },
  STUDIOS: { name: 'Studios', icon: '🎬', screenName: 'HomeScreen' },
  WEAR: { name: 'Wear', icon: '👕', screenName: 'HomeScreen' },
  GAMES: { name: 'Games', icon: '🎮', screenName: 'GamesScreen' },
  FOUNDATION: { name: 'Foundation', icon: '◇', screenName: 'HomeScreen' },
  LABS: { name: 'Labs', icon: '🧪', screenName: 'LabsScreen' },
  THEMES: { name: 'Themes', icon: '🎨', screenName: 'ThemesScreen' },
  GALLERY: { name: 'Gallery', icon: '🖼️', screenName: 'GalleryScreen' },
  NOTIFICATIONS: { name: 'Notifications', icon: '🔔', screenName: 'NotificationsScreen' },
  PREMIUM: { name: 'Premium', icon: '✦', screenName: 'PremiumScreen' },
  SECURITY: { name: 'Security', icon: '🔒', screenName: 'SettingsScreen' },
};

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

export default function HomeScreen({ navigation }: any) {
  // Pull the reactive arrays directly from your global zustand store
  const { selected, loading, loadCategories } = useCategoryStore();

  // Load preferences seamlessly if they haven't been fetched yet
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>LIVING Dashboard</Text>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Shortcuts</Text>
        <Pressable 
          onPress={() => navigation.navigate('ManageCategoriesScreen')}
          accessibilityRole="button"
        >
          <Text style={styles.manageLink}>Edit Shortcuts</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="small" style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {selected.map((categoryId) => {
            const data = CATEGORY_MAP[categoryId];
            if (!data) return null;

            return (
              <Pressable
                key={categoryId}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  pressed && styles.pressed
                ]}
                onPress={() => navigation.navigate(data.screenName)}
              >
                <Text style={styles.icon}>{data.icon}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {data.name}
                </Text>
              </Pressable>
            );
          })}
          
          {selected.length === 0 && (
            <Text style={styles.emptyText}>No shortcuts added yet. Tap "Edit" to configure your board.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F7FF',
  },
  content: {
    padding: 18,
  },
  brand: {
    color: '#2869C7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  heading: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  manageLink: {
    color: '#2869C7',
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    // Divide grid equally into 3-column rows accounting for gaps
    width: '31%', 
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  name: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    marginTop: 10,
  },
});
