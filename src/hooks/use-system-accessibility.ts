import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

type Flags = {
  reduceMotion: boolean;
  screenReader: boolean;
  boldText: boolean;
  invertColors: boolean;
  /** Android only. iOS exposes the equivalent as `darkerSystemColors`. */
  highTextContrast: boolean;
};

const INITIAL: Flags = {
  reduceMotion: false,
  screenReader: false,
  boldText: false,
  invertColors: false,
  highTextContrast: false,
};

/**
 * Subscribes to every OS accessibility flag the app reacts to.
 *
 * Read once on mount and then kept live — users change these settings *while*
 * an app is open (that is often the whole point), so a mount-time snapshot
 * silently goes stale.
 */
export function useSystemAccessibility(): Flags {
  const [flags, setFlags] = useState<Flags>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    const patch = (partial: Partial<Flags>) => {
      if (!cancelled) setFlags((prev) => ({ ...prev, ...partial }));
    };

    Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isBoldTextEnabled(),
      AccessibilityInfo.isInvertColorsEnabled(),
      Platform.OS === 'android'
        ? AccessibilityInfo.isHighTextContrastEnabled()
        : Promise.resolve(false),
    ])
      .then(([reduceMotion, screenReader, boldText, invertColors, highTextContrast]) =>
        patch({ reduceMotion, screenReader, boldText, invertColors, highTextContrast })
      )
      .catch(() => {
        // A platform that cannot report these is treated as "all off" rather
        // than crashing the tree at startup.
      });

    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
        patch({ reduceMotion: v })
      ),
      AccessibilityInfo.addEventListener('screenReaderChanged', (v) =>
        patch({ screenReader: v })
      ),
      AccessibilityInfo.addEventListener('boldTextChanged', (v) => patch({ boldText: v })),
      AccessibilityInfo.addEventListener('invertColorsChanged', (v) =>
        patch({ invertColors: v })
      ),
      AccessibilityInfo.addEventListener('highTextContrastChanged', (v) =>
        patch({ highTextContrast: v })
      ),
    ];

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  return flags;
}
