import React, { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'britume-living-categories-v1';
export const MAX_SHORTCUTS = 6;
export const DEFAULTS = [
  'SOCIAL',
  'CHAT',
  'TECHNOLOGIES',
  'TV',
  'STUDIOS',
  'WEAR',
] as const;

const VALID_IDS = new Set([
  ...DEFAULTS,
  'GAMES',
  'FOUNDATION',
  'LABS',
  'THEMES',
  'GALLERY',
  'NOTIFICATIONS',
  'PREMIUM',
  'SECURITY',
]);

type CategoryState = {
  selected: string[];
  loading: boolean;
  saving: boolean;
};
type Listener = () => void;

let state: CategoryState = {
  selected: [...DEFAULTS],
  loading: true,
  saving: false,
};
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((listener) => listener());
const setState = (patch: Partial<CategoryState>) => {
  state = { ...state, ...patch };
  emit();
};
const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

async function persistSelection(next: string[], onError: (message: string) => void) {
  const previous = state.selected;
  setState({ selected: next, saving: true });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    setState({ selected: previous });
    onError('Your category changes could not be saved.');
  } finally {
    setState({ saving: false });
  }
}

async function loadCategories() {
  setState({ loading: true });
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const valid = [...new Set(parsed.filter(
          (id): id is string => typeof id === 'string' && VALID_IDS.has(id),
        ))].slice(0, MAX_SHORTCUTS);
        setState({ selected: valid });
      }
    }
  } catch {
    // Keep defaults if storage is unavailable or malformed.
  } finally {
    setState({ loading: false });
  }
}

async function toggleCategory(
  id: string,
  onMaxReached: () => void,
  onError: (message: string) => void,
) {
  if (!VALID_IDS.has(id) || state.saving) return;
  const selected = state.selected;
  if (!selected.includes(id) && selected.length >= MAX_SHORTCUTS) {
    onMaxReached();
    return;
  }
  const next = selected.includes(id)
    ? selected.filter((item) => item !== id)
    : [...selected, id];
  await persistSelection(next, onError);
}

async function resetDefaults(onError: (message: string) => void) {
  await persistSelection([...DEFAULTS], onError);
}

export function useCategoryStore() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  return { ...snapshot, loadCategories, toggleCategory, resetDefaults };
}
