import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Button,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { saveProfile, fetchProfile, type ProfileRecord } from '../../services/profileService';
import { uploadAvatar } from '../../services/storageService';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      setUsername(profileData?.username ?? '');
      setDisplayName(profileData?.display_name ?? '');
      setAvatarUrl(profileData?.avatar_url ?? null);
      setLoading(false);
    };

    void loadProfile();
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      Alert.alert('Session missing', 'Please sign in again.');
      return;
    }

    try {
      const url = await uploadAvatar(result.assets[0].uri, user.id);
      setAvatarUrl(url);
      Alert.alert('Avatar uploaded', 'Your profile image is ready to save.');
    } catch (error) {
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Unable to upload avatar.'
      );
    }
  };

  const saveProfileData = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      Alert.alert('Session missing', 'Please sign in again.');
      return;
    }

    setSaving(true);

    const profileData = await saveProfile({
      id: user.id,
      username: username.trim(),
      display_name: displayName.trim() || user.email?.split('@')[0] || 'BRITUME User',
      avatar_url: avatarUrl ?? '',
      phone: user.user_metadata?.phone ?? null,
    });

    setSaving(false);

    if (!profileData) {
      Alert.alert('Profile update failed', 'Please confirm your Supabase profile table is configured.');
      return;
    }

    setProfile(profileData);
    Alert.alert('Profile saved', 'Your BRITUME identity has been updated.');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • PROFILE</Text>
      <Text style={styles.title}>Create your BRITUME identity</Text>

      <View style={styles.avatarBox}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>B</Text>
          </View>
        )}
      </View>

      <Button title="Choose avatar" onPress={pickAvatar} />

      <Text style={styles.label}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="yourhandle"
        autoCapitalize="none"
        style={styles.input}
      />

      <Text style={styles.label}>Display name</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="BRITUME user"
        style={styles.input}
      />

      <Button
        title={saving ? 'Saving profile...' : 'Save profile'}
        onPress={saveProfileData}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#070b12',
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070b12',
  },
  kicker: {
    color: '#d9b867',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  label: {
    color: '#dfe5ee',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderWidth: 1,
    borderRadius: 12,
    color: '#f4f6fa',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  avatarBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#d9b867',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#090d15',
    fontSize: 26,
    fontWeight: '900',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
});
