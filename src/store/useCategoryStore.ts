// useCategoryStore.ts
import { create } from 'zustand';
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
];

interface CategoryState {
  selected: string[];
  loading: boolean;
  saving: boolean;
  loadCategories: () => Promise<void>;
  toggleCategory: (id: string, onMaxReached: () => void, onError: (msg: string) => void) => Promise<void>;
  resetDefaults: (onError: (msg: string) => void) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  selected: DEFAULTS,
  loading: true,
  saving: false,

  loadCategories: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter valid strings (validation happens UI side or against static arrays)
          const valid = parsed.filter((id): id is string => typeof id === 'string');
          set({ selected: valid.slice(0, MAX_SHORTCUTS) });
        }
      }
    } catch {
      // Keep defaults if failed to load
    } finally {
      set({ loading: false });
    }
  },

  toggleCategory: async (id, onMaxReached, onError) => {
    const { selected } = get();
    const alreadySelected = selected.includes(id);

    if (!alreadySelected && selected.length >= MAX_SHORTCUTS) {
      onMaxReached();
      return;
    }

    const baselineState = [...selected];
    const updated = alreadySelected
      ? selected.filter((item) => item !== id)
      : [...selected, id];

    // Optimistic Update
    set({ selected: updated, saving: true });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      set({ selected: baselineState });
      onError('Your category changes could not be saved.');
    } finally {
      set({ saving: false });
    }
  },

  resetDefaults: async (onError) => {
    const baselineState = [...get().selected];
    set({ saving: true });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
      set({ selected: [...DEFAULTS] });
    } catch {
      set({ selected: baselineState });
      onError('Could not restore the default categories.');
    } finally {
      set({ saving: false });
    }
  },
}));
