import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Three-way overrides let a user opt in or out regardless of their OS setting. */
export type SystemOverride = 'system' | 'on' | 'off';
export type ThemePreference = 'system' | 'dark' | 'light';
export type UnitSystem = 'aviation' | 'metric' | 'imperial';

export type SettingsState = {
  theme: ThemePreference;
  highContrast: SystemOverride;
  reduceMotion: SystemOverride;
  units: UnitSystem;
  haptics: boolean;
  /** Aircraft sitting at gates swamp any view containing an airport. */
  showOnGround: boolean;
  /** Set once the user has dismissed the first-run explainer. */
  hasSeenOnboarding: boolean;

  setTheme: (value: ThemePreference) => void;
  setHighContrast: (value: SystemOverride) => void;
  setReduceMotion: (value: SystemOverride) => void;
  setUnits: (value: UnitSystem) => void;
  setHaptics: (value: boolean) => void;
  setShowOnGround: (value: boolean) => void;
  completeOnboarding: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      highContrast: 'system',
      reduceMotion: 'system',
      units: 'aviation',
      haptics: true,
      showOnGround: false,
      hasSeenOnboarding: false,

      setTheme: (theme) => set({ theme }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setUnits: (units) => set({ units }),
      setHaptics: (haptics) => set({ haptics }),
      setShowOnGround: (showOnGround) => set({ showOnGround }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: 'wf.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the values, never the setters.
      partialize: (state) => ({
        theme: state.theme,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
        units: state.units,
        haptics: state.haptics,
        showOnGround: state.showOnGround,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    }
  )
);
