import india from '@svg-maps/india';

/**
 * State/UT map outlines for the Allotment Mapping grid.
 *
 * `@svg-maps/india` gives every state/UT as an SVG `path` in one shared India viewBox
 * (`0 0 612 696`). We look a path up by name, tolerant of the small variations the allotment
 * data carries ("Andaman Nicobar Islands" vs "Andaman and Nicobar Islands", casing, spacing).
 */

export interface StateMap {
  /** Canonical display name from the map data. */
  name: string;
  /** SVG path in the shared India viewBox — see INDIA_VIEWBOX. */
  path: string;
}

/** Collapse name variants: lowercase, treat "&"/"and" as nothing, keep only letters. */
const norm = (s: string): string =>
  s.toLowerCase().replace(/&/g, 'and').replace(/\band\b/g, '').replace(/[^a-z]/g, '');

const BY_NORM = new Map<string, StateMap>();
for (const loc of india.locations) {
  BY_NORM.set(norm(loc.name), { name: loc.name, path: loc.path });
}

/** The shared viewBox every state path is drawn in. */
export const INDIA_VIEWBOX = india.viewBox;

/** Map outline for a state/UT name, or undefined if we have no shape for it. */
export function stateMap(name: string): StateMap | undefined {
  return BY_NORM.get(norm(name));
}
