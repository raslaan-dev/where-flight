/**
 * A small bundled directory of major airports.
 *
 * Shipped with the app rather than fetched: airport search must work on first
 * launch with no network, and OpenSky has no airport-metadata endpoint on the
 * free tier anyway. Skewed towards Europe, where the receiver coverage that
 * powers the schedules is densest.
 */

export type Airport = {
  /** ICAO code — the identifier OpenSky's flights endpoints key on. */
  icao: string;
  /** IATA code — the one printed on boarding passes, so the one users know. */
  iata: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export const AIRPORTS: readonly Airport[] = [
  { icao: 'EGLL', iata: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', latitude: 51.4706, longitude: -0.4619 },
  { icao: 'EGKK', iata: 'LGW', name: 'Gatwick', city: 'London', country: 'United Kingdom', latitude: 51.1481, longitude: -0.1903 },
  { icao: 'EGSS', iata: 'STN', name: 'Stansted', city: 'London', country: 'United Kingdom', latitude: 51.885, longitude: 0.235 },
  { icao: 'EGCC', iata: 'MAN', name: 'Manchester', city: 'Manchester', country: 'United Kingdom', latitude: 53.3537, longitude: -2.275 },
  { icao: 'EGBB', iata: 'BHX', name: 'Birmingham', city: 'Birmingham', country: 'United Kingdom', latitude: 52.4539, longitude: -1.748 },
  { icao: 'EGPH', iata: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'United Kingdom', latitude: 55.95, longitude: -3.3725 },
  { icao: 'EGGD', iata: 'BRS', name: 'Bristol', city: 'Bristol', country: 'United Kingdom', latitude: 51.3827, longitude: -2.7191 },
  { icao: 'EIDW', iata: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', latitude: 53.4213, longitude: -6.2701 },
  { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479 },
  { icao: 'LFPO', iata: 'ORY', name: 'Orly', city: 'Paris', country: 'France', latitude: 48.7233, longitude: 2.3794 },
  { icao: 'EHAM', iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', latitude: 52.3086, longitude: 4.7639 },
  { icao: 'EBBR', iata: 'BRU', name: 'Brussels', city: 'Brussels', country: 'Belgium', latitude: 50.9014, longitude: 4.4844 },
  { icao: 'EDDF', iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', latitude: 50.0333, longitude: 8.5706 },
  { icao: 'EDDM', iata: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', latitude: 48.3538, longitude: 11.7861 },
  { icao: 'EDDB', iata: 'BER', name: 'Brandenburg', city: 'Berlin', country: 'Germany', latitude: 52.3667, longitude: 13.5033 },
  { icao: 'LSZH', iata: 'ZRH', name: 'Zürich', city: 'Zürich', country: 'Switzerland', latitude: 47.4647, longitude: 8.5492 },
  { icao: 'LSGG', iata: 'GVA', name: 'Geneva', city: 'Geneva', country: 'Switzerland', latitude: 46.2381, longitude: 6.1089 },
  { icao: 'LOWW', iata: 'VIE', name: 'Vienna', city: 'Vienna', country: 'Austria', latitude: 48.1103, longitude: 16.5697 },
  { icao: 'LEMD', iata: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Spain', latitude: 40.4936, longitude: -3.5668 },
  { icao: 'LEBL', iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain', latitude: 41.2971, longitude: 2.0785 },
  { icao: 'LPPT', iata: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal', latitude: 38.7813, longitude: -9.1359 },
  { icao: 'LIRF', iata: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', latitude: 41.8003, longitude: 12.2389 },
  { icao: 'LIMC', iata: 'MXP', name: 'Malpensa', city: 'Milan', country: 'Italy', latitude: 45.6306, longitude: 8.7281 },
  { icao: 'EKCH', iata: 'CPH', name: 'Kastrup', city: 'Copenhagen', country: 'Denmark', latitude: 55.6179, longitude: 12.656 },
  { icao: 'ESSA', iata: 'ARN', name: 'Arlanda', city: 'Stockholm', country: 'Sweden', latitude: 59.6519, longitude: 17.9186 },
  { icao: 'ENGM', iata: 'OSL', name: 'Gardermoen', city: 'Oslo', country: 'Norway', latitude: 60.1939, longitude: 11.1004 },
  { icao: 'EFHK', iata: 'HEL', name: 'Vantaa', city: 'Helsinki', country: 'Finland', latitude: 60.3172, longitude: 24.9633 },
  { icao: 'EPWA', iata: 'WAW', name: 'Chopin', city: 'Warsaw', country: 'Poland', latitude: 52.1657, longitude: 20.9671 },
  { icao: 'LKPR', iata: 'PRG', name: 'Václav Havel', city: 'Prague', country: 'Czechia', latitude: 50.1008, longitude: 14.26 },
  { icao: 'LGAV', iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Athens', country: 'Greece', latitude: 37.9364, longitude: 23.9445 },
  { icao: 'LTFM', iata: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'Türkiye', latitude: 41.2753, longitude: 28.7519 },
  { icao: 'KJFK', iata: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'United States', latitude: 40.6398, longitude: -73.7789 },
  { icao: 'KEWR', iata: 'EWR', name: 'Newark Liberty', city: 'New York', country: 'United States', latitude: 40.6925, longitude: -74.1687 },
  { icao: 'KBOS', iata: 'BOS', name: 'Logan', city: 'Boston', country: 'United States', latitude: 42.3643, longitude: -71.0052 },
  { icao: 'KPHL', iata: 'PHL', name: 'Philadelphia', city: 'Philadelphia', country: 'United States', latitude: 39.8719, longitude: -75.2411 },
  { icao: 'KIAD', iata: 'IAD', name: 'Dulles', city: 'Washington', country: 'United States', latitude: 38.9445, longitude: -77.4558 },
  { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'United States', latitude: 33.9425, longitude: -118.4081 },
  { icao: 'KSFO', iata: 'SFO', name: 'San Francisco', city: 'San Francisco', country: 'United States', latitude: 37.619, longitude: -122.3748 },
  { icao: 'KORD', iata: 'ORD', name: "O'Hare", city: 'Chicago', country: 'United States', latitude: 41.9786, longitude: -87.9048 },
  { icao: 'CYYZ', iata: 'YYZ', name: 'Pearson', city: 'Toronto', country: 'Canada', latitude: 43.6772, longitude: -79.6306 },
] as const;

const byIcao = new Map(AIRPORTS.map((airport) => [airport.icao, airport]));

export function airportByIcao(icao: string): Airport | null {
  return byIcao.get(icao.toUpperCase()) ?? null;
}

/** Shown in flight rows: "Zürich (ZRH)" if known, otherwise the raw code. */
export function airportLabel(icao: string | null): string {
  if (icao === null) return 'Unknown airport';
  const airport = airportByIcao(icao);
  return airport ? `${airport.city} (${airport.iata})` : icao.toUpperCase();
}

/** Case-insensitive match on city, name and both codes. */
export function searchAirports(query: string): Airport[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...AIRPORTS];
  return AIRPORTS.filter(
    (airport) =>
      airport.city.toLowerCase().includes(needle) ||
      airport.name.toLowerCase().includes(needle) ||
      airport.iata.toLowerCase() === needle ||
      airport.icao.toLowerCase().includes(needle) ||
      airport.country.toLowerCase().includes(needle)
  );
}
