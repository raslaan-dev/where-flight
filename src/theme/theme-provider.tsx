import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';

import { useSystemAccessibility } from '@/hooks/use-system-accessibility';
import { useSettingsStore, type SystemOverride } from '@/stores/settings-store';

import { PALETTES, type Palette, type PaletteName } from './palette';
import { STACKED_LAYOUT_FONT_SCALE } from './tokens';

export type Theme = {
  colors: Palette;
  /** True when animation should be suppressed. Honour this, don't just shorten. */
  reduceMotion: boolean;
  /** True when a screen reader is active — drives list-first defaults. */
  screenReader: boolean;
  /** OS font scale. >= 1 means the user has enlarged text. */
  fontScale: number;
  /** True once text is large enough that side-by-side layouts stop fitting. */
  stackedLayout: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

function resolveOverride(override: SystemOverride, systemValue: boolean): boolean {
  if (override === 'on') return true;
  if (override === 'off') return false;
  return systemValue;
}

function resolvePaletteName(
  preference: 'system' | 'dark' | 'light',
  systemScheme: 'dark' | 'light',
  highContrast: boolean
): PaletteName {
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  if (highContrast) return isDark ? 'highContrastDark' : 'highContrastLight';
  return isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() ?? 'dark';
  const { fontScale } = useWindowDimensions();
  const system = useSystemAccessibility();

  const themePreference = useSettingsStore((s) => s.theme);
  const highContrastPreference = useSettingsStore((s) => s.highContrast);
  const reduceMotionPreference = useSettingsStore((s) => s.reduceMotion);

  const value = useMemo<Theme>(() => {
    const highContrast = resolveOverride(
      highContrastPreference,
      // Inverted colours signal the same intent as an explicit contrast boost.
      system.highTextContrast || system.invertColors
    );

    return {
      colors:
        PALETTES[
          resolvePaletteName(
            themePreference,
            systemScheme === 'light' ? 'light' : 'dark',
            highContrast
          )
        ],
      reduceMotion: resolveOverride(reduceMotionPreference, system.reduceMotion),
      screenReader: system.screenReader,
      fontScale,
      stackedLayout: fontScale >= STACKED_LAYOUT_FONT_SCALE,
    };
  }, [
    themePreference,
    highContrastPreference,
    reduceMotionPreference,
    systemScheme,
    fontScale,
    system.highTextContrast,
    system.invertColors,
    system.reduceMotion,
    system.screenReader,
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return theme;
}
