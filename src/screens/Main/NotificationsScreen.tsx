import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import {
  getAccountPreferences,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveAccountPreferences,
} from '../../services/launchFeatureService';
import type { AccountPreferences, AppNotification } from '../../services/launchFeatureService';
import { useAppTheme } from '../../theme/AppThemeContext';

type ToggleKey = 'notifications_enabled' | 'social_notifications' | 'account_notifications' | 'product_updates';

const TOGGLES: { key: ToggleKey; title: string; detail: string }[] = [
  { key: 'notifications_enabled', title: 'In-app notifications', detail: 'Show notifications in your BRITUME inbox.' },
  { key: 'social_notifications', title: 'Social activity', detail: 'Likes, comments, follows, and chat activity.' },
  { key: 'account_notifications', title: 'Account activity', detail: 'Important account and profile events.' },
  { key: 'product_updates', title: 'Product updates', detail: 'BRITUME news and feature announcements.' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'social', label: 'Social' },
  { id: 'account', label: 'Account' },
  { id: 'product', label: 'Product' },
  { id: 'system', label: 'System' },
] as const;

const DEFAULT_PREFERENCES: AccountPreferences = {
  theme_id: 'midnight',
  custom_theme_name: null,
  background_path: null,
  custom_accent_color: null,
  notifications_enabled: true,
  social_notifications: true,
  account_notifications: true,
  product_updates: false,
  labs_experiments: { 'focus-mode': false, 'compact-home': false },
};

export default function NotificationsScreen() {
  const { palette } = useAppTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<AccountPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ToggleKey | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [userId, setUserId] = useState('');
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]['id']>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to view notifications.');
      }
      setUserId(data.user.id);
      const [nextPreferences, nextNotifications, nextUnreadCount] = await Promise.all([
        getAccountPreferences(data.user.id),
        listNotifications(data.user.id),
        countUnreadNotifications(data.user.id),
      ]);
      setPreferences(nextPreferences);
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function togglePreference(key: ToggleKey, value: boolean) {
    if (!userId || saving) {
      return;
    }
    const previous = preferences[key];
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaving(key);
    setError('');
    try {
      const changes: Partial<AccountPreferences> = {};
      changes[key] = value;
      await saveAccountPreferences(userId, changes);
    } catch (cause) {
      setPreferences((current) => ({ ...current, [key]: previous }));
      setError(cause instanceof Error ? cause.message : 'Notification setting could not be saved.');
    } finally {
      setSaving(null);
    }
  }

  async function openNotification(item: AppNotification) {
    if (item.read_at) {
      return;
    }
    try {
      await markNotificationRead(item.id);
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark this notification as read.');
    }
  }

  const visibleNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((item) => item.category === filter);

  async function markAllRead() {
    if (!userId || markingAll || unreadCount === 0) {
      return;
    }
    const readAt = new Date().toISOString();
    setMarkingAll(true);
    setError('');
    try {
      await markAllNotificationsRead(userId);
      setNotifications((current) =>
        current.map((item) => (item.read_at ? item : { ...item, read_at: readAt }))
      );
      setUnreadCount(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void load()}
          tintColor={palette.accent}
          colors={[palette.accent]}
        />
      }
    >
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • INBOX</Text>
      <Text style={[styles.title, { color: palette.text }]}>Notifications</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        {unreadCount} unread · In-app history is ready; push delivery still needs a provider.
      </Text>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={() => void load()} disabled={loading} style={[styles.toolbarButton, { borderColor: palette.border }]}>
          <Text style={[styles.toolbarText, { color: palette.accent }]}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void markAllRead()} disabled={markingAll || unreadCount === 0} style={[styles.toolbarButton, { borderColor: palette.border }, (markingAll || unreadCount === 0) && styles.disabled]}>
          <Text style={[styles.toolbarText, { color: palette.accent }]}>{markingAll ? 'Marking…' : 'Mark all read'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>Settings</Text>
      <View style={[styles.settingsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {TOGGLES.map((item, index) => (
          <View key={item.key} style={[styles.toggleRow, index > 0 && { borderTopColor: palette.border, borderTopWidth: 1 }]}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.muted, { color: palette.muted }]}>{item.detail}</Text>
            </View>
            <Switch
              accessibilityLabel={item.title}
              disabled={saving !== null || loading || Boolean(loadError)}
              value={preferences[item.key]}
              onValueChange={(value) => void togglePreference(item.key, value)}
              trackColor={{ false: '#384454', true: palette.accent }}
            />
          </View>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {CATEGORIES.map((category) => {
          const active = filter === category.id;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(category.id)}
              style={[
                styles.filterChip,
                { borderColor: active ? palette.accent : palette.border, backgroundColor: active ? palette.surface : 'transparent' },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? palette.accent : palette.muted }]}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={palette.accent} /></View>
      ) : loadError ? (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={styles.error}>{loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()}>
            <Text style={[styles.retry, { color: palette.accent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.toggleTitle, { color: palette.text }]}>You’re all caught up</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            New account notifications will appear here when a notification source is connected.
          </Text>
        </View>
      ) : (
        visibleNotifications.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.toggleTitle, { color: palette.text }]}>No recent {filter} notifications</Text>
            <Text style={[styles.muted, { color: palette.muted }]}>This view shows the latest 50 account notifications. New activity will appear here when it happens.</Text>
          </View>
        ) : visibleNotifications.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.read_at ? 'Read' : 'Unread'} notification: ${item.title}`}
            onPress={() => void openNotification(item)}
            style={[
              styles.notification,
              { backgroundColor: palette.surface, borderColor: item.read_at ? palette.border : palette.accent },
            ]}
          >
            <View style={styles.notificationHeading}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>{item.title}</Text>
              {!item.read_at ? <Text style={[styles.unread, { color: palette.accent }]}>UNREAD</Text> : null}
            </View>
            <Text style={[styles.muted, { color: palette.muted }]}>{item.body}</Text>
            <Text style={[styles.category, { color: palette.accent }]}>{item.category.toUpperCase()}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  toolbarButton: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  toolbarText: { fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 9, marginTop: 10 },
  filters: { flexDirection: 'row', gap: 7, paddingBottom: 11 },
  filterChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  filterText: { fontSize: 10, fontWeight: '800' },
  settingsCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 13 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 70, paddingVertical: 10 },
  toggleCopy: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '800' },
  muted: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  loading: { alignItems: 'center', padding: 28 },
  empty: { borderRadius: 14, borderWidth: 1, padding: 16 },
  notification: { borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14 },
  notificationHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  unread: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  timestamp: { color: '#7d8797', fontSize: 10, marginTop: 9 },
  category: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9, marginTop: 9 },
  error: { color: '#f18e8e', fontSize: 12, lineHeight: 18 },
  retry: { fontSize: 12, fontWeight: '800', marginTop: 10 },
});
