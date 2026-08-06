import {
  UNKNOWN,
  formatAltitude,
  formatAltitudeSpoken,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  formatSpeedSpoken,
  formatVerticalRate,
  spellOut,
} from '../format';

describe('formatAltitude', () => {
  it('converts metres to feet for the aviation and imperial systems', () => {
    expect(formatAltitude(10000, 'aviation')).toBe('32,808 ft');
    expect(formatAltitude(10000, 'imperial')).toBe('32,808 ft');
  });

  it('keeps metres for the metric system', () => {
    expect(formatAltitude(10000, 'metric')).toBe('10,000 m');
  });

  it('shows unknown rather than zero for a missing altitude', () => {
    // An aircraft with no altitude is not at sea level.
    expect(formatAltitude(null, 'aviation')).toBe(UNKNOWN);
    expect(formatAltitude(Number.NaN, 'aviation')).toBe(UNKNOWN);
  });

  it('renders a genuine zero as zero', () => {
    expect(formatAltitude(0, 'metric')).toBe('0 m');
  });
});

describe('formatAltitudeSpoken', () => {
  it('spells the unit out, because screen readers read "ft" as "F T"', () => {
    expect(formatAltitudeSpoken(3000, 'aviation')).toBe('9,843 feet');
    expect(formatAltitudeSpoken(3000, 'metric')).toBe('3,000 metres');
  });

  it('says unknown rather than reading a dash', () => {
    expect(formatAltitudeSpoken(null, 'aviation')).toBe('altitude unknown');
  });
});

describe('formatSpeed', () => {
  it('uses knots for aviation, km/h for metric and mph for imperial', () => {
    expect(formatSpeed(100, 'aviation')).toBe('194 kt');
    expect(formatSpeed(100, 'metric')).toBe('360 km/h');
    expect(formatSpeed(100, 'imperial')).toBe('224 mph');
  });

  it('shows unknown for a missing speed', () => {
    expect(formatSpeed(null, 'aviation')).toBe(UNKNOWN);
  });
});

describe('formatSpeedSpoken', () => {
  it('spells the units out', () => {
    expect(formatSpeedSpoken(100, 'aviation')).toBe('194 knots');
    expect(formatSpeedSpoken(100, 'metric')).toBe('360 kilometres per hour');
    expect(formatSpeedSpoken(100, 'imperial')).toBe('224 miles per hour');
    expect(formatSpeedSpoken(null, 'metric')).toBe('speed unknown');
  });
});

describe('formatDistance', () => {
  it('uses nautical miles for aviation, km for metric and miles for imperial', () => {
    expect(formatDistance(100, 'aviation')).toBe('54 nm');
    expect(formatDistance(100, 'metric')).toBe('100 km');
    expect(formatDistance(100, 'imperial')).toBe('62 mi');
  });
});

describe('formatVerticalRate', () => {
  it('uses feet per minute, the universal aviation convention', () => {
    expect(formatVerticalRate(10, 'aviation')).toBe('1,969 ft/min');
  });

  it('keeps metres per second for metric', () => {
    expect(formatVerticalRate(10, 'metric')).toBe('10.0 m/s');
  });

  it('keeps the sign of a descent', () => {
    expect(formatVerticalRate(-10, 'metric')).toBe('-10.0 m/s');
    expect(formatVerticalRate(-10, 'aviation')).toContain('-');
  });

  it('shows unknown for a missing rate', () => {
    expect(formatVerticalRate(null, 'aviation')).toBe(UNKNOWN);
  });
});

describe('formatRelativeTime', () => {
  it.each([
    [0, 'just now'],
    [9, 'just now'],
    [10, '10 seconds ago'],
    [59, '59 seconds ago'],
    [60, '1 minute ago'],
    [120, '2 minutes ago'],
    [3600, '1 hour ago'],
    [7200, '2 hours ago'],
    [86400, '1 day ago'],
    [172800, '2 days ago'],
  ])('renders %i seconds as "%s"', (seconds, expected) => {
    expect(formatRelativeTime(seconds)).toBe(expected);
  });

  it('singularises correctly at each boundary', () => {
    expect(formatRelativeTime(60)).toBe('1 minute ago');
    expect(formatRelativeTime(119)).toBe('1 minute ago');
  });

  it('refuses to invent a time from nonsense input', () => {
    expect(formatRelativeTime(-5)).toBe(UNKNOWN);
    expect(formatRelativeTime(Number.NaN)).toBe(UNKNOWN);
  });
});

describe('spellOut', () => {
  it('spaces a hex identifier so TalkBack reads it digit by digit', () => {
    expect(spellOut('4b1815')).toBe('4 B 1 8 1 5');
  });
});
