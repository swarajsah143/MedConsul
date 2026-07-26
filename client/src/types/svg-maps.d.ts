/**
 * `@svg-maps/india` ships types that import `Map` from the peer type package
 * `svg-maps__common`, which we don't install. This stub provides just that shape so the
 * import resolves — we only read `viewBox` and `locations[].{name,path}`.
 */
declare module 'svg-maps__common' {
  export interface Location {
    id: string;
    name: string;
    path: string;
    [key: string]: unknown;
  }
  export interface Map {
    label: string;
    viewBox: string;
    locations: Location[];
  }
}
