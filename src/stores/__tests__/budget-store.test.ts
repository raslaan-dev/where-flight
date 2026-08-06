import {
  RESERVE_FRACTION,
  pollableCredits,
  remainingCredits,
  useBudgetStore,
  utcDayKey,
} from '../budget-store';

const NOON_UTC = Date.parse('2026-03-05T12:00:00Z');

function setNow(iso: string) {
  jest.setSystemTime(Date.parse(iso));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOON_UTC);
  useBudgetStore.setState({
    dayKeyUtc: utcDayKey(),
    used: 0,
    log: [],
    authenticated: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('utcDayKey', () => {
  it('derives the day from UTC, not the device timezone', () => {
    // Local midnight in Auckland is still the previous UTC day; keying on it
    // would reset the allowance thirteen hours early.
    expect(utcDayKey(Date.parse('2026-03-05T23:59:59Z'))).toBe('2026-03-05');
    expect(utcDayKey(Date.parse('2026-03-06T00:00:00Z'))).toBe('2026-03-06');
  });
});

describe('spend', () => {
  it('accumulates credits and logs each spend newest first', () => {
    useBudgetStore.getState().spend(2, 'Live aircraft');
    useBudgetStore.getState().spend(1, 'Map viewport');

    const state = useBudgetStore.getState();
    expect(state.used).toBe(3);
    expect(state.log.map((entry) => entry.label)).toEqual(['Map viewport', 'Live aircraft']);
  });

  it('resets the counter when the UTC day rolls over', () => {
    useBudgetStore.getState().spend(50, 'Live aircraft');
    expect(useBudgetStore.getState().used).toBe(50);

    setNow('2026-03-06T00:00:01Z');
    useBudgetStore.getState().spend(2, 'Live aircraft');

    const state = useBudgetStore.getState();
    expect(state.used).toBe(2);
    expect(state.dayKeyUtc).toBe('2026-03-06');
    expect(state.log).toHaveLength(1);
  });

  it('does not roll over within the same UTC day', () => {
    useBudgetStore.getState().spend(50, 'Live aircraft');
    setNow('2026-03-05T23:59:00Z');
    useBudgetStore.getState().spend(2, 'Live aircraft');
    expect(useBudgetStore.getState().used).toBe(52);
  });

  it('caps the log so it cannot grow without bound in storage', () => {
    for (let index = 0; index < 250; index += 1) {
      useBudgetStore.getState().spend(1, `Request ${index}`);
    }
    expect(useBudgetStore.getState().log).toHaveLength(200);
    expect(useBudgetStore.getState().used).toBe(250);
  });
});

describe('reconcileRemaining', () => {
  it("adopts the server's figure over the local estimate", () => {
    useBudgetStore.getState().spend(2, 'Live aircraft');
    useBudgetStore.getState().reconcileRemaining(312);
    // 400 anonymous allowance minus 312 remaining.
    expect(useBudgetStore.getState().used).toBe(88);
  });

  it('never records a negative spend', () => {
    useBudgetStore.getState().reconcileRemaining(9999);
    expect(useBudgetStore.getState().used).toBe(0);
  });
});

describe('remainingCredits', () => {
  it('reports the full anonymous allowance before anything is spent', () => {
    expect(remainingCredits(useBudgetStore.getState())).toBe(400);
  });

  it('reports the authenticated allowance when connected', () => {
    useBudgetStore.setState({ authenticated: true });
    expect(remainingCredits(useBudgetStore.getState())).toBe(4000);
  });

  it('ignores spend recorded on a previous UTC day', () => {
    // A snapshot restored from storage must not be read as today's usage.
    useBudgetStore.setState({ dayKeyUtc: '2026-03-04', used: 400 });
    expect(remainingCredits(useBudgetStore.getState())).toBe(400);
  });

  it('floors at zero rather than going negative', () => {
    useBudgetStore.setState({ used: 500 });
    expect(remainingCredits(useBudgetStore.getState())).toBe(0);
  });
});

describe('pollableCredits', () => {
  it('holds back a reserve so a user-initiated action still works late in the day', () => {
    const reserve = 400 * RESERVE_FRACTION;
    expect(pollableCredits(useBudgetStore.getState())).toBe(400 - reserve);
  });

  it('hits zero while there are still credits for the user to spend directly', () => {
    useBudgetStore.setState({ used: 360 });
    expect(pollableCredits(useBudgetStore.getState())).toBe(0);
    expect(remainingCredits(useBudgetStore.getState())).toBe(40);
  });
});
