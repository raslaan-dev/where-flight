import { bboxCentre, type Bbox, type LatLon } from './geo';

/**
 * Named regions.
 *
 * The app opens on a fixed region rather than asking for location on first
 * launch: a permission prompt before the user has seen what the app does is
 * both a poor first impression and, for a flight tracker, unnecessary.
 */

export type Region = {
  id: string;
  name: string;
  bbox: Bbox;
  centre: LatLon;
};

function region(id: string, name: string, bbox: Bbox): Region {
  return { id, name, bbox, centre: bboxCentre(bbox) };
}

/**
 * Chosen for dense, reliable coverage: OpenSky's receiver network is thickest
 * over western Europe, so the first thing a new user sees is a busy screen
 * rather than an empty one.
 */
export const REGIONS: readonly Region[] = [
  region('uk', 'United Kingdom and Ireland', {
    lamin: 49.9,
    lomin: -10.5,
    lamax: 59,
    lomax: 2,
  }),
  region('benelux', 'Netherlands and Belgium', {
    lamin: 49.5,
    lomin: 2.5,
    lamax: 53.6,
    lomax: 7.2,
  }),
  region('alps', 'Switzerland and Austria', {
    lamin: 45.8,
    lomin: 5.9,
    lamax: 49,
    lomax: 17,
  }),
  region('us-northeast', 'US north-east', {
    lamin: 38,
    lomin: -80,
    lamax: 45,
    lomax: -70,
  }),
];

export const DEFAULT_REGION = REGIONS[0];
