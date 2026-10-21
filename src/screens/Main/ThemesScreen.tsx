
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  THEME_PALETTES,
  useAppTheme,
} from '../../theme/AppThemeContext';
import type {
  ThemeId,
  ThemePalette,
} from '../../theme/AppThemeContext';
import {
  getPremiumEntitlement,
  hasPremiumAccess,
  saveAccountPreferences,
  uploadThemeBackground,
  getThemeBackgroundUrl,
} from '../../services/launchFeatureService';


type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;

type ThemeItem = {
  id: Exclude<ThemeId, 'custom'>;
  name: string;
  description: string;
  premium?: boolean;
};

const THEMES: ThemeItem[] = [
  {
    id: 'midnight',
    name: 'Midnight Gold',
    description: 'BRITUME signature dark and gold',
  },
  {
    id: 'ocean',
    name: 'Ocean Glass',
    description: 'Cool blue with a glass-inspired feel',
  },
  {
    id: 'dusk',
    name: 'Rose Dusk',
    description: 'Soft rose and deep purple',
  },
  {
    id: 'nebula',
    name: 'Nebula Galaxy',
    description: 'Cosmic violet premium theme',
    premium: true,
  },
];

function LiveThemePreview({
  name,
  palette,
  selected,
}: {
  name: string;
  palette: ThemePalette;
  selected: boolean;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const rotationLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    glowLoop.start();
    rotationLoop.start();

    return () => {
      glowLoop.stop();
      rotationLoop.stop();
    };
  }, [glow, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.8],
  });

  return (
    <View
      style={[
        styles.preview,
        {
          backgroundColor: palette.background,
          borderColor: selected ? palette.accent : palette.border,
        },
      ]}
      accessibilityLabel={`${name} live theme preview`}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbit,
          {
            borderColor: palette.accent,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.orbitDot,
            {
              backgroundColor: palette.accent,
              opacity: glowOpacity,
            },
          ]}
        />
      </Animated.View>

      <View style={styles.previewContent}>
        <Text style={[styles.previewBrand, { color: palette.accent }]}>
          BRITUME  /  LIVE THEME
        </Text>

        <Text
          style={[styles.previewTitle, { color: palette.text }]}
          numberOfLines={2}
        >
          {name}
        </Text>

        <Text style={[styles.previewSubtitle, { color: palette.muted }]}>
          Your world. Your style.
        </Text>

        <View
          style={[
            styles.glassCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glowDot,
              {
                backgroundColor: palette.accent,
                opacity: glowOpacity,
              },
            ]}
          />

          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Your BRITUME
            </Text>
            <Text style={[styles.cardSubtitle, { color: palette.muted }]}>
              Personalised for you
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              { backgroundColor: palette.accent },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export default function ThemesScreen({ navigation }: Props) {
  const {
    themeId,
    customThemeName,
    customAccentColor,
    palette,
    backgroundUri,
    loading: themeLoading,
    loadError,
    applyTheme,
    pendingGalleryBackground,
    clearPendingGalleryBackground,
  } = useAppTheme();

  const [userId, setUserId] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        if (!data.user) {
          if (active) {
            setNotice('Sign in to save your themes.');
          }
          return;
        }

        if (active) setUserId(data.user.id);

        const entitlement = await getPremiumEntitlement(data.user.id);

        if (active) {
          setPremiumActive(hasPremiumAccess(entitlement));
        }
      } catch (error) {
        console.warn('Theme account could not be loaded:', error);
        if (active) {
          setNotice('Could not load your account. Please try again.');
        }
      } finally {
        if (active) setScreenLoading(false);
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingGalleryBackground || !userId) return;

    let active = true;

    async function saveWallpaper() {
      setSaving(true);

      try {
        const path = await uploadThemeBackground(
          userId as string,
          pendingGalleryBackground as string,
        );

        const signedUrl = await getThemeBackgroundUrl(path);

        await saveAccountPreferences(userId as string, {
          theme_id: 'custom',
          custom_theme_name: customThemeName || 'My Wallpaper',
          background_path: path,
          custom_accent_color: customAccentColor,
        });

        if (!active) return;

        applyTheme(
          'custom',
          customThemeName || 'My Wallpaper',
          signedUrl,
          customAccentColor,
        );

        setNotice('Your wallpaper has been saved.');
      } catch (error) {
        console.warn('Wallpaper could not be saved:', error);

        if (active) {
          Alert.alert(
            'Wallpaper not saved',
            'Check your connection and Supabase storage permissions, then try again.',
          );
        }
      } finally {
        if (active) setSaving(false);
        clearPendingGalleryBackground();
      }
    }

    void saveWallpaper();

    return () => {
      active = false;
    };
  }, [
    pendingGalleryBackground,
    userId,
    customThemeName,
    customAccentColor,
    applyTheme,
    clearPendingGalleryBackground,
  ]);

  async function chooseTheme(item: ThemeItem) {
    if (!userId) {
      Alert.alert('Sign in required', 'Sign in to save your theme.');
      return;
    }

    if (item.premium && !premiumActive) {
      Alert.alert(
        'Nebula Premium',
        'This theme requires a verified Premium entitlement. Rewarded-ad and permanent theme purchases are not connected yet.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'View Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ],
      );
      return;
    }

    const nextPalette = THEME_PALETTES[item.id];

    setSaving(true);
    setNotice('');

    try {
      await saveAccountPreferences(userId, {
        theme_id: item.id,
        custom_theme_name: item.name,
        background_path: null,
        custom_accent_color: nextPalette.accent,
      });

      applyTheme(item.id, item.name, null, nextPalette.accent);
      setNotice(`${item.name} applied successfully.`);
    } catch (error) {
      console.warn('Theme could not be saved:', error);

      Alert.alert(
        'Could not save theme',
        'Your preference was not saved. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function openWallpaperPicker() {
    if (!userId) {
      Alert.alert('Sign in required', 'Sign in before saving a wallpaper.');
      return;
    }

    navigation.navigate('Gallery', { selectForTheme: true });
  }

  if (themeLoading || screenLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={[styles.loadingText, { color: palette.text }]}>
          Loading your BRITUME Theme Room…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.backText, { color: palette.text }]}>
              ‹ Back
            </Text>
          </Pressable>

          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            PERSONALISATION STUDIO
          </Text>

          <Text style={[styles.heading, { color: palette.text }]}>
            Theme Room
          </Text>

          <Text style={[styles.intro, { color: palette.muted }]}>
            Make BRITUME feel like yours. Preview, choose and save your style.
          </Text>
        </View>

        {loadError ? (
          <Text style={[styles.notice, { color: palette.muted }]}>
            Saved theme settings could not be loaded. You can still preview themes.
          </Text>
        ) : null}

        {notice ? (
          <Text style={[styles.notice, { color: palette.accent }]}>
            {notice}
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Your current look
        </Text>

        <View
          style={[
            styles.currentCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {backgroundUri ? (
            <ImageBackground
              source={{ uri: backgroundUri }}
              imageStyle={styles.currentWallpaperImage}
              style={styles.currentWallpaper}
            >
              <View style={styles.wallpaperOverlay}>
                <Text style={[styles.currentLabel, { color: '#FFFFFF' }]}>
                  ACTIVE WALLPAPER
                </Text>
                <Text style={styles.currentName}>
                  {customThemeName || 'My Wallpaper'}
                </Text>
              </View>
            </ImageBackground>
          ) : (
            <>
              <Text style={[styles.currentLabel, { color: palette.muted }]}>
                ACTIVE THEME
              </Text>
              <Text style={[styles.currentName, { color: palette.text }]}>
                {customThemeName || themeId}
              </Text>
              <View style={styles.swatches}>
                {[palette.accent, palette.surface, palette.text].map(
                  (color, index) => (
                    <View
                      key={`${color}-${index}`}
                      style={[styles.swatch, { backgroundColor: color }]}
                    />
                  ),
                )}
              </View>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Live themes
        </Text>

        {THEMES.map((item) => {
          const itemPalette = THEME_PALETTES[item.id];
          const isSelected = themeId === item.id;
          const isLocked = Boolean(item.premium && !premiumActive);

          return (
            <View
              key={item.id}
              style={[
                styles.themeCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: isSelected ? palette.accent : palette.border,
                },
              ]}
            >
              <LiveThemePreview
                name={item.name}
                palette={itemPalette}
                selected={isSelected}
              />

              <View style={styles.themeInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.themeName, { color: palette.text }]}>
                    {item.name}
                  </Text>

                  {item.premium ? (
                    <Text style={[styles.premiumTag, { color: palette.accent }]}>
                      PREMIUM
                    </Text>
                  ) : (
                    <Text style={[styles.freeTag, { color: palette.muted }]}>
                      FREE
                    </Text>
                  )}
                </View>

                <Text style={[styles.description, { color: palette.muted }]}>
                  {item.description}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void chooseTheme(item)}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isSelected
                        ? palette.surface
                        : palette.accent,
                      borderColor: palette.accent,
                      borderWidth: isSelected ? 1 : 0,
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      { color: isSelected ? palette.accent : palette.background },
                    ]}
                  >
                    {saving
                      ? 'Saving…'
                      : isSelected
                        ? '✓ Currently applied'
                        : isLocked
                          ? 'View Premium access'
                          : 'Apply theme'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Wallpapers
        </Text>

        <View
          style={[
            styles.wallpaperCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.wallpaperIcon}>
            <Text style={{ fontSize: 28 }}>✦</Text>
          </View>

          <View style={styles.wallpaperCopy}>
            <Text style={[styles.themeName, { color: palette.text }]}>
              Your own wallpaper
            </Text>
            <Text style={[styles.description, { color: palette.muted }]}>
              Choose an image in your gallery and save it as your BRITUME background.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={openWallpaperPicker}
          style={[
            styles.actionButton,
            styles.wallpaperButton,
            { backgroundColor: palette.accent, opacity: saving ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.actionText, { color: palette.background }]}>
            {saving ? 'Saving…' : 'Choose wallpaper'}
          </Text>
        </Pressable>

        <View
          style={[
            styles.rewardCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.rewardHeading, { color: palette.text }]}>
            Unlock more with BRITUME
          </Text>
          <Text style={[styles.description, { color: palette.muted }]}>
            Our planned reward system will let you unlock selected themes for
            72 hours after a verified rewarded ad. Permanent item purchases
            require a verified store purchase.
          </Text>
          <Text style={[styles.rewardStatus, { color: palette.accent }]}>
            Rewarded ads and individual theme purchases are not configured yet.
          </Text>
        </View>

        <Text style={[styles.footer, { color: palette.muted }]}>
          BRITUME • Your world. Your style.
        </Text>
      </ScrollView>

      {saving ? (
        <View style={styles.savingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#D9B867" />
        </View>
      ) : null}
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
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 42,
  },
  header: {
    marginBottom: 22,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '900',
  },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  notice: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 12,
  },
  currentCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  currentLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '900',
  },
  currentName: {
    fontSize: 23,
    fontWeight: '900',
    marginTop: 8,
  },
  swatches: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  currentWallpaper: {
    minHeight: 135,
    justifyContent: 'flex-end',
    margin: -18,
  },
  currentWallpaperImage: {
    borderRadius: 22,
  },
  wallpaperOverlay: {
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  themeCard: {
    borderRadius: 23,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  preview: {
    minHeight: 205,
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  previewContent: {
    zIndex: 1,
  },
  orbit: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    right: -28,
    top: -35,
    alignItems: 'center',
  },
  orbitDot: {
    height: 12,
    width: 12,
    borderRadius: 8,
    marginTop: -6,
  },
  previewBrand: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  previewTitle: {
    fontSize: 23,
    fontWeight: '900',
    marginTop: 12,
  },
  previewSubtitle: {
    fontSize: 12,
    marginTop: 5,
  },
  glassCard: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glowDot: {
    width: 29,
    height: 29,
    borderRadius: 10,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardSubtitle: {
    fontSize: 10,
    marginTop: 3,
  },
  liveBadge: {
    height: 8,
    width: 8,
    borderRadius: 5,
  },
  themeInfo: {
    padding: 5,
    paddingTop: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '900',
  },
  premiumTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  freeTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  actionButton: {
    minHeight: 45,
    borderRadius: 14,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  wallpaperCard: {
    borderRadius: 19,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  wallpaperIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,184,103,0.12)',
  },
  wallpaperCopy: {
    flex: 1,
  },
  wallpaperButton: {
    marginBottom: 18,
  },
  rewardCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
    marginTop: 18,
  },
  rewardHeading: {
    fontSize: 17,
    fontWeight: '900',
  },
  rewardStatus: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 12,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 26,
  },
  savingOverlay: {
    position: 'absolute',
    right: 18,
    top: 18,
  },
});
