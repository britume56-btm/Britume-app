
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import { THEME_PALETTES, useAppTheme } from '../../theme/AppThemeContext';
import type { ThemeId } from '../../theme/AppThemeContext';
import {
  getPremiumEntitlement,
  hasPremiumAccess,
  saveAccountPreferences,
} from '../../services/launchFeatureService';

type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;

type ThemeCategory = 'Galaxy' | 'Fluid / Gradient' | 'Fluffy' | 'Classic';

type ThemeItem = {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  premium?: boolean;
  fontStyle: 'System' | 'Rounded' | 'Futuristic';
};

const THEME_COLLECTION: ThemeItem[] = [
  {
    id: 'midnight',
    name: 'Midnight Classic',
    category: 'Classic',
    description: 'BRITUME signature dark and gold experience.',
    fontStyle: 'System',
  },
  {
    id: 'galaxy_supernova',
    name: 'Supernova Cosmic',
    category: 'Galaxy',
    description: 'A cosmic-inspired workspace with animated stars.',
    premium: true,
    fontStyle: 'Futuristic',
  },
  {
    id: 'galaxy_andromeda',
    name: 'Andromeda Nebula',
    category: 'Galaxy',
    description: 'A deep-space look with violet accents.',
    premium: true,
    fontStyle: 'Futuristic',
  },
  {
    id: 'fluid_aurora',
    name: 'Aurora Borealis',
    category: 'Fluid / Gradient',
    description: 'A cool, flowing colour-inspired workspace.',
    fontStyle: 'System',
  },
  {
    id: 'fluid_sunset',
    name: 'Neon Horizon',
    category: 'Fluid / Gradient',
    description: 'A vivid sunset-inspired visual style.',
    fontStyle: 'System',
  },
  {
    id: 'fluffy_cloud',
    name: 'Cotton Dream',
    category: 'Fluffy',
    description: 'Soft shapes and a light, gentle appearance.',
    fontStyle: 'Rounded',
  },
  {
    id: 'fluffy_lavender',
    name: 'Marshmallow Mist',
    category: 'Fluffy',
    description: 'Rounded cards with lavender-inspired colours.',
    fontStyle: 'Rounded',
  },
];

function AdvancedLivePreview({
  item,
  selected,
}: {
  item: ThemeItem;
  selected: boolean;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    rotationLoop.start();
    shimmerLoop.start();

    return () => {
      rotationLoop.stop();
      shimmerLoop.stop();
    };
  }, [rotation, shimmer]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const darkPreview =
    item.category === 'Galaxy' ||
    item.category === 'Fluid / Gradient';

  const previewBackground =
    item.category === 'Galaxy'
      ? '#0B0F19'
      : item.category === 'Fluid / Gradient'
        ? '#19112B'
        : item.category === 'Fluffy'
          ? '#FFF4F8'
          : '#17191F';

  const titleColor = darkPreview ? '#FFFFFF' : '#263247';
  const accentColor = item.category === 'Galaxy' ? '#D4AF37' : '#669EFF';

  return (
    <View
      style={[
        styles.preview,
        { backgroundColor: previewBackground },
        item.category === 'Fluffy' && styles.fluffyPreview,
        selected && styles.selectedPreview,
      ]}
    >
      {item.category === 'Galaxy' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbit,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <Text style={[styles.star, { top: 12, left: 24 }]}>✦</Text>
          <Text style={[styles.star, { bottom: 15, right: 30 }]}>✧</Text>
          <Animated.Text
            style={[
              styles.star,
              { top: 48, right: 48, opacity: shimmer },
            ]}
          >
            ✦
          </Animated.Text>
        </Animated.View>
      )}

      {item.category === 'Fluffy' && (
        <Text style={styles.cloudDecoration}>☁</Text>
      )}

      <Text style={[styles.categoryKicker, { color: accentColor }]}>
        {item.category.toUpperCase()} WORKSPACE
      </Text>

      <Text
        style={[
          styles.previewTitle,
          { color: titleColor },
          item.fontStyle === 'Futuristic' && styles.futuristicTitle,
          item.fontStyle === 'Rounded' && styles.roundedTitle,
        ]}
      >
        {item.name}
      </Text>

      <Text style={styles.previewSubtitle}>
        {item.fontStyle} visual style
      </Text>

      <View
        style={[
          styles.sampleGlass,
          item.category === 'Fluffy' && styles.fluffySample,
        ]}
      >
        <View style={styles.sampleHeader}>
          <View style={[styles.sampleDot, { backgroundColor: accentColor }]} />
          <View style={[styles.sampleLine, { backgroundColor: accentColor }]} />
        </View>
        <View style={styles.sampleLineLong} />
        <View style={styles.sampleLineShort} />
      </View>
    </View>
  );
}

export default function ThemesScreen({ navigation }: Props) {
  const { themeId, customThemeName, palette, applyTheme } = useAppTheme();

  const [userId, setUserId] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAccountData() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (data.user) {
          setUserId(data.user.id);

          const entitlement = await getPremiumEntitlement(data.user.id);

          if (mounted) {
            setPremiumActive(hasPremiumAccess(entitlement));
          }
        }
      } catch (error) {
        console.warn('Unable to load theme account information:', error);
      } finally {
        if (mounted) {
          setScreenLoading(false);
        }
      }
    }

    void loadAccountData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleApplyTheme = async (item: ThemeItem) => {
    if (saving) return;

    if (!userId) {
      Alert.alert(
        'Sign in required',
        'Sign in to your BRITUME account before saving a theme.',
      );
      return;
    }

    if (item.premium && !premiumActive) {
      Alert.alert(
        'Premium theme',
        'This theme requires premium access.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ],
      );
      return;
    }

    setSaving(true);

    try {
      // These visual templates currently use the existing base palettes.
      // They do not create separate colour palettes in the theme engine.
      const basicPaletteId: ThemeId = item.id.startsWith('galaxy')
        ? 'midnight'
        : 'ocean';

      const targetPalette =
        THEME_PALETTES[basicPaletteId] ?? THEME_PALETTES.midnight;

      const { error } = await saveAccountPreferences(userId, {
        theme_id: basicPaletteId,
        custom_theme_name: item.name,
        background_path: null,
        custom_accent_color: targetPalette.accent,
      });

      // Supports either a returned Supabase-style error object or
      // a service that throws when saving fails.
      if (error) {
        throw error;
      }

      applyTheme(
        basicPaletteId,
        item.name,
        null,
        targetPalette.accent,
      );

      Alert.alert(
        'Theme applied',
        `${item.name} has been selected.`,
      );
    } catch (error) {
      console.warn('Unable to save theme:', error);
      Alert.alert(
        'Could not save theme',
        'Your theme could not be synced. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (screenLoading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: palette.background },
        ]}
      >
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={[styles.loadingText, { color: palette.text }]}>
          Loading themes...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: palette.background },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={palette.text} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            BRITUME PERSONALIZATION
          </Text>
          <Text style={[styles.screenTitle, { color: palette.text }]}>
            Themes
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>
            Choose your workspace appearance.
          </Text>
        </View>
      </View>

      {!userId && (
        <View
          style={[
            styles.notice,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={palette.accent}
          />
          <Text style={[styles.noticeText, { color: palette.text }]}>
            Sign in to save and sync your selected theme.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Visual collection
          </Text>
          <Text style={[styles.sectionDescription, { color: palette.muted }]}>
            Preview a design before applying it.
          </Text>
        </View>

        {THEME_COLLECTION.map((item) => {
          const selected =
            customThemeName === item.name ||
            (!customThemeName && themeId === item.id);

          return (
            <View
              key={item.id}
              style={[
                styles.themeCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: selected ? palette.accent : palette.border,
                },
              ]}
            >
              <AdvancedLivePreview item={item} selected={selected} />

              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text
                    style={[styles.cardTitle, { color: palette.text }]}
                  >
                    {item.name}
                  </Text>

                  {item.premium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="sparkles" size={12} color="#17130A" />
                      <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.description, { color: palette.muted }]}
                >
                  {item.description}
                </Text>

                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: selected ? palette.accent : palette.muted },
                    ]}
                  >
                    {selected ? 'Currently selected' : 'Available theme'}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Apply ${item.name}`}
                    disabled={saving || selected}
                    onPress={() => void handleApplyTheme(item)}
                    style={[
                      styles.applyButton,
                      {
                        backgroundColor: selected
                          ? palette.surface
                          : palette.accent,
                        borderColor: palette.accent,
                        opacity: saving ? 0.65 : 1,
                      },
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color={selected ? palette.accent : '#17130A'}
                      />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.applyButtonText,
                            { color: selected ? palette.accent : '#17130A' },
                          ]}
                        >
                          {selected ? 'Selected' : 'Apply'}
                        </Text>
                        {!selected && (
                          <Ionicons
                            name="arrow-forward"
                            size={15}
                            color="#17130A"
                          />
                        )}
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.bottomNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={palette.accent}
          />
          <Text style={[styles.bottomNoteText, { color: palette.muted }]}>
            Your selection is saved through your BRITUME account. Some visual
            templates currently map to an existing base palette.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  screenTitle: {
    fontSize: 27,
    fontWeight: '900',
    marginTop: 3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 12,
    gap: 9,
    borderWidth: 1,
    borderRadius: 15,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 34,
  },
  sectionHeading: {
    marginTop: 4,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  sectionDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  themeCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 17,
  },
  preview: {
    minHeight: 180,
    padding: 18,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectedPreview: {
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
  },
  fluffyPreview: {
    borderRadius: 22,
  },
  orbit: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    fontSize: 23,
    color: '#D4AF37',
  },
  cloudDecoration: {
    position: 'absolute',
    right: 15,
    top: 8,
    fontSize: 54,
    color: '#E7CBEF',
    opacity: 0.65,
  },
  categoryKicker: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  futuristicTitle: {
    letterSpacing: 1.4,
  },
  roundedTitle: {
    fontWeight: '700',
  },
  previewSubtitle: {
    fontSize: 11,
    color: '#91A2B8',
    marginTop: 5,
  },
  sampleGlass: {
    marginTop: 17,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  fluffySample: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: '#F0DDE9',
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sampleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sampleLine: {
    width: 48,
    height: 5,
    borderRadius: 3,
    opacity: 0.8,
  },
  sampleLineLong: {
    width: '85%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(145,162,184,0.55)',
    marginBottom: 7,
  },
  sampleLineShort: {
    width: '55%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(145,162,184,0.3)',
  },
  cardBody: {
    padding: 15,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#17130A',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 15,
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  applyButton: {
    minWidth: 94,
    minHeight: 39,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 4,
    padding: 12,
  },
  bottomNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },
});
