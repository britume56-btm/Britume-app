import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedPost } from '../../services/socialService';

type Props = {
  post: FeedPost;
  currentUserId: string;
  onOpenProfile: (profileId: string) => void;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onEdit?: (post: FeedPost) => void;
  onDelete?: (post: FeedPost) => void;
};

export default function PostCard({
  post,
  currentUserId,
  onOpenProfile,
  onLike,
  onComment,
  onEdit,
  onDelete,
}: Props) {
  const displayName = post.author.display_name?.trim() || 'BRITUME User';
  const username = post.author.username ? `@${post.author.username}` : 'BRITUME member';
  const ownPost = post.author_id === currentUserId;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}'s profile`}
        onPress={() => onOpenProfile(post.author_id)}
        style={styles.authorRow}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.authorDetails}>
          <Text style={styles.authorName}>{displayName}</Text>
          <Text style={styles.username}>{username}</Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(post.created_at).toLocaleDateString()}
        </Text>
      </Pressable>

      <Text style={styles.body}>{post.body}</Text>

      <View style={styles.metrics}>
        <Text style={styles.metricText}>
          {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
        </Text>
        <Text style={styles.metricText}>
          {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.liked_by_me ? 'Unlike post' : 'Like post'}
          onPress={() => onLike(post)}
          style={styles.actionButton}
        >
          <Text style={[styles.actionText, post.liked_by_me && styles.activeAction]}>
            {post.liked_by_me ? '♥ Liked' : '♡ Like'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open comments"
          onPress={() => onComment(post)}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Comment</Text>
        </Pressable>
        {ownPost && onEdit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit post"
            onPress={() => onEdit(post)}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        )}
        {ownPost && onDelete && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete post"
            onPress={() => onDelete(post)}
            style={styles.actionButton}
          >
            <Text style={styles.destructiveAction}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },
  authorRow: {
    alignItems: 'center',
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
  avatarLetter: {
    color: '#090d15',
    fontSize: 16,
    fontWeight: '900',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '800',
  },
  username: {
    color: '#8f9aab',
    fontSize: 12,
    marginTop: 2,
  },
  timestamp: {
    color: '#8f9aab',
    fontSize: 11,
  },
  body: {
    color: '#e5e9ef',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  metrics: {
    borderBottomColor: '#263247',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingBottom: 10,
  },
  metricText: {
    color: '#8f9aab',
    fontSize: 12,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'space-between',
    paddingTop: 9,
  },
  actionButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  actionText: {
    color: '#c5ccd7',
    fontSize: 12,
    fontWeight: '700',
  },
  activeAction: {
    color: '#d9b867',
  },
  destructiveAction: {
    color: '#f18e8e',
    fontSize: 12,
    fontWeight: '700',
  },
});
