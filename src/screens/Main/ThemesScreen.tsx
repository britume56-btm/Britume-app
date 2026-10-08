import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  getAccountPreferences,
  getPremiumEntitlement,
  hasPremiumAccess,
  getThemeBackgroundUrl,
  deleteThemeBackground,
  saveAccountPreferences,
  uploadThemeBackground,
} from '../../services/launchFeatureService';
import { THEME_PALETTES, useAppTheme } from '../../theme/AppThemeContext';
import type { ThemeId } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;

const OPTIONS: {
  id: Exclude<ThemeId, 'custom'>;
  name: string;
  description: string;
  premium?: boolean;
}[] = [
  { id: 'midnight', name: 'Midnight', description: 'The original BRITUME look.' },
  { id: 'ocean', name: 'Ocean', description: 'Cool teal accents and deep blue surfaces.' },
  { id: 'dusk', name: 'Dusk', description: 'Warm plum and rose accents.' },
  { id: 'nebula', name: 'Nebula', description: 'Requires an active account Premium entitlement.', premium: true },
];
const ACCENT_CHOICES = ['#d9b867', '#65c7d0', '#e99abd', '#b6a0ff', '#78c69b', '#ff8c69'];

export default function ThemesScreen({ navigation, route }: Props) {
  const {
    themeId,
    customThemeName,
    customAccentColor,
    backgroundUri,
    palette,
    applyTheme,
    loading: preferencesLoading,
    pendingGalleryBackground,
    clearPendingGalleryBackground,
  } = useAppTheme();
  const [selected, setSelected] = useState<ThemeId>(themeId);
  const [draftName, setDraftName] = useState(customThemeName);
  const [draftBackground, setDraftBackground] = useState<string | null>(backgroundUri);
  const [draftAccent, setDraftAccent] = useState(customAccentColor ?? '#e99abd');
  const [savedBackgroundPath, setSavedBackgroundPath] = useState<string | null>(null);
  const [customThemeExists, setCustomThemeExists] = useState(false);
  const [premiumAccess, setPremiumAccess] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!preferencesLoading) {
      setSelected(themeId);
      setDraftName(customThemeName);
      setDraftBackground(themeId === 'custom' ? backgroundUri : null);
      setDraftAccent(customAccentColor ?? '#e99abd');
    }
  }, [preferencesLoading]);

  useEffect(() => {
    if (pendingGalleryBackground) {
      setDraftBackground(pendingGalleryBackground);
      setSelected('custom');
      setNotice('Photo selected. Save to apply it to your account.');
      clearPendingGalleryBackground();
    }
  }, [pendingGalleryBackground, clearPendingGalleryBackground]);

  useEffect(() => {
    if (route.params?.backgroundUri) {
      setDraftBackground(route.params.backgroundUri);
      setSelected('custom');
      setNotice('Photo selected. Save to apply it to your account.');
    }
  }, [route.params?.backgroundUri]);

  useEffect(() => {
    let active = true;
    const loadPath = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          return;
        }
        const preferences = await getAccountPreferences(data.user.id);
        const [savedBackground, entitlement] = await Promise.all([
          getThemeBackgroundUrl(preferences.background_path),
          getPremiumEntitlement(data.user.id),
        ]);
        if (active) {
          setSavedBackgroundPath(preferences.background_path);
          setCustomThemeExists(
            preferences.theme_id === 'custom' ||
              Boolean(preferences.custom_theme_name || preferences.background_path || preferences.custom_accent_color)
          );
          if (!draftBackground && preferences.background_path) {
            setDraftBackground(savedBackground);
          }
          setPremiumAccess(hasPremiumAccess(entitlement));
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Theme settings could not be loaded.');
        }
      } finally {
        if (active) {
          setPremiumLoading(false);
        }
      }
    };
    void loadPath();
    return () => {
      active = false;
    };
  }, []);

  async function saveTheme() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    let uploadedPath: string | null = null;
    let cleanupWarning = false;
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to save your theme.');
      }
      if (selected === 'nebula') {
        const entitlement = await getPremiumEntitlement(data.user.id);
        if (!hasPremiumAccess(entitlement)) {
          throw new Error('Nebula requires an active Premium entitlement. Check Premium status to refresh access.');
        }
      }

      const previousPath = savedBackgroundPath;
      let backgroundPath =
        selected === 'custom' && draftBackground ? savedBackgroundPath : null;
      let nextBackgroundUri = selected === 'custom' ? draftBackground : null;
      if (selected === 'custom' && draftBackground && !/^https?:\/\//i.test(draftBackground)) {
        backgroundPath = await uploadThemeBackground(data.user.id, draftBackground);
        uploadedPath = backgroundPath;
        nextBackgroundUri = await getThemeBackgroundUrl(backgroundPath);
      } else if (selected === 'custom' && backgroundPath) {
        nextBackgroundUri = await getThemeBackgroundUrl(backgroundPath);
      }

      const changes =
        selected === 'custom'
          ? {
              theme_id: selected,
              custom_theme_name: draftName.trim() || 'Custom theme',
              background_path: backgroundPath,
              custom_accent_color: draftAccent,
            }
          : { theme_id: selected };
      await saveAccountPreferences(data.user.id, changes);
      setSavedBackgroundPath(selected === 'custom' ? backgroundPath : savedBackgroundPath);
      applyTheme(
        selected,
        draftName.trim() || 'Custom theme',
        nextBackgroundUri,
        selected === 'custom' ? draftAccent : customAccentColor
      );
      if (selected === 'custom') {
        setDraftBackground(nextBackgroundUri);
        setCustomThemeExists(true);
      }
      if (
        selected === 'custom' && previousPath && previousPath !== backgroundPath
      ) {
        try {
          await deleteThemeBackground(previousPath);
        } catch {
          cleanupWarning = true;
        }
      }
      setNotice(
        cleanupWarning
          ? 'Theme saved. Its previous private wallpaper could not be removed from storage.'
          : 'Theme saved to your BRITUME account.'
      );
    } catch (cause) {
      if (uploadedPath) {
        try {
          await deleteThemeBackground(uploadedPath);
        } catch {
          // The account preference remains unchanged; orphan cleanup can be retried later.
        }
      }
      setError(cause instanceof Error ? cause.message : 'Theme could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const selectTheme = (id: ThemeId) => {
    if (id === 'nebula' && !premiumAccess) {
      setNotice('Nebula is locked because this account has no active Premium entitlement.');
      return;
    }
    setSelected(id);
    setError('');
    setNotice('');
  };

  async function resetTheme() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to reset your theme.');
      }
      await saveAccountPreferences(data.user.id, { theme_id: 'midnight' });
      setSelected('midnight');
      applyTheme('midnight', customThemeName, null, customAccentColor);
      setNotice('Active theme reset to Midnight. Your saved custom theme remains available.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Theme could not be reset.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomTheme() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to delete your custom theme.');
      }
      const previousPath = savedBackgroundPath;
      const nextTheme = themeId === 'custom' ? 'midnight' : themeId;
      await saveAccountPreferences(data.user.id, {
        theme_id: nextTheme,
        custom_theme_name: null,
        background_path: null,
        custom_accent_color: null,
      });
      setSavedBackgroundPath(null);
      setCustomThemeExists(false);
      setDraftName('Custom theme');
      setDraftBackground(null);
      setDraftAccent('#e99abd');
      if (themeId === 'custom') {
        setSelected('midnight');
        applyTheme('midnight', 'Custom theme', null, null);
      }
      try {
        await deleteThemeBackground(previousPath);
        setNotice('Custom theme deleted.');
      } catch {
        setNotice('Custom theme deleted from your settings, but its private wallpaper could not be removed.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Custom theme could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  const previewPalette =
    selected === 'custom'
      ? { ...THEME_PALETTES.dusk, accent: draftAccent }
      : THEME_PALETTES[selected];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • PERSONALIZE</Text>
      <Text style={[styles.title, { color: palette.text }]}>Themes</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        Choose a built-in theme or create a custom one. Your selection is saved to your account;
        custom backgrounds appear on the LIVING screen.
      </Text>
      {preferencesLoading || premiumLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <Text style={[styles.optionDescription, { color: palette.muted }]}>Loading your saved theme and entitlement…</Text>
        </View>
      ) : null}

      {OPTIONS.map((option) => {
        const optionPalette = THEME_PALETTES[option.id];
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => selectTheme(option.id)}
            style={[
              styles.option,
              { backgroundColor: optionPalette.surface, borderColor: active ? optionPalette.accent : optionPalette.border },
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: optionPalette.background, borderColor: optionPalette.border }]}>
              <View style={[styles.swatchAccent, { backgroundColor: optionPalette.accent }]} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: optionPalette.text }]}>
                {option.name}{option.premium ? ' · PREMIUM' : ''}
              </Text>
              <Text style={[styles.optionDescription, { color: optionPalette.muted }]}>{option.description}</Text>
            </View>
            <Text style={[styles.check, { color: optionPalette.accent }]}>{active ? '✓' : ''}</Text>
          </Pressable>
        );
      })}

      <View style={[styles.customCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.optionTitle, { color: palette.text }]}>
          {selected === 'custom' ? 'Custom theme selected' : '+ Create a custom theme'}
        </Text>
        <Text style={[styles.optionDescription, { color: palette.muted }]}>
          Name your theme, choose an optional wallpaper, and set an accent. Changes stay in this
          preview until you save.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelected('custom');
            navigation.navigate('Gallery', { selectForTheme: true });
          }}
          style={[styles.secondaryButton, { borderColor: palette.border }]}
        >
          <Text style={[styles.secondaryText, { color: palette.accent }]}>Choose a gallery background</Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Custom theme name"
          value={draftName}
          onChangeText={(value) => {
            setDraftName(value);
            setSelected('custom');
          }}
          maxLength={40}
          placeholder="Name your theme"
          placeholderTextColor="#7d8797"
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
        />
        <Text style={[styles.label, { color: palette.text }]}>Accent color</Text>
        <View style={styles.accentChoices}>
          {ACCENT_CHOICES.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Use accent ${color}`}
              accessibilityState={{ selected: draftAccent.toLowerCase() === color.toLowerCase() }}
              onPress={() => {
                setDraftAccent(color);
                setSelected('custom');
              }}
              style={[
                styles.accentChoice,
                { backgroundColor: color, borderColor: draftAccent.toLowerCase() === color.toLowerCase() ? palette.text : palette.border },
              ]}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel="Custom accent hex color"
          value={draftAccent}
          onChangeText={(value) => {
            setDraftAccent(value);
            setSelected('custom');
          }}
          autoCapitalize="characters"
          maxLength={7}
          placeholder="#D9B867"
          placeholderTextColor="#7d8797"
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
        />
        {draftBackground ? (
          <>
            <ImageBackground
              source={{ uri: draftBackground }}
              imageStyle={styles.previewImage}
              style={styles.preview}
            >
              <Text style={styles.previewText}>Background preview</Text>
            </ImageBackground>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDraftBackground(null);
                setSelected('custom');
                setNotice('Wallpaper will be removed from the custom theme when you save.');
              }}
              style={styles.removeWallpaper}
            >
              <Text style={[styles.secondaryText, { color: palette.accent }]}>Remove wallpaper</Text>
            </Pressable>
          </>
        ) : null}
        <View style={[styles.previewCard, { backgroundColor: previewPalette.background, borderColor: previewPalette.border }]}>
          <Text style={[styles.previewTitle, { color: previewPalette.text }]}>{draftName.trim() || 'Custom theme'}</Text>
          <Text style={[styles.previewDescription, { color: previewPalette.muted }]}>BRITUME · section preview</Text>
          <View style={[styles.previewChip, { backgroundColor: previewPalette.surface, borderColor: previewPalette.border }]}>
            <Text style={[styles.previewChipText, { color: previewPalette.accent }]}>Accent preview</Text>
          </View>
        </View>
      </View>

      {selected === 'nebula' && !premiumAccess ? (
        <Text style={[styles.notice, { color: palette.muted }]}>
          Premium themes unlock only from a current account entitlement. Purchases and ad rewards are not configured.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={[styles.notice, { color: palette.accent }]}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving || (selected === 'custom' && !/^#[0-9a-f]{6}$/i.test(draftAccent))}
        onPress={() => void saveTheme()}
        style={[styles.saveButton, { backgroundColor: palette.accent }, (saving || (selected === 'custom' && !/^#[0-9a-f]{6}$/i.test(draftAccent))) && styles.disabled]}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save theme to account'}</Text>
      </Pressable>
      <View style={styles.footerActions}>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void resetTheme()} style={[styles.secondaryButton, { borderColor: palette.border }]}>
          <Text style={[styles.secondaryText, { color: palette.accent }]}>{saving ? 'Saving…' : 'Reset to Midnight'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={saving || !customThemeExists} onPress={() => void deleteCustomTheme()} style={[styles.secondaryButton, { borderColor: palette.border }, (saving || !customThemeExists) && styles.disabled]}>
          <Text style={[styles.secondaryText, { color: palette.accent }]}>Delete custom theme</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingVertical: 8 },
  option: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, padding: 12 },
  swatch: { alignItems: 'flex-end', borderRadius: 10, borderWidth: 1, height: 44, justifyContent: 'flex-end', overflow: 'hidden', padding: 5, width: 50 },
  swatchAccent: { borderRadius: 5, height: 10, width: '100%' },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '800' },
  optionDescription: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  check: { fontSize: 18, fontWeight: '900', width: 20 },
  customCard: { borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 14 },
  secondaryButton: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  secondaryText: { fontSize: 12, fontWeight: '800' },
  input: { borderRadius: 10, borderWidth: 1, marginTop: 11, minHeight: 43, paddingHorizontal: 11 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 13 },
  accentChoices: { flexDirection: 'row', gap: 10, marginTop: 9 },
  accentChoice: { borderRadius: 15, borderWidth: 2, height: 30, width: 30 },
  preview: { alignItems: 'center', borderRadius: 10, height: 100, justifyContent: 'center', marginTop: 12, overflow: 'hidden' },
  removeWallpaper: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 7 },
  previewImage: { borderRadius: 10, opacity: 0.8 },
  previewText: { backgroundColor: 'rgba(7,11,18,0.72)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  previewCard: { borderRadius: 12, borderWidth: 1, marginTop: 12, minHeight: 110, padding: 13 },
  previewTitle: { fontSize: 16, fontWeight: '900' },
  previewDescription: { fontSize: 11, marginTop: 5 },
  previewChip: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7 },
  previewChipText: { fontSize: 11, fontWeight: '900' },
  saveButton: { alignItems: 'center', borderRadius: 11, justifyContent: 'center', marginTop: 14, minHeight: 46 },
  saveText: { color: '#090d15', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { color: '#f18e8e', fontSize: 13, lineHeight: 19, marginTop: 10 },
  notice: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
