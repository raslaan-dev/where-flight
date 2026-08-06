import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Recent search queries, persisted.
 *
 * Aircraft change constantly, so remembering *results* would serve up ghosts;
 * remembering what the user *typed* is stable and saves retyping a callsign
 * they check every day.
 */

const MAX_RECENT = 10;

export type SearchState = {
  recent: string[];

  remember: (query: string) => void;
  clearRecent: () => void;
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recent: [],

      remember: (query) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return;
        set((state) => ({
          recent: [
            trimmed,
            ...state.recent.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
          ].slice(0, MAX_RECENT),
        }));
      },

      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'wf.search',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recent: state.recent }),
    }
  )
);

/** Test seam. */
export function resetSearchStore(): void {
  useSearchStore.setState({ recent: [] });
}
