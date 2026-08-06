import AsyncStorage from '@react-native-async-storage/async-storage';

import { installFetchMock, jsonResponse, urlOf } from '@/test-utils/fetch-mock';
import { useBudgetStore, utcDayKey } from '../budget-store';
import { useNetworkStore } from '../network-store';
import {
  cachedBoard,
  isBoardFresh,
  resetAirportsStore,
  useAirportsStore,
  SCHEDULE_TTL_MS,
} from '../airports-store';

const NOW = 1_786_034_585_000;

function flight(icao24: string, lastSeen: number) {
  return {
    icao24,
    firstSeen: lastSeen - 3600,
    lastSeen,
    callsign: 'TST123  ',
    estDepartureAirport: 'EGLL',
    estArrivalAirport: 'LSZH',
  };
}

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.useFakeTimers({ now: NOW });
  resetAirportsStore();
  await AsyncStorage.clear();
  useBudgetStore.setState({ dayKeyUtc: utcDayKey(), used: 0, log: [], authenticated: false });
  useNetworkStore.setState({ isConnected: true, isInternetReachable: true, hasChecked: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('load', () => {
  it('stores the board under the airport and direction, and charges the budget', async () => {
    const fetchMock = installFetchMock(
      jest.fn(async () => jsonResponse([flight('4b1800', NOW / 1000 - 60)]))
    );

    await useAirportsStore.getState().load('lszh', 'arrival');

    const state = useAirportsStore.getState();
    expect(state.status).toBe('ready');
    const board = cachedBoard(state, 'LSZH', 'arrival');
    expect(board).not.toBeNull();
    expect(board?.flights).toHaveLength(1);
    expect(board?.airportIcao).toBe('LSZH');
    expect(urlOf(fetchMock, 0)).toContain('/flights/arrival?airport=LSZH');
    // A 2h window costs 8 credits by OpenSky's day-span table.
    expect(useBudgetStore.getState().used).toBe(8);
  });

  it('treats a 404 as an empty board, not an error', async () => {
    installFetchMock(jest.fn(async () => jsonResponse({ error: 'not found' }, { status: 404 })));

    await useAirportsStore.getState().load('EGGD', 'departure');

    const state = useAirportsStore.getState();
    expect(state.status).toBe('ready');
    expect(cachedBoard(state, 'EGGD', 'departure')?.flights).toEqual([]);
  });

  it('keeps a previously cached board when a refresh fails', async () => {
    const fetchMock = installFetchMock(
      jest.fn(async () => jsonResponse([flight('4b1800', NOW / 1000 - 60)]))
    );
    await useAirportsStore.getState().load('EGLL', 'arrival');

    fetchMock.mockImplementation(async () => jsonResponse('oops', { status: 503 }));
    await useAirportsStore.getState().load('EGLL', 'arrival');

    const state = useAirportsStore.getState();
    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('SERVER');
    expect(cachedBoard(state, 'EGLL', 'arrival')?.flights).toHaveLength(1);
  });

  it('caches arrivals and departures separately', async () => {
    installFetchMock(jest.fn(async () => jsonResponse([flight('4b1800', NOW / 1000 - 60)])));

    await useAirportsStore.getState().load('EHAM', 'arrival');

    const state = useAirportsStore.getState();
    expect(cachedBoard(state, 'EHAM', 'arrival')).not.toBeNull();
    expect(cachedBoard(state, 'EHAM', 'departure')).toBeNull();
  });

  it('refuses to fetch when the budget cannot cover the request', async () => {
    const fetchMock = installFetchMock();
    useBudgetStore.setState({ dayKeyUtc: utcDayKey(), used: 398, log: [], authenticated: false });

    await useAirportsStore.getState().load('EGLL', 'arrival');

    const state = useAirportsStore.getState();
    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('BUDGET_EXHAUSTED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('freshness', () => {
  it('flags boards older than the TTL as stale', async () => {
    installFetchMock(jest.fn(async () => jsonResponse([])));
    await useAirportsStore.getState().load('EGLL', 'arrival');

    const board = cachedBoard(useAirportsStore.getState(), 'EGLL', 'arrival');
    expect(board).not.toBeNull();
    expect(isBoardFresh(board!, NOW)).toBe(true);
    expect(isBoardFresh(board!, NOW + SCHEDULE_TTL_MS + 1)).toBe(false);
  });
});
