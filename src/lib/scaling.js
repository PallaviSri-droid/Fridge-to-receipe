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
/** Normalize an ingredient name for loose matching (lowercase, trim, drop a trailing "s"). */
function normalizeName(s) {
  return String(s || '').toLowerCase().trim().replace(/s$/, '');
}

export function scaleRecipe(base, targetServings, substitutions = {}) {
  const servings = Math.max(1, Math.round(targetServings || base.baseServings));
  const factor = base.baseServings > 0 ? servings / base.baseServings : 1;

  // What the user already has on hand — a swap TO one of these shouldn't become "to buy".
  const onHand = new Set(
    base.ingredients.filter((i) => i.availability === 'available').map((i) => normalizeName(i.name))
  );

  const ingredients = base.ingredients.map((ing) => {
    const sub = substitutions[ing.id];
    return {
      ...ing,
      // keep the original so undo is trivial and steps can still reference it
      originalName: ing.name,
      name: sub ? sub.name : ing.name,
      substitutedWith: sub || null,
      // a swapped-in ingredient is re-derived: "available" only if the user already has it,
      // otherwise "to buy" (they need to get the substitute).
      availability: sub ? (onHand.has(normalizeName(sub.name)) ? 'available' : 'to_buy') : ing.availability,
      displayQuantity: scaleQuantity(ing, factor),
    };
  });

  // Rewrite step/tip text so instructions name the chosen substitute, not the original.
  const swapped = ingredients.filter((i) => i.substitutedWith && i.originalName);
  const replace = buildNameReplacer(swapped);
  const steps = swapped.length
    ? base.steps.map((s) => ({ ...s, instruction: replace(s.instruction), tip: replace(s.tip) }))
    : base.steps;

  return {
    ...base,
    servings,
    scaleFactor: factor,
    ingredients,
    steps,
    totalTimeMinutes: (base.prepTimeMinutes || 0) + (base.cookTimeMinutes || 0),
  };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a single-pass, whole-word replacer for every swapped ingredient's original name.
 * One combined regex (longest name first) means reciprocal swaps — spinach→Kale AND
 * kale→Spinach — don't collapse into each other, and a "$" in a substitute name is treated
 * literally (callback replacement), not as a regex reference.
 */
function buildNameReplacer(swapped) {
  if (!swapped.length) return (text) => text || '';
  const sorted = [...swapped].sort((a, b) => b.originalName.length - a.originalName.length);
  const lookup = new Map(sorted.map((i) => [i.originalName.toLowerCase(), i.name]));
  const pattern = sorted.map((i) => escapeRe(i.originalName)).join('|');
  const re = new RegExp(`\\b(${pattern})\\b`, 'gi');
  return (text) => (text || '').replace(re, (m) => lookup.get(m.toLowerCase()) ?? m);
}
