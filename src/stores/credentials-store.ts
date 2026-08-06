import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { OpenSkyCredentials } from '@/api/opensky/token';
import { resetTokenManager } from '@/api/opensky/token';

import { useBudgetStore } from './budget-store';

/**
 * The user's own OpenSky API client, for the 4,000-credit tier.
 *
 * The secret goes in the hardware-backed keystore via expo-secure-store —
 * never AsyncStorage, never the JS bundle, never a log line. Anonymous mode
 * remains the zero-configuration default; connecting an account is strictly
 * an upgrade. (The production-correct answer is a server-side token broker;
 * for a device-local coursework app the keystore is the honest ceiling.)
 */

const KEY_CLIENT_ID = 'wf.opensky.clientId';
const KEY_CLIENT_SECRET = 'wf.opensky.clientSecret';

export type CredentialsState = {
  /** In memory after hydration. The secret never touches a zustand persist. */
  credentials: OpenSkyCredentials | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  connect: (credentials: OpenSkyCredentials) => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useCredentialsStore = create<CredentialsState>()((set) => ({
  credentials: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const [clientId, clientSecret] = await Promise.all([
        SecureStore.getItemAsync(KEY_CLIENT_ID),
        SecureStore.getItemAsync(KEY_CLIENT_SECRET),
      ]);
      const credentials = clientId && clientSecret ? { clientId, clientSecret } : null;
      set({ credentials, hydrated: true });
      useBudgetStore.getState().setAuthenticated(credentials !== null);
    } catch {
      // A keystore read can fail after an OS restore; anonymous mode still works.
      set({ credentials: null, hydrated: true });
    }
  },

  connect: async ({ clientId, clientSecret }) => {
    const trimmed = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
    await Promise.all([
      SecureStore.setItemAsync(KEY_CLIENT_ID, trimmed.clientId),
      SecureStore.setItemAsync(KEY_CLIENT_SECRET, trimmed.clientSecret),
    ]);
    // A token minted for the previous client must not be reused for this one.
    resetTokenManager();
    set({ credentials: trimmed });
    useBudgetStore.getState().setAuthenticated(true);
  },

  disconnect: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_CLIENT_ID),
      SecureStore.deleteItemAsync(KEY_CLIENT_SECRET),
    ]);
    resetTokenManager();
    set({ credentials: null });
    useBudgetStore.getState().setAuthenticated(false);
  },
}));

/** Selector: the credentials the API client should use right now. */
export function activeCredentials(): OpenSkyCredentials | null {
  return useCredentialsStore.getState().credentials;
}
