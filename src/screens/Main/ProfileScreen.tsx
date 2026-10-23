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
  glass: 'rgba(255,255,255,0.92)',
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

const GlassCard = memo(function GlassCard({ children, style }: CardProps) {
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
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.toolTextColumn}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={14} color={C.muted} />
    </Pressable>
  );
});

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState(''); // New custom biography state
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
      // Handle fallback bio if database column is present or uses user metadata attributes
      setBio(record.raw_profile_data?.bio ?? 'See Beyond. Move Forward.');

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
        aspect:,
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

      // Appending bio inside raw metadata dictionary profile payload fields
      const updated = await saveProfile({
        id: user.id,
        username: cleanUsername,
        display_name:
          cleanDisplayName || user.email?.split('@')[0] || 'BRITUME User',
        avatar_path: avatarPath,
        phone: user.phone ?? null,
        raw_profile_data: { bio: bio.trim() },
      } as any);

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
      setBio(updated.raw_profile_data?.bio ?? '');
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
