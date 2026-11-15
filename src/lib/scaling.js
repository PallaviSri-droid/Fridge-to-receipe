/**
 * Serving scaling. The BASE recipe is immutable; the displayed recipe is a pure
 * function of (base, targetServings, substitutions). This structurally prevents the
 * classic bug of re-scaling already-scaled values.
 */

/**
 * Scale a single ingredient's quantity by a factor, honoring its kind.
 * @param {{ quantity: number|null, kind?: string }} ing
 * @param {number} factor
 * @returns {number|null}
 */
export function scaleQuantity(ing, factor) {
  if (ing.quantity == null || ing.kind === 'qualitative') return null; // "a pinch" never scales
  if (ing.kind === 'discrete') return Math.max(1, Math.round(ing.quantity * factor));
  // continuous: keep two decimals of precision; display layer prettifies to fractions
  return Math.round(ing.quantity * factor * 100) / 100;
}

/**
 * Produce the display recipe for a given serving count and substitution overlay.
 * @param {import('../shared/recipeSchema.js').Recipe} base immutable base recipe
 * @param {number} targetServings
 * @param {Record<string,{name:string, note?:string}>} [substitutions] keyed by ingredient id
 */
export function scaleRecipe(base, targetServings, substitutions = {}) {
  const servings = Math.max(1, Math.round(targetServings || base.baseServings));
  const factor = base.baseServings > 0 ? servings / base.baseServings : 1;

  const ingredients = base.ingredients.map((ing) => {
    const sub = substitutions[ing.id];
    return {
      ...ing,
      // keep the original so undo is trivial and steps can still reference it
      originalName: ing.name,
      name: sub ? sub.name : ing.name,
      substitutedWith: sub || null,
      displayQuantity: scaleQuantity(ing, factor),
    };
  });

  return {
    ...base,
    servings,
    scaleFactor: factor,
    ingredients,
    totalTimeMinutes: (base.prepTimeMinutes || 0) + (base.cookTimeMinutes || 0),
  };
}
