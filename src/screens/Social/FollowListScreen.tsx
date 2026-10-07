import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  getFollowedIds,
  listFollowedProfiles,
  setFollow,
  type PublicProfile,
} from '../../services/socialService';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowList'>;
type FollowListKind = 'followers' | 'following';

export default function FollowListScreen({ navigation, route }: Props) {
  const { userId, kind } = route.params;
  const [currentUserId, setCurrentUserId] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const title = kind === 'followers' ? 'Followers' : 'Following';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) {
            throw userError;
          }
          if (!data.user) {
            throw new Error('Your BRITUME session has expired. Please sign in again.');
          }
          const results = await listFollowedProfiles(userId, kind as FollowListKind);
          const followed = await getFollowedIds(
            data.user.id,
            results.map((profile) => profile.id)
          );
          if (active) {
            setCurrentUserId(data.user.id);
            setProfiles(results);
            setFollowingIds(followed);
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : `Could not load ${title.toLowerCase()}.`);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [kind, title, userId])
  );

  async function toggleFollow(profile: PublicProfile) {
    const currentlyFollowing = followingIds.has(profile.id);
    try {
      await setFollow(currentUserId, profile.id, currentlyFollowing);
      setFollowingIds((current) => {
        const next = new Set(current);
        if (currentlyFollowing) {
          next.delete(profile.id);
        } else {
          next.add(profile.id);
        }
        return next;
      });
    } catch (cause) {
      Alert.alert('Follow update failed', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • SOCIAL</Text>
      <Text style={styles.title}>{title}</Text>
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#d9b867" />
          <Text style={styles.muted}>Loading {title.toLowerCase()}…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : profiles.length === 0 ? (
        <Text style={styles.muted}>No {title.toLowerCase()} to show yet.</Text>
      ) : (
        profiles.map((profile) => {
          const displayName = profile.display_name || 'BRITUME User';
          const isOwnProfile = profile.id === currentUserId;
          const isFollowing = followingIds.has(profile.id);
          return (
            <View key={profile.id} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('PublicProfile', { userId: profile.id })}
                style={styles.identity}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.person}>
                  <Text style={styles.name}>{displayName}</Text>
                  <Text style={styles.username}>
                    {profile.username ? `@${profile.username}` : 'BRITUME member'}
                  </Text>
                </View>
              </Pressable>
              {!isOwnProfile && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void toggleFollow(profile)}
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                >
                  <Text style={[styles.followText, isFollowing && styles.followingText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#070b12',
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 16,
    marginTop: 6,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    padding: 25,
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 13,
    lineHeight: 20,
  },
  error: {
    color: '#f18e8e',
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 9,
    padding: 12,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: '#090d15',
    fontSize: 16,
    fontWeight: '900',
  },
  person: {
    flex: 1,
  },
  name: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '800',
  },
  username: {
    color: '#8f9aab',
    fontSize: 12,
    marginTop: 3,
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 84,
    paddingHorizontal: 10,
  },
  followText: {
    color: '#090d15',
    fontSize: 11,
    fontWeight: '900',
  },
  followingButton: {
    backgroundColor: '#172233',
    borderColor: '#384b61',
    borderWidth: 1,
  },
  followingText: {
    color: '#d9b867',
  },
});
