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
import Ionicons from 'react-native-vector-icons/Ionicons';

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
  blue: '#5598F5',
  blueDark: '#2869C7',
  paleBlue: '#EAF3FF',
  border: '#D7E7FC',
  text: '#203450',
  muted: '#71839D',
  green: '#299D79',
  purple: '#8A75E8',
  gold: '#D4AF37',
};

type CardProps = {
  children: React.ReactNode;
  style?: object;
};

const GlassCard = memo(function GlassCard({
  children,
  style,
}: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
});

type ToolCardProps = {
  iconName: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
};

const ToolCard = memo(function ToolCard({
  iconName,
  title,
  subtitle,
  onPress,
  iconColor = C.blueDark,
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
        <Ionicons name={iconName} size={19} color={iconColor} />
      </View>

      <View style={styles.toolTextColumn}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={16}
        color={C.muted}
      />
    </Pressable>
  );
});

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
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
        setBio('');
        setAvatarPath(null);
        setAvatarUrl(null);
        return;
      }

      let record = await fetchProfile(user.id);

      if (!record) {
        const emailName = user.email?.split('@')[0] || 'BRITUME User';

        const base =
          emailName
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 20) || 'britumeuser';

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
      setBio(
        typeof user.user_metadata?.bio === 'string'
          ? user.user_metadata.bio
          : 'See Beyond. Move Forward.'
      );

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

          if (active) {
            setAvatarUrl(url);
          }
        } catch (error) {
          console.error('Avatar refresh failed:', error);

          if (active) {
            setAvatarUrl(null);
          }
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
        'Your photo has been uploaded. Tap Save profile to update your profile record.'
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
    const cleanBio = bio.trim();

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

    if (cleanBio.length > 160) {
      Alert.alert(
        'Biography too long',
        'Keep your biography to 160 characters or fewer.'
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
        throw new Error(
          'The profile could not be saved. Check your connection, username availability and Supabase permissions.'
        );
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          bio: cleanBio,
          display_name:
            cleanDisplayName || user.email?.split('@')[0] || 'BRITUME User',
        },
      });

      if (metadataError) {
        Alert.alert(
          'Profile partly saved',
          'Your profile details were saved, but your biography could not be updated. Please try saving again.'
        );
        return;
      }

      setProfile(updated);
      setUsername(updated.username ?? '');
      setDisplayName(updated.display_name ?? '');
      setBio(cleanBio);

      Alert.alert(
        'Profile saved',
        'Your BRITUME profile has been updated.'
      );
    } catch (error) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }, [username, displayName, bio, avatarPath, saving, uploading]);

  const comingSoon = useCallback((name: string) => {
    Alert.alert(
      name,
      'This creator tool is planned for a future BRITUME update.'
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.background}
        />
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.muted}>Loading your BRITUME profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.background}
        />

        <View style={styles.emptyIcon}>
          <Ionicons
            name="person-outline"
            size={34}
            color={C.blueDark}
          />
        </View>

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
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.background}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>YOUR SPACE</Text>
            <Text style={styles.pageTitle}>My profile</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh profile"
            onPress={() => void loadProfile()}
            style={styles.iconButton}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={C.blueDark}
            />
          </Pressable>
        </View>

        <GlassCard style={styles.heroCard}>
          <View style={styles.avatarArea}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={() => void pickAvatar()}
              disabled={uploading}
              style={styles.avatarButton}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={42}
                    color={C.blueDark}
                  />
                </View>
              )}

              <View style={styles.cameraBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </Pressable>

            <Text style={styles.avatarHint}>
              {uploading ? 'Uploading photo…' : 'Tap photo to change'}
            </Text>
          </View>

          <Text style={styles.profileName}>
            {displayName.trim() || 'BRITUME User'}
          </Text>

          <Text style={styles.profileUsername}>
            @{username || 'username'}
          </Text>

          <View style={styles.memberBadge}>
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={C.green}
            />
            <Text style={styles.memberBadgeText}>BRITUME profile</Text>
          </View>

          <Text style={styles.tagline}>See Beyond. Move Forward.</Text>
        </GlassCard>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <Text style={styles.sectionHint}>Edit your information</Text>
        </View>

        <GlassCard>
          <Text style={styles.inputLabel}>Display name</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="person-outline"
              size={19}
              color={C.muted}
            />
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#9AA9BC"
              style={styles.input}
              maxLength={60}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <Text style={styles.inputLabel}>Username</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="your_username"
              placeholderTextColor="#9AA9BC"
              style={styles.input}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.inputLabel}>Biography</Text>
          <View style={[styles.inputWrap, styles.bioWrap]}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a little about yourself"
              placeholderTextColor="#9AA9BC"
              style={styles.bioInput}
              multiline
              maxLength={160}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.characterCount}>
            {bio.length}/160 characters
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void saveProfileData()}
            disabled={saving || uploading}
            style={({ pressed }) => [
              styles.primaryButton,
              (saving || uploading) && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  Save profile
                </Text>
              </>
            )}
          </Pressable>
        </GlassCard>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Creator tools</Text>
          <Text style={styles.sectionHint}>More ways to create</Text>
        </View>

        <View style={styles.toolsList}>
          <ToolCard
            iconName="images-outline"
            title="Gallery"
            subtitle="Your photos and videos"
            onPress={() => navigation.navigate('GALLERY')}
          />

          <ToolCard
            iconName="color-palette-outline"
            title="Themes"
            subtitle="Personalise your BRITUME experience"
            iconColor={C.purple}
            onPress={() => comingSoon('Themes')}
          />

          <ToolCard
            iconName="musical-notes-outline"
            title="Studios"
            subtitle="Music and creative projects"
            iconColor={C.gold}
            onPress={() => comingSoon('Studios')}
          />

          <ToolCard
            iconName="settings-outline"
            title="Settings"
            subtitle="Account and app preferences"
            onPress={() => navigation.navigate('SETTINGS')}
          />
        </View>

        <Text style={styles.footer}>
          BRITUME · See Beyond. Move Forward.
        </Text>
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
    paddingTop: 16,
    paddingBottom: 36,
  },
  centered: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  eyebrow: {
    color: C.blueDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 5,
  },
  pageTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  heroCard: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 22,
  },
  avatarArea: {
    alignItems: 'center',
    marginBottom: 13,
  },
  avatarButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    backgroundColor: C.paleBlue,
    borderWidth: 2,
    borderColor: C.blue,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: C.paleBlue,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: C.paleBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.blueDark,
    borderWidth: 3,
    borderColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    color: C.muted,
    fontSize: 11,
    marginTop: 9,
  },
  profileName: {
    color: C.text,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileUsername: {
    color: C.blueDark,
    fontSize: 14,
    marginTop: 4,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 13,
    backgroundColor: '#EAF8F2',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  memberBadgeText: {
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
  },
  tagline: {
    color: C.muted,
    fontSize: 12,
    marginTop: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHint: {
    color: C.muted,
    fontSize: 11,
  },
  inputLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  atSymbol: {
    color: C.blueDark,
    fontSize: 17,
    fontWeight: '700',
  },
  bioWrap: {
    minHeight: 100,
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bioInput: {
    minHeight: 80,
    flex: 1,
    color: C.text,
    fontSize: 14,
    padding: 4,
  },
  characterCount: {
    color: C.muted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 15,
  },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.blueDark,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.78,
  },
  toolsList: {
    gap: 10,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    gap: 12,
  },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.paleBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTextColumn: {
    flex: 1,
  },
  toolTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
  toolSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.paleBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  heading: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  muted: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  footer: {
    color: C.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 26,
  },
});
