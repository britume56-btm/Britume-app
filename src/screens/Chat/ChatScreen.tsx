import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import {
  getOrCreateDirectConversation,
  listDirectConversations,
  type DirectConversation,
} from '../../services/chatService';
import {
  ensureOwnPublicProfile,
  searchPublicProfiles,
  type DiscoverableProfile,
} from '../../services/socialService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

function conversationLabel(conversation: DirectConversation): string {
  return (
    conversation.partner_display_name?.trim() ||
    conversation.partner_username ||
    'BRITUME User'
  );
}

export default function ChatScreen({ navigation }: Props) {
  const [currentUserId, setCurrentUserId] = useState('');
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [people, setPeople] = useState<DiscoverableProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const reloadConversations = useCallback(async () => {
    setError(null);
    setConversations(await listDirectConversations());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          await ensureOwnPublicProfile();
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) {
            throw userError;
          }
          if (!data.user) {
            throw new Error('Your BRITUME session has expired. Please sign in again.');
          }
          if (active) {
            setCurrentUserId(data.user.id);
            const result = await listDirectConversations();
            if (active) {
              setConversations(result);
            }
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Could not load CHAT.');
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
    }, [])
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await reloadConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh conversations.');
    } finally {
      setRefreshing(false);
    }
  }

  async function searchPeople() {
    if (!currentUserId) {
      setSearchError('Your account is still loading. Try again in a moment.');
      return;
    }
    const query = searchText.trim();
    if (query.length < 2) {
      setPeople([]);
      setSearchError('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchPublicProfiles(query, currentUserId);
      setPeople(results.filter((person) => person.id !== currentUserId));
    } catch (cause) {
      setSearchError(cause instanceof Error ? cause.message : 'Could not search profiles.');
    } finally {
      setSearching(false);
    }
  }

  async function openConversation(partnerId: string) {
    try {
      const conversationId = await getOrCreateDirectConversation(partnerId);
      navigation.navigate('Conversation', { conversationId, partnerId });
    } catch (cause) {
      Alert.alert('Could not open chat', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>BRITUME • CHAT</Text>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Private one-to-one conversations.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>{refreshing ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Start a conversation</Text>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search members to message"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => void searchPeople()}
          returnKeyType="search"
          autoCapitalize="none"
          maxLength={80}
          placeholder="Search username or display name"
          placeholderTextColor="#7d8797"
          style={styles.searchInput}
        />
        <Pressable
          accessibilityRole="button"
          disabled={searching}
          onPress={() => void searchPeople()}
          style={[styles.searchButton, searching && styles.disabled]}
        >
          <Text style={styles.searchButtonText}>{searching ? '…' : 'Find'}</Text>
        </Pressable>
      </View>
      {searchError && <Text style={styles.error}>{searchError}</Text>}
      {searching && <ActivityIndicator color="#d9b867" style={styles.spinner} />}
      {!searching && searchText.trim().length >= 2 && people.length === 0 && !searchError && (
        <Text style={styles.muted}>No matching profiles found.</Text>
      )}
      {people.map((person) => (
        <Pressable
          key={person.id}
          accessibilityRole="button"
          onPress={() => void openConversation(person.id)}
          style={styles.personRow}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(person.display_name || person.username || 'B').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.personCopy}>
            <Text style={styles.personName}>{person.display_name || 'BRITUME User'}</Text>
            <Text style={styles.personHandle}>
              {person.username ? `@${person.username}` : 'BRITUME member'}
            </Text>
          </View>
          <Text style={styles.startLabel}>Message</Text>
        </Pressable>
      ))}

      <Text style={[styles.sectionTitle, styles.inboxHeading]}>Your conversations</Text>
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#d9b867" />
          <Text style={styles.muted}>Loading conversations…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.emptyTitle}>No conversations yet.</Text>
          <Text style={styles.muted}>
            Search for a BRITUME member above to start a private one-to-one chat.
          </Text>
        </View>
      ) : (
        conversations.map((conversation) => {
          const unread = Number(conversation.unread_count) || 0;
          return (
            <Pressable
              key={conversation.conversation_id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${conversationLabel(conversation)}${unread ? `, ${unread} unread` : ''}`}
              onPress={() =>
                navigation.navigate('Conversation', {
                  conversationId: conversation.conversation_id,
                  partnerId: conversation.partner_id,
                })
              }
              style={styles.conversationRow}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {conversationLabel(conversation).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationCopy}>
                <View style={styles.conversationHeading}>
                  <Text style={styles.personName}>{conversationLabel(conversation)}</Text>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.lastMessage}>
                  {conversation.last_message_body || 'No messages yet. Say hello.'}
                </Text>
                {conversation.last_message_at && (
                  <Text style={styles.timestamp}>
                    {new Date(conversation.last_message_at).toLocaleString()}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
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
    marginBottom: 8,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#9ca8b8',
    fontSize: 13,
    marginTop: 4,
  },
  refreshButton: {
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  refreshText: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#f4f6fa',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    backgroundColor: '#101722',
    borderColor: '#2c3a4d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f6fa',
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: '#090d15',
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  spinner: {
    marginTop: 14,
  },
  personRow: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    padding: 11,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarLetter: {
    color: '#090d15',
    fontSize: 16,
    fontWeight: '900',
  },
  personCopy: {
    flex: 1,
  },
  personName: {
    color: '#f4f6fa',
    fontSize: 13,
    fontWeight: '800',
  },
  personHandle: {
    color: '#8f9aab',
    fontSize: 11,
    marginTop: 3,
  },
  startLabel: {
    color: '#d9b867',
    fontSize: 11,
    fontWeight: '800',
  },
  inboxHeading: {
    marginTop: 26,
  },
  state: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 13,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: '#f18e8e',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyTitle: {
    color: '#f4f6fa',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#090d15',
    fontSize: 12,
    fontWeight: '900',
  },
  conversationRow: {
    alignItems: 'center',
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 8,
    padding: 12,
  },
  conversationCopy: {
    flex: 1,
  },
  conversationHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  lastMessage: {
    color: '#aab4c1',
    fontSize: 12,
    marginTop: 4,
  },
  timestamp: {
    color: '#748094',
    fontSize: 10,
    marginTop: 4,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#090d15',
    fontSize: 10,
    fontWeight: '900',
  },
  chevron: {
    color: '#8f9aab',
    fontSize: 24,
  },
});
