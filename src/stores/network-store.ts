import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

/**
 * Connectivity, held in a store rather than a hook so the API client and the
 * polling loop can read it without being inside a component tree.
 *
 * `isInternetReachable` is deliberately distinguished from `isConnected`:
 * captive-portal Wi-Fi reports a connection but cannot reach OpenSky, and
 * treating that as online produces a hang instead of an honest offline state.
 */

export type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  /** Null until the first NetInfo event; the UI should not accuse the user of
   * being offline before it knows. */
  hasChecked: boolean;
  setStatus: (status: { isConnected: boolean; isInternetReachable: boolean | null }) => void;
};

export const useNetworkStore = create<NetworkState>()((set) => ({
  isConnected: true,
  isInternetReachable: null,
  hasChecked: false,
  setStatus: ({ isConnected, isInternetReachable }) =>
    set({ isConnected, isInternetReachable, hasChecked: true }),
}));

/** True unless we positively know the internet is unreachable. */
export function isOnline(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected && state.isInternetReachable !== false;
}

/** Starts the NetInfo subscription. Called once from the root layout. */
export function subscribeToNetwork(): () => void {
  return NetInfo.addEventListener((state) => {
    useNetworkStore.getState().setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
    });
  });
}
