/**
 * Verify the model's "availability" claims against what the user actually typed.
 * The model loves to claim an ingredient is already in your fridge; we only trust
 * "available" if the name fuzzily matches a user-supplied ingredient.
 */

const PANTRY_STAPLES = ['salt', 'pepper', 'water', 'oil', 'olive oil', 'vegetable oil', 'sugar'];

/** Normalize for comparison: lowercase, strip punctuation, collapse whitespace. */
export function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple token-overlap match — handles "cheddar" ~ "cheddar cheese", "tomato" ~ "tomatoes". */
function looseMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(' '));
  const tb = nb.split(' ');
  // singular/plural tolerant token hit
  return tb.some((t) => ta.has(t) || ta.has(`${t}s`) || ta.has(t.replace(/s$/, '')));
}

/**
 * @param {string} ingredientName
 * @param {string[]} userIngredients raw user input list
 * @returns {boolean}
 */
export function isUserProvided(ingredientName, userIngredients) {
  return userIngredients.some((u) => looseMatch(ingredientName, u));
}

/**
 * @param {string} ingredientName
 * @returns {boolean}
 */
export function isPantryStaple(ingredientName) {
  const n = normalizeName(ingredientName);
  // Exact match only — "truffle oil" is NOT a basic staple just because it contains "oil".
  return PANTRY_STAPLES.includes(n);
}

/**
 * Decide the trustworthy availability for an ingredient.
 * @param {string} name
 * @param {string[]} userIngredients
 * @returns {'available'|'to_buy'|'pantry_staple'}
 */
export function resolveAvailability(name, userIngredients) {
  if (isUserProvided(name, userIngredients)) return 'available';
  if (isPantryStaple(name)) return 'pantry_staple';
  return 'to_buy';
}
