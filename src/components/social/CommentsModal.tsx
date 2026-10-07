import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createComment,
  deleteComment,
  listPostComments,
  type PostComment,
} from '../../services/socialService';

type Props = {
  visible: boolean;
  postId: string | null;
  currentUserId: string;
  onClose: () => void;
};

export default function CommentsModal({
  visible,
  postId,
  currentUserId,
  onClose,
}: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshComments() {
    if (!postId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setComments(await listPostComments(postId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible && postId) {
      void refreshComments();
    } else {
      setComments([]);
      setDraft('');
      setError(null);
    }
  }, [visible, postId]);

  async function submitComment() {
    if (!postId || !draft.trim() || sending) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createComment(postId, currentUserId, draft);
      setDraft('');
      await refreshComments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send comment.');
    } finally {
      setSending(false);
    }
  }

  function confirmDelete(comment: PostComment) {
    Alert.alert('Delete comment?', 'This removes your comment from the post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteComment(comment.id)
            .then(refreshComments)
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Could not delete comment.');
            });
        },
      },
    ]);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>Comments</Text>
              <Text style={styles.subtitle}>Join the conversation.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close comments"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#d9b867" />
              <Text style={styles.muted}>Loading comments…</Text>
            </View>
          ) : (
            <ScrollView style={styles.commentList} keyboardShouldPersistTaps="handled">
              {error && <Text style={styles.error}>{error}</Text>}
              {comments.length === 0 && !error ? (
                <Text style={styles.empty}>No comments yet. Start the conversation.</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.comment}>
                    <View style={styles.commentHeading}>
                      <Text style={styles.commentAuthor}>
                        {comment.author.display_name || comment.author.username || 'BRITUME User'}
                      </Text>
                      {comment.author_id === currentUserId && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => confirmDelete(comment)}
                        >
                          <Text style={styles.deleteText}>Delete</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.commentBody}>{comment.body}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Write a comment"
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor="#7d8797"
              maxLength={1000}
              multiline
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!draft.trim() || sending}
              onPress={() => void submitComment()}
              style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}
            >
              <Text style={styles.sendText}>{sending ? 'Sending…' : 'Send'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#070b12',
    borderColor: '#263247',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    height: '82%',
    padding: 18,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8f9aab',
    fontSize: 12,
    marginTop: 3,
  },
  closeButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeText: {
    color: '#d9b867',
    fontWeight: '700',
  },
  commentList: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  muted: {
    color: '#8f9aab',
  },
  empty: {
    color: '#c5ccd7',
    lineHeight: 22,
    paddingVertical: 18,
  },
  error: {
    color: '#f18e8e',
    lineHeight: 20,
    marginBottom: 10,
  },
  comment: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  commentHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    color: '#d9b867',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteText: {
    color: '#f18e8e',
    fontSize: 12,
  },
  commentBody: {
    color: '#e5e9ef',
    lineHeight: 20,
    marginTop: 7,
  },
  composer: {
    alignItems: 'flex-end',
    borderTopColor: '#263247',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  input: {
    backgroundColor: '#101722',
    borderColor: '#2c3a4d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f6fa',
    flex: 1,
    maxHeight: 100,
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
    paddingHorizontal: 14,
  },
  sendText: {
    color: '#090d15',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
});
