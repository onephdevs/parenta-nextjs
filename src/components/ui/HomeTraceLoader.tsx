'use client';

import { useEffect, useState } from 'react';

interface HomeTraceLoaderProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * House outline with a looping stroke-trace animation.
 * Uses pathLength=1 so dash math stays resolution-independent.
 */
export default function HomeTraceLoader({
  size = 120,
  className = '',
  color = '#3B82F6',
}: HomeTraceLoaderProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft guide so the house silhouette is readable while tracing */}
      <path
        d={HOUSE_PATH}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={reducedMotion ? 1 : 0.12}
      />

      {!reducedMotion ? (
        <>
          {/* Drawing stroke */}
          <path
            d={HOUSE_PATH}
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="home-trace-stroke"
          />
          {/* Door drawn slightly after the body starts */}
          <path
            d={DOOR_PATH}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="home-trace-door"
          />
        </>
      ) : (
        <path
          d={DOOR_PATH}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** Roof peak → right eave → right wall → floor → left wall → left eave → close */
const HOUSE_PATH =
  'M 50 14 L 88 46 L 80 46 L 80 88 L 20 88 L 20 46 L 12 46 Z M 66 30 L 66 42';

/** Simple door under the roof center */
const DOOR_PATH = 'M 42 88 L 42 60 L 58 60 L 58 88';
