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
import Ionicons from 'react-native-vector-icons/Ionicons';

import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import { THEME_PALETTES, useAppTheme } from '../../theme/AppThemeContext';
import type { ThemeId, ThemePalette } from '../../theme/AppThemeContext';
import {
  getPremiumEntitlement,
  hasPremiumAccess,
  saveAccountPreferences,
} from '../../services/launchFeatureService';

type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;

type ExpandedThemeItem = {
  id: string;
  name: string;
  category: 'Galaxy' | 'Fluid / Gradient' | 'Fluffy' | 'Classic';
  description: string;
  premium?: boolean;
  fontStyle: 'System' | 'Cursive' | 'Rounded' | 'Futuristic';
};

// Expanded list featuring your newly conceptualized premium design categories
const THEME_COLLECTION: ExpandedThemeItem[] = [
  { id: 'midnight', name: 'Midnight Classic', category: 'Classic', description: 'BRITUME signature premium dark and gold', fontStyle: 'System' },
  { id: 'galaxy_supernova', name: 'Supernova Cosmic', category: 'Galaxy', description: 'Glow vectors and blinking stars blanketing the canvas', premium: true, fontStyle: 'Futuristic' },
  { id: 'galaxy_andromeda', name: 'Andromeda Nebula', category: 'Galaxy', description: 'Cosmic violet dust fields with high contrast stellar spots', premium: true, fontStyle: 'Futuristic' },
  { id: 'fluid_aurora', name: 'Aurora Borealis', category: 'Fluid / Gradient', description: 'Smooth moving gradient currents morphing across layers', fontStyle: 'System' },
  { id: 'fluid_sunset', name: 'Neon Horizon', category: 'Fluid / Gradient', description: 'Vibrant neon pink, orange, and purple color merges', fontStyle: 'System' },
  { id: 'fluffy_cloud', name: 'Cotton Dream', category: 'Fluffy', description: 'Pillowy soft shapes, pastel pinks, and ultra-high shadows', fontStyle: 'Rounded' },
  { id: 'fluffy_lavender', name: 'Marshmallow Mist', category: 'Fluffy', description: 'Friendly rounded layouts in light cozy purple tints', fontStyle: 'Rounded' },
];

// Rich preview layer that morphs its inner content styling based on theme attributes
function AdvancedLivePreview({ item, selected }: { item: ExpandedThemeItem; selected: boolean }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    rotationLoop.start();
    shimmerLoop.start();
    return () => {
  rotationLoop.stop();
  shimmerLoop.stop();
};

  const spin = rotation.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '360deg'],
});

  // 1. Dynamic visual styles based on category configurations
  let containerStyle: any = { backgroundColor: '#FFFFFF', borderRadius: 16 };
  let cardTitleFont: any = { fontWeight: '900', fontSize: 20 };

  if (item.category === 'Galaxy') {
    containerStyle = { backgroundColor: '#0B0F19', borderColor: '#1F293D' };
  } else if (item.category === 'Fluid / Gradient') {
    containerStyle = { backgroundColor: '#1A102F', borderColor: '#3A205A' };
  } else if (item.category === 'Fluffy') {
    containerStyle = { backgroundColor: '#FFF5F7', borderRadius: 28, shadowRadius: 20, shadowOpacity: 0.1 };
  }

  // 2. Adjust font variables inline dynamically
  if (item.fontStyle === 'Futuristic') cardTitleFont.letterSpacing = 2;
  if (item.fontStyle === 'Rounded') cardTitleFont.fontWeight = '600';

  return (
    <View style={[styles.advancedPreview, containerStyle, selected && { borderWidth: 2, borderColor: '#D4AF37' }]}>
      {/* Galaxy Effect Layer: Star maps floating in space */}
      {item.category === 'Galaxy' && (
        <Animated.View style={[styles.cosmicOrbitMask, { transform: [{ rotate: spin }] }]}>
          <Text style={[styles.stellarParticle, { top: 20, left: 40 }]}>⭐</Text>
          <Text style={[styles.stellarParticle, { bottom: 30, right: 50 }]}>✨</Text>
          <Animated.Text style={[styles.stellarParticle, { top: 60, right: 30, opacity: shimmer }]}>🌟</Animated.Text>
        </Animated.View>
      )}

      {/* Fluffy Effect Layer: Cloud background vectors */}
      {item.category === 'Fluffy' && (
        <View style={styles.fluffyCloudOverlay}>
          <Text style={{ fontSize: 40, opacity: 0.12, position: 'absolute', right: 10, top: 10 }}>☁️</Text>
        </View>
      )}

      <View style={styles.previewMetaWrapper}>
        <Text style={[styles.previewCategoryKicker, { color: item.category === 'Galaxy' ? '#D4AF37' : '#71839D' }]}>
          {item.category.toUpperCase()} WORKSPACE
        </Text>
        <Text style={[cardTitleFont, { color: item.category === 'Galaxy' || item.category === 'Fluid / Gradient' ? '#FFFFFF' : '#203450', marginTop: 4 }]}>
          {item.name}
        </Text>
        <Text style={{ fontSize: 11, color: '#91A2B8', marginTop: 2 }}>Template Architecture: {item.fontStyle}</Text>

        <View style={[styles.sampleGlassElement, item.category === 'Fluffy' && { borderRadius: 20, backgroundColor: '#FFFFFF' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: item.category === 'Galaxy' ? '#FFFFFF' : '#203450' }}>Feed Layout Grid</Text>
          <View style={[styles.sampleBarIndicator, { backgroundColor: item.category === 'Galaxy' ? '#D4AF37' : '#5598F5' }]} />
        </View>
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
    async function loadAccountData() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUserId(data.user.id);
          const entitlement = await getPremiumEntitlement(data.user.id);
          setPremiumActive(hasPremiumAccess(entitlement));
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setScreenLoading(false);
      }
    }
    void loadAccountData();
  }, []);

  const handleApplyLayoutTheme = async (item: ExpandedThemeItem) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please authenticate your account to sync templates.');
      return;
    }
    if (item.premium && !premiumActive) {
      Alert.alert('Premium Blueprint', 'Unlock this theme catalog by managing your subscription profile.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Premium', onPress: () => navigation.navigate('Premium') }
      ]);
      return;
    }

    setSaving(true);
    try {
      // Map expanded category ids down to keys configured inside your THEME_PALETTES global styles engine
      const basicPaletteId = item.id.startsWith('galaxy') ? 'midnight' : 'ocean';
      const targetPalette = THEME_PALETTES[basicPaletteId as ThemeId] || THEME_PALETTES.midnight;

      await saveAccountPreferences(userId, {
        theme_id: basicPaletteId,
        custom_theme_name: item.name,
        background_path: null,
        custom_accent_color: targetPalette.accent,
      });

      applyTheme(basicPaletteId, item.name, null, targetPalette.accent);
      Alert.alert('Theme Injected', `${item.name} custom structural profiles applied successfully.`);
    } catch {
      Alert.alert('Sync Error', 'Could not cache layout variables.');
    } finally {
      setSaving(false);
    }
  };

  if (screenLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={styles.customHeaderArea}>
        <Pressable onPress={() => navigation.goBack()} style={styles.circularBackIcon}>
          <Ionicons name="arrow-back-outline" size={16} color={palette.text} />
        </Pressable>
        <View>
          <Text style={[styles.eyebrowText, { color: palette.accent }]}>BRITUME UNIVERSE CONFIG</Text>
          <Text style={[styles.mainScreenTitle, { color: palette.text }]}>Visual Templates</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitleHeader}>SELECT METRIC CORE EXPERIENCE</Text>
        
        <View style={styles.verticalGridList}>
          {THEME_COLLECTION.map((item) => {
            const isSelected = customThemeName === item.name || (themeId === item.id && !customThemeName);
            return (
              <View key={item.id} style={[styles.unifiedThemeCardContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <AdvancedLivePreview item={item} selected={isSelected} />
                
                <View style={styles.cardDetailsSection}>
                  <View style={styles.rowLabelContainer}>
                    <Text style={[styles.themeLabelNameText, { color: palette.text }]}>{item.name}</Text>
