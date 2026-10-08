import { supabase } from '../../lib/supabase';

export type AccountPreferences = {
  theme_id: string;
  custom_theme_name: string | null;
  background_path: string | null;
  custom_accent_color: string | null;
  notifications_enabled: boolean;
  social_notifications: boolean;
  account_notifications: boolean;
  product_updates: boolean;
  labs_experiments: LabsExperimentSettings;
};

export type LabExperimentId = 'focus-mode' | 'compact-home';
export type LabsExperimentSettings = Record<LabExperimentId, boolean>;

export type AppNotification = {
  id: string;
  actor_id: string | null;
  title: string;
  body: string;
  category: string;
  read_at: string | null;
  created_at: string;
};

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

export async function getAccountPreferences(userId: string): Promise<AccountPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select(
      'theme_id, custom_theme_name, background_path, custom_accent_color, notifications_enabled, social_notifications, account_notifications, product_updates, labs_experiments'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        ...DEFAULT_PREFERENCES,
        ...data,
        labs_experiments: {
          ...DEFAULT_PREFERENCES.labs_experiments,
          ...(data.labs_experiments ?? {}),
        },
      }
    : DEFAULT_PREFERENCES;
}

export async function saveAccountPreferences(
  userId: string,
  changes: Partial<AccountPreferences>
): Promise<void> {
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      ...changes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
}

export async function uploadThemeBackground(
  userId: string,
  fileUri: string
): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/theme-background-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('theme-backgrounds').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return path;
}

export async function getThemeBackgroundUrl(path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from('theme-backgrounds')
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function deleteThemeBackground(path: string | null): Promise<void> {
  if (!path) {
    return;
  }
  const { error } = await supabase.storage.from('theme-backgrounds').remove([path]);
  if (error) {
    throw error;
  }
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('app_notifications')
    .select('id, actor_id, title, body, category, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    throw error;
  }
}

export type PremiumEntitlement = {
  status: 'inactive' | 'active' | 'grace_period' | 'past_due' | 'canceled';
  provider: string | null;
  product_id: string | null;
  expires_at: string | null;
};

export async function getPremiumEntitlement(userId: string): Promise<PremiumEntitlement> {
  const { data, error } = await supabase
    .from('premium_entitlements')
    .select('status, provider, product_id, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? {
    status: 'inactive',
    provider: null,
    product_id: null,
    expires_at: null,
  };
}

export function hasPremiumAccess(
  entitlement: PremiumEntitlement,
  now = Date.now()
): boolean {
  if (
    entitlement.status !== 'active' &&
    entitlement.status !== 'grace_period' &&
    entitlement.status !== 'canceled'
  ) {
    return false;
  }
  if (!entitlement.expires_at) {
    return entitlement.status === 'active' || entitlement.status === 'grace_period';
  }
  const expiresAt = Date.parse(entitlement.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now;
}
