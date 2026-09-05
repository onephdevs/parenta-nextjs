/** Shared caps so list endpoints cannot request an unbounded roster. */

export function clampPageLimit(
  raw: number | string | null | undefined,
  fallback: number,
  max: number
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, Math.floor(n));
}
