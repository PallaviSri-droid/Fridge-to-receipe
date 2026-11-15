import { randomUUID } from 'crypto';
import { resolveAvailability } from './availability.js';

/**
 * Turn a loosely-validated recipe (already past Zod) into a trustworthy one:
 *  - assign stable server-side IDs (recipe / ingredient / step) — never trust model IDs
 *  - renumber steps sequentially regardless of what the model claimed
 *  - re-derive each ingredient's availability from the user's actual input
 *  - coerce quantity by kind: discrete -> whole & >=1, qualitative -> null
 *
 * @param {import('../../src/shared/recipeSchema.js').Recipe} recipe
 * @param {string[]} userIngredients raw user input
 * @returns {import('../../src/shared/recipeSchema.js').Recipe}
 */
export function normalizeRecipe(recipe, userIngredients) {
  const ingredients = recipe.ingredients.map((ing) => {
    const availability = resolveAvailability(ing.name, userIngredients);
    let quantity = ing.quantity;
    let kind = ing.kind || 'continuous';

    if (kind === 'qualitative') {
      quantity = null;
    } else if (quantity == null) {
      // a measurable ingredient with no number -> treat as qualitative rather than inventing one
      kind = 'qualitative';
    } else if (kind === 'discrete') {
      quantity = Math.max(1, Math.round(quantity));
    }

    return {
      ...ing,
      id: ing.id || `ing_${randomUUID()}`,
      kind,
      quantity,
      availability,
      substitutions: ing.substitutions || [],
    };
  });

  const steps = recipe.steps
    .map((s, idx) => ({
      ...s,
      id: s.id || `step_${randomUUID()}`,
      stepNumber: idx + 1,
    }));

  return {
    ...recipe,
    id: recipe.id || `recipe_${randomUUID()}`,
    ingredients,
    steps,
  };
}
