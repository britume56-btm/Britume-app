
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCategoryStore } from './useCategoryStore';

type CategoryInfo = {
  name: string;
  icon: string;
};

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  SOCIAL: { name: 'Social', icon: '👥' },
  CHAT: { name: 'Chat', icon: '💬' },
  TECHNOLOGIES: { name: 'Technology', icon: '⚡' },
  TV: { name: 'TV', icon: '▶️' },
  STUDIOS: { name: 'Studios', icon: '🎬' },
  WEAR: { name: 'Wear', icon: '👕' },
  GAMES: { name: 'Games', icon: '🎮' },
  FOUNDATION: { name: 'Foundation', icon: '◇' },
  LABS: { name: 'Labs', icon: '🧪' },
  THEMES: { name: 'Themes', icon: '🎨' },
  GALLERY: { name: 'Gallery', icon: '🖼️' },
  NOTIFICATIONS: { name: 'Notifications', icon: '🔔' },
  PREMIUM: { name: 'Premium', icon: '✦' },
  SECURITY: { name: 'Security', icon: '🔒' },
  SETTINGS: { name: 'Settings', icon: '⚙️' },
};

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

export default function HomeScreen({ navigation }: any) {
  const { selected, loading, loadCategories } = useCategoryStore();

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openCategory = (categoryId: string) => {
    switch (categoryId) {
      case 'SOCIAL':
        navigation.navigate('Social');
        return;

      case 'CHAT':
        navigation.navigate('Chat');
        return;

      case 'GAMES':
        navigation.navigate('Games');
        return;

      case 'THEMES':
        navigation.navigate('Themes');
        return;

      case 'GALLERY':
        navigation.navigate('Gallery');
        return;

      case 'NOTIFICATIONS':
        navigation.navigate('Notifications');
        return;

      case 'PREMIUM':
        navigation.navigate('Premium');
        return;

      case 'SECURITY':
        navigation.navigate('Security');
        return;

      case 'SETTINGS':
        navigation.navigate('SETTINGS');
        return;

      case 'TECHNOLOGIES':
      case 'TV':
      case 'STUDIOS':
      case 'WEAR':
      case 'FOUNDATION':
      case 'LABS':
        navigation.navigate('Module', {
          section: categoryId,
        });
        return;

      default:
        return;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>LIVING Dashboard</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Shortcuts</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ManageCategories')}
        >
          <Text style={styles.manageLink}>Edit Shortcuts</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          color={BLUE}
          size="small"
          style={styles.loader}
        />
      ) : (
        <View style={styles.grid}>
          {selected.map((categoryId: string) => {
            const category = CATEGORY_MAP[categoryId];

            if (!category) {
              return null;
            }

            return (
              <Pressable
                key={categoryId}
                accessibilityRole="button"
                accessibilityLabel={`Open ${category.name}`}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => openCategory(categoryId)}
              >
                <Text style={styles.icon}>{category.icon}</Text>

                <Text style={styles.name} numberOfLines={1}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}

          {selected.length === 0 && (
            <Text style={styles.emptyText}>
              No shortcuts added yet. Tap "Edit Shortcuts"
              to configure your dashboard.
            </Text>
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
