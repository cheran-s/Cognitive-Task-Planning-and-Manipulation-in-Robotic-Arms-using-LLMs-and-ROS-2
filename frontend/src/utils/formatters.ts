/**
 * Safe numeric and coordinate formatting utilities for Cognitive Manipulation Studio.
 * 
 * Requirements:
 * - Handle null, undefined, NaN, and +/- Infinity safely.
 * - Never throw "Cannot read properties of null (reading 'toFixed')".
 * - Return clear fallback such as 'N/A' instead of converting missing values into fake zeros.
 * - Preserve original numeric precision in underlying data.
 */

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
  fallback = 'N/A'
): string {
  if (
    value === null ||
    value === undefined ||
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return value.toFixed(digits);
}

/**
 * Formats angles in radians to degrees safely.
 */
export function formatRadToDeg(
  rad: number | null | undefined,
  digits = 1,
  fallback = 'N/A'
): string {
  if (
    rad === null ||
    rad === undefined ||
    typeof rad !== 'number' ||
    !Number.isFinite(rad)
  ) {
    return fallback;
  }

  const deg = (rad * 180) / Math.PI;
  return deg.toFixed(digits);
}

/**
 * Formats 2D or 3D coordinate array [x, y, (z)] safely.
 */
export function formatCoordinates(
  pos: (number | null | undefined)[] | null | undefined,
  digits = 2,
  fallback = 'N/A'
): string {
  if (!pos || !Array.isArray(pos) || pos.length === 0) {
    return fallback;
  }

  const formattedParts = pos.map((val) => formatNumber(val, digits, 'N/A'));
  return `[${formattedParts.join(', ')}]`;
}
