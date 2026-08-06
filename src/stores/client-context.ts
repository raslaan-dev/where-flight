import type { ClientContext } from '@/api/opensky/client';

import { remainingCredits, useBudgetStore } from './budget-store';
import { activeCredentials } from './credentials-store';
import { isOnline, useNetworkStore } from './network-store';

/**
 * The `ClientContext` for a user-initiated request.
 *
 * Deliberate taps may spend down to the last credit — the reserve exists for
 * exactly this — so this reads `remainingCredits`, not `pollableCredits`.
 */
export function userActionContext(label: string): ClientContext {
  const budget = useBudgetStore.getState();
  return {
    credentials: activeCredentials(),
    isOnline: isOnline(useNetworkStore.getState()),
    remainingCredits: remainingCredits(budget),
    onCreditsSpent: (credits) => budget.spend(credits, label),
    onRemainingReported: budget.reconcileRemaining,
  };
}
