import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { getPublicProfile, type PublicProfile } from '../../services/socialService';
import {
  hideMessage,
  listMessages,
  markConversationRead,
  sendMessage,
  type DirectMessage,
} from '../../services/chatService';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

export default function ConversationScreen({ navigation, route }: Props) {
  const { conversationId, partnerId } = route.params;
  const [currentUserId, setCurrentUserId] = useState('');
  const [partner, setPartner] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const reloadMessages = useCallback(async (userId: string) => {
    setError(null);
    const [profile, messageRows] = await Promise.all([
      getPublicProfile(partnerId),
      listMessages(conversationId),
    ]);
    if (!profile) {
      throw new Error('This BRITUME profile is not available.');
    }
    setPartner(profile);
    setMessages(messageRows);
    navigation.setOptions({
      title: profile.display_name?.trim() || profile.username || 'CHAT',
    });
    await markConversationRead(conversationId);
  }, [conversationId, navigation, partnerId]);

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
          if (active) {
            setCurrentUserId(data.user.id);
            await reloadMessages(data.user.id);
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Could not load this chat.');
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
    }, [reloadMessages])
  );

  async function refresh() {
    if (!currentUserId) {
      return;
    }
    setRefreshing(true);
    try {
      await reloadMessages(currentUserId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh messages.');
    } finally {
      setRefreshing(false);
    }
  }

  async function submitMessage() {
    if (!draft.trim() || sending || !currentUserId) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendMessage(conversationId, currentUserId, draft);
      setDraft('');
      await reloadMessages(currentUserId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  function confirmHideMessage(message: DirectMessage) {
    Alert.alert(
      'Remove this message for you?',
      'It will disappear from your history. The other participant keeps their copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove for me',
          style: 'destructive',
          onPress: () => {
            void hideMessage(message.id, currentUserId)
              .then(() => reloadMessages(currentUserId))
              .catch((cause: unknown) => {
                Alert.alert(
                  'Could not remove message',
                  cause instanceof Error ? cause.message : 'Try again.'
                );
              });
          },
        },
      ]
    );
  }

  const partnerName =
    partner?.display_name?.trim() || partner?.username || 'BRITUME member';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.topbar}>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{partnerName}</Text>
          <Text style={styles.partnerHandle}>
            {partner?.username ? `@${partner.username}` : 'Private one-to-one chat'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>{refreshing ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#d9b867" />
          <Text style={styles.muted}>Loading message history…</Text>
        </View>
      ) : error && messages.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={(ref) => {
            scrollRef.current = ref;
          }}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {error && <Text style={styles.inlineError}>{error}</Text>}
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start the conversation.</Text>
              <Text style={styles.muted}>Your messages are visible only to these two accounts.</Text>
            </View>
          ) : (
            messages.map((message) => {
              const ownMessage = message.sender_id === currentUserId;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, ownMessage ? styles.ownRow : styles.partnerRow]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={ownMessage ? 'Remove this message for me' : undefined}
                    disabled={!ownMessage}
                    onLongPress={() => ownMessage && confirmHideMessage(message)}
                    style={[styles.bubble, ownMessage ? styles.ownBubble : styles.otherBubble]}
                  >
                    <Text style={[styles.messageText, ownMessage && styles.ownMessageText]}>
                      {message.body}
                    </Text>
                    <Text style={[styles.messageTime, ownMessage && styles.ownMessageTime]}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Write a message"
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor="#7d8797"
          maxLength={4000}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!draft.trim() || sending || loading}
          onPress={() => void submitMessage()}
          style={[styles.sendButton, (!draft.trim() || sending || loading) && styles.disabled]}
        >
          <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
      <Text style={styles.deleteHint}>Long-press your message to remove it from your history.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#070b12',
    flex: 1,
  },
  topbar: {
    alignItems: 'center',
    borderBottomColor: '#263247',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '800',
  },
  partnerHandle: {
    color: '#8f9aab',
    fontSize: 11,
    marginTop: 3,
  },
  refreshButton: {
    borderColor: '#384b61',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  refreshText: {
    color: '#d9b867',
    fontSize: 11,
    fontWeight: '800',
  },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: 11,
    justifyContent: 'center',
    padding: 24,
  },
  muted: {
    color: '#9ca8b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: {
    color: '#f18e8e',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  inlineError: {
    color: '#f18e8e',
    fontSize: 12,
    marginBottom: 10,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
  },
  retryText: {
    color: '#090d15',
    fontSize: 11,
    fontWeight: '900',
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 22,
  },
  emptyTitle: {
    color: '#f4f6fa',
    fontSize: 16,
    fontWeight: '800',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  partnerRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    maxWidth: '84%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  ownBubble: {
    backgroundColor: '#d9b867',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#172233',
    borderBottomLeftRadius: 4,
    borderColor: '#263247',
    borderWidth: 1,
  },
  messageText: {
    color: '#f4f6fa',
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#090d15',
  },
  messageTime: {
    color: '#9ca8b8',
    fontSize: 9,
    marginTop: 5,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: '#413615',
  },
  composer: {
    alignItems: 'flex-end',
    borderTopColor: '#263247',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  input: {
    backgroundColor: '#101722',
    borderColor: '#2c3a4d',
    borderRadius: 13,
    borderWidth: 1,
    color: '#f4f6fa',
    flex: 1,
    maxHeight: 130,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 55,
  },
  sendText: {
    color: '#090d15',
    fontSize: 12,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  deleteHint: {
    color: '#748094',
    fontSize: 10,
    paddingBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 7,
    textAlign: 'center',
  },
});
