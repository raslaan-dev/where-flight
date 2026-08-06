import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/stores/settings-store';

/**
 * A non-visual confirmation channel, opt-out in Settings.
 *
 * Fire-and-forget on purpose: a haptic that fails (no motor, simulator) must
 * never break the action it was confirming.
 */
export function hapticSelect(): void {
  if (!useSettingsStore.getState().haptics) return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export function hapticConfirm(): void {
  if (!useSettingsStore.getState().haptics) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
