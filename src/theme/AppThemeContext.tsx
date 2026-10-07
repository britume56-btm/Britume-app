import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getAccountPreferences, getThemeBackgroundUrl } from '../services/launchFeatureService';

export type ThemeId = 'midnight' | 'ocean' | 'dusk' | 'nebula' | 'custom';

export type ThemePalette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
};

export const THEME_PALETTES: Record<Exclude<ThemeId, 'custom'>, ThemePalette> = {
  midnight: {
    background: '#070b12',
    surface: '#101722',
    text: '#f4f6fa',
    muted: '#c5ccd7',
    accent: '#d9b867',
    border: '#263247',
  },
  ocean: {
    background: '#07131a',
    surface: '#10232c',
    text: '#eff9fb',
    muted: '#b5c9d0',
    accent: '#65c7d0',
    border: '#29434d',
  },
  dusk: {
    background: '#140c18',
    surface: '#241626',
    text: '#fff3fa',
    muted: '#d0bdcb',
    accent: '#e99abd',
    border: '#493048',
  },
  nebula: {
    background: '#0d0b1b',
    surface: '#19162c',
    text: '#f5f2ff',
    muted: '#c7c1df',
    accent: '#b6a0ff',
    border: '#383253',
  },
};

type AppThemeContextValue = {
  themeId: ThemeId;
  customThemeName: string;
  palette: ThemePalette;
  backgroundUri: string | null;
  applyTheme: (themeId: ThemeId, customThemeName?: string, backgroundUri?: string | null) => void;
  pendingGalleryBackground: string | null;
  selectGalleryBackground: (uri: string) => void;
  clearPendingGalleryBackground: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [themeId, setThemeId] = useState<ThemeId>('midnight');
  const [customThemeName, setCustomThemeName] = useState('Custom theme');
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [pendingGalleryBackground, setPendingGalleryBackground] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const preferences = await getAccountPreferences(userId);
        const id = preferences.theme_id as ThemeId;
        const uri = await getThemeBackgroundUrl(preferences.background_path);
        if (active) {
          if (['midnight', 'ocean', 'dusk', 'nebula', 'custom'].includes(id)) {
            setThemeId(id);
          }
          setCustomThemeName(preferences.custom_theme_name || 'Custom theme');
          setBackgroundUri(uri);
        }
      } catch (error) {
        // A missing launch-feature migration should not prevent sign-in or navigation.
        console.warn('Could not load saved theme preferences:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const applyTheme = useCallback(
    (nextThemeId: ThemeId, nextName = 'Custom theme', nextBackgroundUri: string | null = null) => {
      setThemeId(nextThemeId);
      setCustomThemeName(nextName);
      setBackgroundUri(nextBackgroundUri);
    },
    []
  );
  const selectGalleryBackground = useCallback((uri: string) => setPendingGalleryBackground(uri), []);
  const clearPendingGalleryBackground = useCallback(() => setPendingGalleryBackground(null), []);

  const palette = themeId === 'custom' ? THEME_PALETTES.dusk : THEME_PALETTES[themeId];
  const value = useMemo(
    () => ({
      themeId,
      customThemeName,
      palette,
      backgroundUri,
      applyTheme,
      pendingGalleryBackground,
      selectGalleryBackground,
      clearPendingGalleryBackground,
    }),
    [
      themeId,
      customThemeName,
      palette,
      backgroundUri,
      applyTheme,
      pendingGalleryBackground,
      selectGalleryBackground,
      clearPendingGalleryBackground,
    ]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider.');
  }
  return value;
}
