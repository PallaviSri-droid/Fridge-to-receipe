/**
 * Ingredient input parsing & normalization — pure, so it's easy to unit-test.
 */

export const MAX_INGREDIENTS = 40;
export const MAX_INGREDIENT_LENGTH = 80;

/** Normalize a single ingredient token: trim, collapse spaces, lowercase-ish. */
export function normalizeIngredient(raw) {
  return String(raw).replace(/\s+/g, ' ').trim();
}

/** Key used for duplicate detection (case/space-insensitive). */
function dedupeKey(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Split free-form text on commas and newlines into clean tokens.
 * @param {string} text
 * @returns {string[]}
 */
export function parseIngredients(text) {
  return String(text)
    .split(/[,\n]/)
    .map(normalizeIngredient)
    .filter(Boolean)
    .map((s) => s.slice(0, MAX_INGREDIENT_LENGTH));
}

/**
 * Add new tokens to an existing list with dedupe + max-count enforcement.
 * @param {string[]} existing
 * @param {string} text free-form input to add
 * @returns {{ list: string[], added: number, rejectedDuplicate: number, atLimit: boolean }}
 */
export function addIngredients(existing, text) {
  const seen = new Set(existing.map(dedupeKey));
  const list = [...existing];
  let added = 0;
  let rejectedDuplicate = 0;

  for (const token of parseIngredients(text)) {
    const key = dedupeKey(token);
    if (seen.has(key)) {
      rejectedDuplicate += 1;
      continue;
    }
    if (list.length >= MAX_INGREDIENTS) break;
    seen.add(key);
    list.push(token);
    added += 1;
  }

  return { list, added, rejectedDuplicate, atLimit: list.length >= MAX_INGREDIENTS };
}

/** Remove an ingredient by index. */
export function removeIngredient(list, index) {
  return list.filter((_, i) => i !== index);
}
