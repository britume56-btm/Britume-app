
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../../lib/supabase';
import {
  getAvatarSignedUrl,
  getLegacyAvatarObjectPath,
} from '../../services/avatarService';
import { fetchProfile, saveProfile } from '../../services/profileService';
import { uploadAvatar } from '../../services/storageService';
import type { ProfileRecord } from '../../types/profile';

const C = {
  background: '#F2F7FF',
  surface: '#FFFFFF',
  glass: 'rgba(255,255,255,0.82)',
  blue: '#5598F5',
  blueDark: '#2869C7',
  paleBlue: '#EAF3FF',
  border: '#D7E7FC',
  text: '#203450',
  muted: '#71839D',
  green: '#299D79',
  purple: '#8A75E8',
};

type CardProps = {
  children: React.ReactNode;
  style?: object;
};

const GlassCard = memo(function GlassCard({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
});

type ToolCardProps = {
  symbol: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

const ToolCard = memo(function ToolCard({
  symbol,
  title,
  subtitle,
  onPress,
}: ToolCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.toolIcon}>
        <Text style={styles.toolSymbol}>{symbol}</Text>
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolSubtitle}>{subtitle}</Text>
      <Text style={styles.toolAction}>Explore →</Text>
    </Pressable>
  );
});

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;

      if (!user) {
        setProfile(null);
        setUsername('');
        setDisplayName('');
        setAvatarPath(null);
        setAvatarUrl(null);
        return;
      }

      let record = await fetchProfile(user.id);

      if (!record) {
        const emailName = user.email?.split('@')[0] || 'BRITUME User';
        const base =
          emailName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) ||
          'britumeuser';

        record = await saveProfile({
          id: user.id,
          username: `${base}_${user.id.replace(/-/g, '').slice(-6)}`,
          display_name:
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            emailName,
          avatar_path: null,
          phone: user.phone ?? null,
        });
      }

      if (!record) {
        throw new Error(
          'Your profile could not be loaded or created. Check your Supabase profiles table and permissions.'
        );
      }

      setProfile(record);
      setUsername(record.username ?? '');
      setDisplayName(record.display_name ?? '');

      setAvatarPath(
        record.avatar_path ??
          getLegacyAvatarObjectPath(record.avatar_url, user.id)
      );
    } catch (error) {
      Alert.alert(
        'Profile unavailable',
        error instanceof Error
          ? error.message
          : 'Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function refreshAvatar() {
        if (!avatarPath) {
          setAvatarUrl(null);
          return;
        }

        try {
          const url = await getAvatarSignedUrl(avatarPath);
          if (active) setAvatarUrl(url);
        } catch (error) {
          console.error('Avatar refresh failed:', error);
          if (active) setAvatarUrl(null);
        }
      }

      void refreshAvatar();

      return () => {
        active = false;
      };
    }, [avatarPath])
  );

  const pickAvatar = useCallback(async () => {
    if (uploading) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;

      if (!user) {
        Alert.alert('Session expired', 'Please sign in again.');
        return;
      }

      setUploading(true);

      const path = await uploadAvatar(result.assets[0].uri, user.id);
      const url = await getAvatarSignedUrl(path);

      setAvatarPath(path);
      setAvatarUrl(url);

      Alert.alert(
        'Photo uploaded',
        'Your new photo is ready. Save your profile to confirm the change.'
      );
    } catch (error) {
      Alert.alert(
        'Photo upload failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }, [uploading]);

  const saveProfileData = useCallback(async () => {
    if (saving || uploading) return;

    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername) {
      Alert.alert('Username required', 'Enter a username first.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]{2,30}$/.test(cleanUsername)) {
      Alert.alert(
        'Invalid username',
        'Use 2–30 letters, numbers, underscores, dots or hyphens. Do not use spaces.'
      );
      return;
    }

    setSaving(true);
    Keyboard.dismiss();

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;

      if (!user) {
        Alert.alert('Session expired', 'Please sign in again.');
        return;
      }

      const updated = await saveProfile({
        id: user.id,
        username: cleanUsername,
        display_name:
          cleanDisplayName || user.email?.split('@')[0] || 'BRITUME User',
        avatar_path: avatarPath,
        phone: user.phone ?? null,
      });

      if (!updated) {
        Alert.alert(
          'Profile not saved',
          'The save failed. Check your connection, username availability and Supabase permissions.'
        );
        return;
      }

      setProfile(updated);
      setUsername(updated.username ?? '');
      setDisplayName(updated.display_name ?? '');
      setAvatarPath(updated.avatar_path ?? null);

      Alert.alert('Profile saved', 'Your BRITUME profile has been updated.');
    } catch (error) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }, [username, displayName, avatarPath, saving, uploading]);

  const comingSoon = useCallback((name: string) => {
    Alert.alert(
      name,
      'This creator tool is planned for a future BRITUME update.'
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.muted}>Loading your BRITUME profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <Text style={styles.heading}>Your profile awaits</Text>
        <Text style={styles.muted}>
          Sign in to view your profile, then try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadProfile()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>BRITUME</Text>
            <Text style={styles.heading}>Your Universe</Text>
            <Text style={styles.tagline}>See Beyond. Move Forward.</Text>
          </View>
          <View style={styles.profilePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.pillText}>MY PROFILE</Text>
          </View>
        </View>

        <GlassCard style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarFrame}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  accessibilityLabel="Profile picture"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>B</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.displayName}>
            {displayName || 'Your Display Name'}
          </Text>
          <Text style={styles.handle}>@{username || 'yourusername'}</Text>
          <Text style={styles.heroDescription}>
            Your world. Your vision. Your creations.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={pickAvatar}
            disabled={uploading}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              uploading && styles.disabled,
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={C.blueDark} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                ✧  Change profile photo
              </Text>
            )}
          </Pressable>
        </GlassCard>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Your identity</Text>
          <Text style={styles.sectionNote}>PERSONALIZE</Text>
        </View>

        <GlassCard>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="yourhandle"
            placeholderTextColor="#91A2B8"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            maxLength={30}
            returnKeyType="next"
            blurOnSubmit={false}
            accessibilityLabel="Username"
            style={styles.input}
          />

          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor="#91A2B8"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={60}
            returnKeyType="done"
            accessibilityLabel="Display name"
            style={styles.input}
          />

          <Pressable
            accessibilityRole="button"
            onPress={saveProfileData}
            disabled={saving || uploading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              (saving || uploading) && styles.disabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save changes  →</Text>
            )}
          </Pressable>
        </GlassCard>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Creator Room</Text>
            <Text style={styles.sectionSubheading}>
              Tools for your next idea
            </Text>
          </View>
          <Text style={styles.sparkle}>✦</Text>
        </View>

        <View style={styles.toolGrid}>
          <ToolCard
            symbol="♫"
            title="Music Studio"
            subtitle="Beats and music"
            onPress={() => comingSoon('Music Studio')}
          />
          <ToolCard
            symbol="▧"
            title="Photo Lab"
            subtitle="Edit your photos"
            onPress={() => comingSoon('Photo Lab')}
          />
          <ToolCard
            symbol="✧"
            title="Cartoon Studio"
            subtitle="Create scenes"
            onPress={() => comingSoon('Cartoon Studio')}
          />
          <ToolCard
            symbol="◈"
            title="My Creations"
            subtitle="Your portfolio"
            onPress={() => comingSoon('My Creations')}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>BRITUME</Text>
          <Text style={styles.footerTagline}>SEE BEYOND. MOVE FORWARD.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 42,
    gap: 17,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.background,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brand: {
    color: C.blueDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  heading: {
    color: C.text,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },
  tagline: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  pillText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  card: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 23,
    padding: 18,
    shadowColor: '#7FA9DD',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 2,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3,
    borderColor: '#C6DFFF',
    padding: 5,
    marginBottom: 14,
  },
  avatarFrame: {
    flex: 1,
    borderRadius: 58,
    overflow: 'hidden',
    backgroundColor: C.paleBlue,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: C.blue,
    fontSize: 45,
    fontWeight: '900',
  },
  displayName: {
    color: C.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  handle: {
    color: C.blueDark,
    fontSize: 14,
    marginTop: 5,
  },
  heroDescription: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: C.paleBlue,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryButtonText: {
    color: C.blueDark,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionNote: {
    color: C.blueDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionSubheading: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 7,
    marginBottom: 8,
  },
  input: {
    minHeight: 49,
    backgroundColor: '#F8FBFF',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 13,
    color: C.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 13,
  },
  primaryButton: {
    minHeight: 49,
    borderRadius: 15,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.55,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    flexGrow: 1,
    flexBasis: '44%',
    minHeight: 150,
    padding: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  toolIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.paleBlue,
    marginBottom: 11,
  },
  toolSymbol: {
    color: C.blueDark,
    fontSize: 23,
    fontWeight: '800',
  },
  toolTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
  },
  toolSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  toolAction: {
    color: C.blueDark,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 12,
  },
  sparkle: {
    color: C.purple,
    fontSize: 25,
  },
  pressed: {
    opacity: 0.78,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 5,
  },
  footerBrand: {
    color: C.blueDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  footerTagline: {
    color: C.muted,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 7,
  },
  muted: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
