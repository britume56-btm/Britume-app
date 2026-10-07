import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import {
  getAccountPreferences,
  listNotifications,
  markNotificationRead,
  saveAccountPreferences,
} from '../../services/launchFeatureService';
import type { AccountPreferences, AppNotification } from '../../services/launchFeatureService';
import { useAppTheme } from '../../theme/AppThemeContext';

type ToggleKey = 'notifications_enabled' | 'social_notifications' | 'product_updates';

const TOGGLES: { key: ToggleKey; title: string; detail: string }[] = [
  { key: 'notifications_enabled', title: 'In-app notifications', detail: 'Show notifications in your BRITUME inbox.' },
  { key: 'social_notifications', title: 'Social activity', detail: 'Likes, comments, follows, and chat activity.' },
  { key: 'product_updates', title: 'Product updates', detail: 'BRITUME news and feature announcements.' },
];

const DEFAULT_PREFERENCES: AccountPreferences = {
  theme_id: 'midnight',
  custom_theme_name: null,
  background_path: null,
  notifications_enabled: true,
  social_notifications: true,
  product_updates: false,
};

export default function NotificationsScreen() {
  const { palette } = useAppTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<AccountPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ToggleKey | null>(null);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to view notifications.');
      }
      setUserId(data.user.id);
      const [nextPreferences, nextNotifications] = await Promise.all([
        getAccountPreferences(data.user.id),
        listNotifications(data.user.id),
      ]);
      setPreferences(nextPreferences);
      setNotifications(nextNotifications);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notifications could not be loaded.');
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark this notification as read.');
    }
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • INBOX</Text>
      <Text style={[styles.title, { color: palette.text }]}>Notifications</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        {unreadCount} unread · In-app history is ready; push delivery still needs a provider.
      </Text>

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
              disabled={saving !== null || loading}
              value={preferences[item.key]}
              onValueChange={(value) => void togglePreference(item.key, value)}
              trackColor={{ false: '#384454', true: palette.accent }}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent</Text>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={palette.accent} /></View>
      ) : error ? (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={styles.error}>{error}</Text>
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
        notifications.map((item) => (
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
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 9, marginTop: 10 },
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
  error: { color: '#f18e8e', fontSize: 12, lineHeight: 18 },
  retry: { fontSize: 12, fontWeight: '800', marginTop: 10 },
});
