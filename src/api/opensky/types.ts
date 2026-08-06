/** Where an aircraft's altitude figure came from. Worth surfacing: barometric
 * altitude is pressure-derived and can differ from GPS altitude by hundreds of
 * feet. */
export type AltitudeSource = 'geometric' | 'barometric' | 'unknown';

export type VerticalTrend = 'climbing' | 'descending' | 'level' | 'unknown';

/** OpenSky's `position_source` enumeration. */
export type PositionSource = 'ADS-B' | 'ASTERIX' | 'MLAT' | 'FLARM' | 'unknown';

export type Aircraft = {
  /** Unique 24-bit ICAO transponder address, lower-case hex. The only stable id. */
  icao24: string;
  /**
   * Flight callsign, trimmed. Null when the aircraft is not broadcasting one —
   * common for general aviation and military traffic.
   */
  callsign: string | null;
  /** Callsign if known, otherwise the ICAO hex. Never empty. */
  label: string;
  originCountry: string;

  latitude: number | null;
  longitude: number | null;

  /** Metres. Null on the ground and whenever neither altitude source reports. */
  altitude: number | null;
  altitudeSource: AltitudeSource;
  onGround: boolean;

  /** Metres per second. */
  velocity: number | null;
  /** Degrees clockwise from true north. Null means heading unknown. */
  trueTrack: number | null;
  /** Metres per second; positive is climbing. */
  verticalRate: number | null;
  verticalTrend: VerticalTrend;

  squawk: string | null;
  /** 7500 hijack, 7600 radio failure, 7700 general emergency. */
  isEmergencySquawk: boolean;
  positionSource: PositionSource;

  /** Unix seconds of the last position report. */
  timePosition: number | null;
  /** Unix seconds of the last contact of any kind. */
  lastContact: number;
  /** Seconds between the position report and the server's snapshot time. */
  positionAgeSeconds: number;
  /** True once the position is old enough to be worth flagging in the UI. */
  isStale: boolean;
};

export type AircraftSnapshot = {
  /** Server time of the snapshot, Unix seconds. */
  time: number;
  aircraft: Aircraft[];
  /** Rows dropped by the mapper — surfaced so coverage gaps are explainable. */
  discarded: {
    noPosition: number;
    tooOld: number;
    malformed: number;
    duplicate: number;
  };
};

/** Raw wire format: a positional array, not an object. */
export type RawStateVector = (string | number | boolean | number[] | null)[];

export type RawStatesResponse = {
  time: number;
  /** Null — not an empty array — when no aircraft are in the region. */
  states: RawStateVector[] | null;
};
