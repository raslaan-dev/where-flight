import { installFetchMock, jsonResponse, urlOf } from '@/test-utils/fetch-mock';
import { useBudgetStore, utcDayKey } from '../budget-store';
import { useNetworkStore } from '../network-store';
import { cachedRoute, resetRouteStore, routeFetchCost, useRouteStore } from '../route-store';

const NOW = 1_786_034_585_000;

function leg(overrides: Record<string, unknown> = {}) {
  return {
    icao24: '407a06',
    firstSeen: NOW / 1000 - 7200,
    lastSeen: NOW / 1000 - 60,
    callsign: 'BAW117  ',
    estDepartureAirport: 'EGLL',
    estArrivalAirport: 'KJFK',
    ...overrides,
  };
}

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.useFakeTimers({ now: NOW });
  resetRouteStore();
  useBudgetStore.setState({ dayKeyUtc: utcDayKey(), used: 0, log: [], authenticated: true });
  useNetworkStore.setState({ isConnected: true, isInternetReachable: true, hasChecked: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('load', () => {
  it('keeps the most recent leg and charges the 12-hour window', async () => {
    const fetchMock = installFetchMock(jest.fn(async () => jsonResponse([leg()])));

    await useRouteStore.getState().load('407A06');

    const state = useRouteStore.getState();
    expect(state.status).toBe('ready');
    expect(cachedRoute(state, '407a06')?.departureAirport).toBe('EGLL');
    expect(cachedRoute(state, '407a06')?.arrivalAirport).toBe('KJFK');
    // Lowercased in the query, as OpenSky expects.
    expect(urlOf(fetchMock, 0)).toContain('/flights/aircraft?icao24=407a06');
    expect(useBudgetStore.getState().used).toBe(routeFetchCost(NOW));
  });

  it('keeps a leg still in the air, where the arrival is not yet known', async () => {
    installFetchMock(jest.fn(async () => jsonResponse([leg({ estArrivalAirport: null })])));

    await useRouteStore.getState().load('407a06');

    const route = cachedRoute(useRouteStore.getState(), '407a06');
    expect(route?.departureAirport).toBe('EGLL');
    expect(route?.arrivalAirport).toBeNull();
  });

  it('records a null route for a 404, so "asked and got nothing" is distinguishable', async () => {
    installFetchMock(jest.fn(async () => jsonResponse({}, { status: 404 })));

    await useRouteStore.getState().load('407a06');

    const state = useRouteStore.getState();
    expect(state.status).toBe('ready');
    expect(cachedRoute(state, '407a06')).toBeNull();
  });

  it('leaves the cache untouched on failure, so nothing is asserted about the route', async () => {
    installFetchMock(jest.fn(async () => jsonResponse('nope', { status: 503 })));

    await useRouteStore.getState().load('407a06');

    const state = useRouteStore.getState();
    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('SERVER');
    expect(cachedRoute(state, '407a06')).toBeUndefined();
  });

  it('serves a cached route without spending again', async () => {
    const fetchMock = installFetchMock(jest.fn(async () => jsonResponse([leg()])));
    await useRouteStore.getState().load('407a06');
    const spent = useBudgetStore.getState().used;

    await useRouteStore.getState().load('407a06');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useBudgetStore.getState().used).toBe(spent);
  });

  it('refuses to fetch when the budget cannot cover it', async () => {
    const fetchMock = installFetchMock();
    useBudgetStore.setState({ dayKeyUtc: utcDayKey(), used: 3999, log: [], authenticated: true });

    await useRouteStore.getState().load('407a06');

    expect(useRouteStore.getState().errorKind).toBe('BUDGET_EXHAUSTED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
