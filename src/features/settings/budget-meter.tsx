import { StyleSheet, View } from 'react-native';

import { dailyCreditsFor } from '@/api/opensky/costs';
import { Text } from '@/components/ui/text';
import { formatRelativeTime } from '@/lib/format';
import { useNow } from '@/lib/use-now';
import { remainingCredits, useBudgetStore, utcDayKey, RESERVE_FRACTION } from '@/stores/budget-store';
import { radius, space, useTheme } from '@/theme';

/**
 * Today's API credit spend, made visible.
 *
 * The app rations OpenSky's daily allowance on the user's behalf — polling
 * slows down, expensive fetches sit behind priced buttons. That rationing is
 * only trustworthy if the user can see the account it is drawn against.
 */

const RECENT_ENTRIES = 6;

export function BudgetMeter() {
  const { colors } = useTheme();
  const now = useNow();

  const dayKeyUtc = useBudgetStore((state) => state.dayKeyUtc);
  const usedRaw = useBudgetStore((state) => state.used);
  const log = useBudgetStore((state) => state.log);
  const authenticated = useBudgetStore((state) => state.authenticated);

  // A counter persisted yesterday reads as zero today.
  const used = dayKeyUtc === utcDayKey(now) ? usedRaw : 0;
  const allowance = dailyCreditsFor(authenticated);
  const remaining = remainingCredits({ dayKeyUtc, used: usedRaw, authenticated });
  const fraction = Math.min(1, used / allowance);
  const recent = log.slice(0, RECENT_ENTRIES);

  return (
    <View style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="API credits used today"
        accessibilityValue={{ min: 0, max: allowance, now: Math.min(used, allowance) }}>
        <View style={[styles.track, { backgroundColor: colors.bg }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: fraction < 1 - RESERVE_FRACTION ? colors.accent : colors.warn,
                width: `${fraction * 100}%`,
              },
            ]}
          />
        </View>
        <Text variant="caption" tone="muted" style={styles.figures}>
          {used} of {allowance} used · {remaining} left · resets midnight UTC
        </Text>
      </View>

      {recent.length > 0 ? (
        <View style={styles.log}>
          <Text variant="overline" tone="muted" heading>
            Recent requests
          </Text>
          {recent.map((entry) => (
            <View
              key={`${entry.at}-${entry.label}`}
              style={styles.logRow}
              accessible
              accessibilityLabel={`${entry.label}, ${entry.credits} credit${entry.credits === 1 ? '' : 's'}, ${formatRelativeTime((now - entry.at) / 1000)}`}>
              <Text variant="caption" style={styles.logLabel} numberOfLines={1}>
                {entry.label}
              </Text>
              <Text variant="caption" tone="muted">
                {entry.credits} cr · {formatRelativeTime((now - entry.at) / 1000)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          Nothing spent yet today.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  track: { height: 8, borderRadius: radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.sm },
  figures: { marginTop: space.xs },
  log: { gap: space.xs },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  logLabel: { flexShrink: 1 },
});
