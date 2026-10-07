import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  getAccountPreferences,
  getThemeBackgroundUrl,
  saveAccountPreferences,
  uploadThemeBackground,
} from '../../services/launchFeatureService';
import { RewardedThemeAd } from '../../components/monetization/MonetizationSlots';
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
  { id: 'nebula', name: 'Nebula', description: 'A premium theme, ready for billing setup.', premium: true },
];

export default function ThemesScreen({ navigation, route }: Props) {
  const {
    themeId,
    customThemeName,
    backgroundUri,
    palette,
    applyTheme,
    pendingGalleryBackground,
    clearPendingGalleryBackground,
  } = useAppTheme();
  const [selected, setSelected] = useState<ThemeId>(themeId);
  const [draftName, setDraftName] = useState(customThemeName);
  const [draftBackground, setDraftBackground] = useState<string | null>(backgroundUri);
  const [savedBackgroundPath, setSavedBackgroundPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSelected(themeId);
    setDraftName(customThemeName);
    setDraftBackground(backgroundUri);
  }, [themeId, customThemeName, backgroundUri]);

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
        if (active) {
          setSavedBackgroundPath(preferences.background_path);
          if (preferences.custom_theme_name) {
            setDraftName(preferences.custom_theme_name);
          }
        }
      } catch {
        // The page remains usable; saving will show the migration/setup error if needed.
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
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to save your theme.');
      }
      if (selected === 'nebula') {
        setNotice('Nebula is a premium theme. Purchases are not connected yet.');
        setSelected(themeId);
        return;
      }

      let backgroundPath = selected === 'custom' ? savedBackgroundPath : null;
      let nextBackgroundUri = selected === 'custom' ? draftBackground : null;
      if (selected === 'custom' && draftBackground && !/^https?:\/\//i.test(draftBackground)) {
        backgroundPath = await uploadThemeBackground(data.user.id, draftBackground);
        nextBackgroundUri = await getThemeBackgroundUrl(backgroundPath);
      }

      await saveAccountPreferences(data.user.id, {
        theme_id: selected,
        custom_theme_name: selected === 'custom' ? draftName.trim() || 'Custom theme' : null,
        background_path: backgroundPath,
      });
      setSavedBackgroundPath(backgroundPath);
      applyTheme(selected, draftName.trim() || 'Custom theme', nextBackgroundUri);
      setDraftBackground(nextBackgroundUri);
      setNotice('Theme saved to your BRITUME account.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Theme could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const selectTheme = (id: ThemeId) => {
    if (id === 'nebula') {
      setNotice('Nebula is marked premium; connect billing before offering purchases.');
      return;
    }
    setSelected(id);
    setError('');
    setNotice('');
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • PERSONALIZE</Text>
      <Text style={[styles.title, { color: palette.text }]}>Themes</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        Choose a built-in theme or create a custom one. Your selection is saved to your account;
        custom backgrounds appear on the LIVING screen.
      </Text>

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
          Custom themes are included in the account settings structure; premium pricing and rewarded
          unlocks stay inactive until billing or ads are connected.
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
        {draftBackground ? (
          <ImageBackground
            source={{ uri: draftBackground }}
            imageStyle={styles.previewImage}
            style={styles.preview}
          >
            <Text style={styles.previewText}>Background preview</Text>
          </ImageBackground>
        ) : null}
      </View>

      <RewardedThemeAd />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={[styles.notice, { color: palette.accent }]}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={() => void saveTheme()}
        style={[styles.saveButton, { backgroundColor: palette.accent }, saving && styles.disabled]}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save theme to account'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
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
  preview: { alignItems: 'center', borderRadius: 10, height: 100, justifyContent: 'center', marginTop: 12, overflow: 'hidden' },
  previewImage: { borderRadius: 10, opacity: 0.8 },
  previewText: { backgroundColor: 'rgba(7,11,18,0.72)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  saveButton: { alignItems: 'center', borderRadius: 11, justifyContent: 'center', marginTop: 14, minHeight: 46 },
  saveText: { color: '#090d15', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { color: '#f18e8e', fontSize: 13, lineHeight: 19, marginTop: 10 },
  notice: { fontSize: 13, lineHeight: 19, marginTop: 10 },
});
