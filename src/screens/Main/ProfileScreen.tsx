
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  saveProfile,
  fetchProfile,
} from '../../services/profileService';
import { uploadAvatar } from '../../services/storageService';
import type { ProfileRecord } from '../../types/profile';

const COLORS = {
  background: '#070B18',
  surface: '#11182A',
  glass: 'rgba(28, 40, 68, 0.68)',
  border: 'rgba(151, 174, 255, 0.24)',
  blue: '#65D9FF',
  purple: '#A58BFF',
  gold: '#E7C879',
  white: '#F5F7FF',
  muted: '#A6B2D0',
  green: '#69E6B5',
};

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

      if (!data.user) {
        setProfile(null);
        setUsername('');
        setDisplayName('');
        setAvatarPath(null);
        setAvatarUrl(null);
        return;
      }

      const profileData = await fetchProfile(data.user.id);

      setProfile(profileData);
      setUsername(profileData?.username ?? '');
      setDisplayName(profileData?.display_name ?? '');

      const path =
        profileData?.avatar_path ??
        getLegacyAvatarObjectPath(
          profileData?.avatar_url,
          data.user.id
        );

      setAvatarPath(path);
    } catch (error) {
      Alert.alert(
        'Profile unavailable',
        error instanceof Error
          ? error.message
          : 'Please try again.'
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

      const refreshAvatar = async () => {
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
      };

      void refreshAvatar();

      return () => {
        active = false;
      };
    }, [avatarPath])
  );

  const pickAvatar = async () => {
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

      const path = await uploadAvatar(
        result.assets[0].uri,
        user.id
      );

      const url = await getAvatarSignedUrl(path);

      setAvatarPath(path);
      setAvatarUrl(url);

      Alert.alert(
        'Avatar ready',
        'Your new profile picture is ready. Save your profile to confirm.'
      );
    } catch (error) {
      Alert.alert(
        'Photo upload failed',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const saveProfileData = async () => {
    if (saving) return;

    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername) {
      Alert.alert('Username required', 'Enter a username first.');
      return;
    }

    if (/\s/.test(cleanUsername)) {
      Alert.alert(
        'Invalid username',
        'Usernames cannot contain spaces.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;

      const user = data.user;

      if (!user) {
        Alert.alert('Session expired', 'Please sign in again.');
        return;
      }

      const updatedProfile = await saveProfile({
        id: user.id,
        username: cleanUsername,
        display_name:
          cleanDisplayName ||
          user.email?.split('@')[0] ||
          'BRITUME User',
        avatar_path: avatarPath,
        phone: user.user_metadata?.phone ?? null,
      });

      if (!updatedProfile) {
        Alert.alert(
          'Profile not saved',
          'Check your Supabase profile table and try again.'
        );
        return;
      }

      setProfile(updatedProfile);
      setUsername(updatedProfile.username ?? '');
      setDisplayName(updatedProfile.display_name ?? '');
      setAvatarPath(updatedProfile.avatar_path);

      Alert.alert(
        'Identity updated',
        'Your BRITUME profile has been saved successfully.'
      );
    } catch (error) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error
          ? error.message
          : 'Please check your connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(
      feature,
      'This creator tool is planned for a future BRITUME update.'
    );
  };

  const GlassCard = ({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: object;
  }) => (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );

  const StudioCard = ({
    symbol,
    title,
    subtitle,
    color,
    onPress,
  }: {
    symbol: string;
    title: string;
    subtitle: string;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.studioCard,
        { borderColor: `${color}55` },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.studioIcon,
          { backgroundColor: `${color}18` },
        ]}
      >
        <Text style={[styles.studioSymbol, { color }]}>
          {symbol}
        </Text>
      </View>

      <Text style={styles.studioTitle}>{title}</Text>
      <Text style={styles.studioSubtitle}>{subtitle}</Text>
      <Text style={[styles.studioAction, { color }]}>
        Explore →
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>
          Entering your universe…
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.emptyTitle}>Your universe awaits</Text>
        <Text style={styles.mutedText}>
          Sign in to load your BRITUME profile.
        </Text>
        <Pressable
          onPress={() => void loadProfile()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>B R I T U M E</Text>
            <Text style={styles.pageHeading}>Your Universe</Text>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>MY PROFILE</Text>
          </View>
        </View>

        {/* Profile identity */}
        <GlassCard style={styles.heroCard}>
          <View pointerEvents="none" style={styles.ambientGlow} />

          <View style={styles.avatarArea}>
            <View style={styles.outerOrbit}>
              <View style={styles.middleOrbit}>
                <View style={styles.avatarFrame}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatar}
                      accessibilityLabel="Profile picture"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetter}>B</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={pickAvatar}
              disabled={uploading}
              style={styles.avatarEditButton}
            >
              {uploading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.background}
                />
              ) : (
                <Text style={styles.avatarEditSymbol}>✎</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.displayName}>
            {displayName || 'Your Display Name'}
          </Text>

          <Text style={styles.username}>
            @{username || 'yourusername'}
          </Text>

          <Text style={styles.profileDescription}>
            Your world. Your vision. Your creations.
          </Text>

          <Pressable
            onPress={pickAvatar}
            disabled={uploading}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {uploading ? 'Uploading photo…' : '✧  Change profile photo'}
            </Text>
          </Pressable>
        </GlassCard>

        {/* Edit identity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your identity</Text>
          <Text style={styles.sectionCaption}>PERSONALIZE</Text>
        </View>

        <GlassCard>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="yourhandle"
            placeholderTextColor="#74819F"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            accessibilityLabel="Username"
            style={styles.input}
          />

          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor="#74819F"
            autoCapitalize="words"
            maxLength={60}
            accessibilityLabel="Display name"
            style={styles.input}
          />

          <Pressable
            accessibilityRole="button"
            onPress={saveProfileData}
            disabled={saving || uploading}
            style={({ pressed }) => [
              styles.primaryButton,
              (saving || uploading) && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                Save changes  →
              </Text>
            )}
          </Pressable>
        </GlassCard>

        {/* Creator Room */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Creator Room</Text>
            <Text style={styles.sectionDescription}>
              Your tools. Your imagination.
            </Text>
          </View>

          <Text style={styles.sparkle}>✦</Text>
        </View>

        <View style={styles.studioGrid}>
          <StudioCard
            symbol="♫"
            title="Music Studio"
            subtitle="Beats and music"
            color={COLORS.blue}
            onPress={() => showComingSoon('Music Studio')}
          />

          <StudioCard
            symbol="▧"
            title="Photo Lab"
            subtitle="Edit your photos"
            color={COLORS.purple}
            onPress={() => showComingSoon('Photo Lab')}
          />

          <StudioCard
            symbol="✧"
            title="Cartoon Studio"
            subtitle="Build your scenes"
            color={COLORS.gold}
            onPress={() => showComingSoon('Cartoon Studio')}
          />

          <StudioCard
            symbol="◈"
            title="My Creations"
            subtitle="Your creative portfolio"
            color={COLORS.green}
            onPress={() => showComingSoon('My Creations')}
          />
        </View>

        {/* Profile footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>BRITUME</Text>
          <Text style={styles.footerText}>
            SEE BEYOND. MOVE FORWARD.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 40,
    gap: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
    gap: 14,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 8,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '800',
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  kicker: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  pageHeading: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(87, 128, 190, 0.13)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  statusText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  glassCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
  },
  heroCard: {
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 22,
  },
  ambientGlow: {
    position: 'absolute',
    top: -90,
    width: 220,
    height: 180,
    borderRadius: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(83, 102, 255, 0.10)',
  },
  avatarArea: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  outerOrbit: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1.5,
    borderColor: 'rgba(101, 217, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleOrbit: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(165, 139, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#243359',
  },
  avatarLetter: {
    color: COLORS.gold,
    fontSize: 46,
    fontWeight: '900',
  },
  avatarEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 3,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.blue,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditSymbol: {
    color: COLORS.background,
    fontSize: 19,
    fontWeight: '900',
  },
  displayName: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  username: {
    color: COLORS.blue,
    fontSize: 14,
    marginTop: 5,
  },
  profileDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 17,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(101, 217, 255, 0.4)',
    backgroundColor: 'rgba(101, 217, 255, 0.07)',
  },
  secondaryButtonText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionCaption: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sectionDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    minHeight: 49,
    backgroundColor: 'rgba(4, 9, 22, 0.58)',
    borderColor: 'rgba(151, 174, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 13,
    color: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 6,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  studioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  studioCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 158,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(25, 33, 58, 0.72)',
  },
  studioIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  studioSymbol: {
    fontSize: 25,
    fontWeight: '800',
  },
  studioTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  studioSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
  studioAction: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 12,
  },
  sparkle: {
    color: COLORS.purple,
    fontSize: 25,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerLogo: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  footerText: {
    color: '#7685A8',
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 7,
  },
});
