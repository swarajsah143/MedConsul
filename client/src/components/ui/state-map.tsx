import { useLayoutEffect, useRef, useState } from 'react';
import indiaMap from '@svg-maps/india';

/**
 * Per-state SVG outline lookup, built from the shared India map.
 * Every state path is expressed in the map's global "0 0 612 696"
 * coordinate space, so we crop the viewBox to each path's bounding
 * box at render time to make the single state fill its box.
 */
const STATE_PATHS: Record<string, string> = {};
for (const loc of indiaMap.locations) {
  STATE_PATHS[loc.name] = loc.path;
}

export function hasStateMap(state: string): boolean {
  return state in STATE_PATHS;
}

interface StateMapProps {
  state: string;
  className?: string;
}

export function StateMap({ state, className }: StateMapProps) {
  const path = STATE_PATHS[state];
  const pathRef = useRef<SVGPathElement>(null);
  const [viewBox, setViewBox] = useState(indiaMap.viewBox);

  useLayoutEffect(() => {
    if (!pathRef.current) return;
    const b = pathRef.current.getBBox();
    if (b.width === 0 || b.height === 0) return;
    const pad = Math.max(b.width, b.height) * 0.1;
    setViewBox(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
  }, [path]);

  if (!path) return null;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="currentColor"
      role="img"
      aria-label={`${state} map`}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        ref={pathRef}
        d={path}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
