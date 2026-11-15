/**
 * Quantity formatting helpers. Kitchen quantities read better as fractions
 * ("1 1/2 cups") than decimals ("1.5 cups"), so we snap to common cooking fractions.
 */

const COMMON_FRACTIONS = [
  [1 / 8, '1/8'],
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [1 / 2, '1/2'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
];

const TOLERANCE = 0.06;

/**
 * Format a numeric quantity for display, preferring common fractions.
 * @param {number|null} n
 * @returns {string}
 */
export function formatQuantity(n) {
  if (n == null || Number.isNaN(n)) return '';
  if (n === 0) return '0';

  const whole = Math.floor(n);
  const frac = n - whole;

  // snap the fractional part to a common cooking fraction
  for (const [value, label] of COMMON_FRACTIONS) {
    if (Math.abs(frac - value) <= TOLERANCE) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }
  // near-whole
  if (frac <= TOLERANCE) return String(whole);
  if (frac >= 1 - TOLERANCE) return String(whole + 1);

  // fall back to at most 2 decimals, trimmed
  return String(Math.round(n * 100) / 100);
}

/**
 * Compose a full quantity + unit label, e.g. "1 1/2 cups", "2", "to taste".
 * @param {{ quantity: number|null, unit: string, kind?: string }} ing
 */
export function formatMeasure(ing) {
  if (ing.kind === 'qualitative' || ing.quantity == null) {
    return ing.unit || 'to taste';
  }
  const qty = formatQuantity(ing.quantity);
  return ing.unit ? `${qty} ${ing.unit}` : qty;
}
