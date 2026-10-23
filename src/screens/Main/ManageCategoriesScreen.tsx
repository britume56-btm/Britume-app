import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolateColor 
} from 'react-native-reanimated';
import { useCategoryStore, DEFAULTS, MAX_SHORTCUTS } from './useCategoryStore';

// Simple platform haptic helper fallback
const triggerHaptic = () => {
  if (Platform.OS === 'ios') {
    // Optional iOS physical system haptic if package installed
  }
};

const CATEGORIES = [
  { id: 'SOCIAL', name: 'Social', icon: '👥' },
  { id: 'CHAT', name: 'Chat', icon: '💬' },
  { id: 'TECHNOLOGIES', name: 'Technology', icon: '⚡' },
  { id: 'TV', name: 'TV', icon: '▶️' },
  { id: 'STUDIOS', name: 'Studios', icon: '🎬' },
  { id: 'WEAR', name: 'Wear', icon: '👕' },
  { id: 'GAMES', name: 'Games', icon: '🎮' },
  { id: 'FOUNDATION', name: 'Foundation', icon: '◇' },
  { id: 'LABS', name: 'Labs', icon: '🧪' },
  { id: 'THEMES', name: 'Themes', icon: '🎨' },
  { id: 'GALLERY', name: 'Gallery', icon: '🖼️' },
  { id: 'NOTIFICATIONS', name: 'Notifications', icon: '🔔' },
  { id: 'PREMIUM', name: 'Premium', icon: '✦' },
  { id: 'SECURITY', name: 'Security', icon: '🔒' },
] as const;

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

// Component for Micro-Interaction Scale on individual list rows
function CategoryRow({ category, active, disabled, onPress }: { 
  category: typeof CATEGORIES[number]; 
  active: boolean; 
  disabled: boolean; 
  onPress: () => void; 
}) {
  const scale = useSharedValue(1);

  const animatedRowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(scale.value, { damping: 15 }) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      disabled={disabled}
      onPressIn={() => { scale.value = 0.97; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={onPress}
    >
      <Animated.View style={[
        styles.category,
        active && styles.categoryActive,
        animatedRowStyle
      ]}>
        <View style={styles.categoryIcon}>
          <Text style={styles.emoji}>{category.icon}</Text>
        </View>

        <Text style={styles.categoryName}>{category.name}</Text>

        <View style={[styles.check, active && styles.checkActive]}>
          <Text style={[styles.checkText, active && styles.checkTextActive]}>
            {active ? '✓' : '+'}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function ManageCategoriesScreen() {
  const { 
    selected, 
    loading, 
    saving, 
    loadCategories, 
    toggleCategory, 
    resetDefaults 
  } = useCategoryStore();

  // Load configuration safely when mounting
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Reanimated 3 layout width tracking
  const animatedWidthPercent = useSharedValue((selected.length / MAX_SHORTCUTS) * 100);

  useEffect(() => {
    animatedWidthPercent.value = withSpring((selected.length / MAX_SHORTCUTS) * 100, {
      damping: 15,
      stiffness: 90
    });
  }, [selected.length, animatedWidthPercent]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidthPercent.value}%`,
    };
  });

  const handleToggle = (id: string) => {
    triggerHaptic();
    void toggleCategory(
      id,
      () => Alert.alert('Six categories maximum', 'Remove one of your current shortcuts before adding another.'),
      (errorMsg) => Alert.alert('Could not save', errorMsg)
    );
  };

  const handleReset = () => {
    triggerHaptic();
    void resetDefaults((errorMsg) => Alert.alert('Reset failed', errorMsg));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>Manage Categories</Text>
      <Text style={styles.description}>
        Choose the six shortcuts you want on LIVING. Other categories stay available here.
      </Text>

      <View style={styles.counterCard}>
        <Text style={styles.counterTitle}>Your LIVING shortcuts</Text>
        <Text style={styles.counter}>{selected.length} of {MAX_SHORTCUTS} selected</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={styles.loader} />
      ) : (
        <View style={styles.list}>
          {CATEGORIES.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              active={selected.includes(category.id)}
              disabled={saving}
              onPress={() => handleToggle(category.id)}
            />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={handleReset}
        style={styles.resetButton}
      >
        <Text style={styles.resetText}>Restore default six</Text>
      </Pressable>

      {saving && <Text style={styles.saving}>Saving your preferences…</Text>}

      <Text style={styles.note}>
        These preferences are stored on this device. They do not change your account or delete any content.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F7FF',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
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
  },
  description: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 20,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  counterTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  counter: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#EAF3FF',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 11,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BLUE,
    borderRadius: 5,
  },
  loader: {
    marginVertical: 30,
  },
  list: {
    flexDirection: 'column',
  },
  category: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 17,
    padding: 11,
    marginBottom: 10,
  },
  categoryActive: {
    backgroundColor: '#EAF3FF',
    borderColor: '#8BB9F5',
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F2F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 21,
  },
  categoryName: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },
  check: {
    width: 29,
    height: 29,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D8E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  checkText: {
    color: MUTED,
    fontSize: 17,
    fontWeight: '800',
  },
  checkTextActive: {
    color: '#FFFFFF',
  },
  resetButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#B9D5F7',
    backgroundColor: '#FFFFFF',
  },
  resetText: {
    color: '#2869C7',
    fontSize: 13,
    fontWeight: '800',
  },
  saving: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  note: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
  },
});
