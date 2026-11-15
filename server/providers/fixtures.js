/**
 * Deterministic fixtures for the mock provider and for tests. These are RAW model
 * outputs (pre-validation, pre-normalization), so they intentionally include model-ish
 * quirks (missing ids, optimistic availability) that the pipeline then corrects.
 */

import { substitutionsFor } from '../lib/substitutions.js';

/** A well-formed recipe built loosely around the user's ingredients. */
export function buildMockRecipe(ingredients = [], servings = 2) {
  const have = ingredients.slice(0, 6);
  const title = have.length
    ? `${titleCase(have[0])} Skillet with ${have[1] ? titleCase(have[1]) : 'Herbs'}`
    : 'Pantry Skillet';

  return {
    title,
    description: `A quick, comforting dish that makes the most of ${have.join(', ') || 'what you have'}. Mock-generated so you can explore the full interface without an API key.`,
    cuisine: 'Home-style',
    difficulty: 'easy',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    baseServings: servings,
    dietaryTags: [],
    ingredients: [
      ...have.map((name) => ({
        name,
        quantity: /egg|onion|clove|slice/i.test(name) ? 2 : 150,
        unit: /egg|onion|clove|slice/i.test(name) ? '' : 'g',
        kind: /egg|onion|clove|slice/i.test(name) ? 'discrete' : 'continuous',
        availability: 'available', // deliberately optimistic -> normalizer verifies it
        optional: false,
        // real swaps from the knowledge base (generate filters these against exclusions)
        substitutions: substitutionsFor(name).slice(0, 2),
      })),
      { name: 'olive oil', quantity: 1, unit: 'tbsp', kind: 'continuous', availability: 'pantry_staple', optional: false, substitutions: substitutionsFor('olive oil').slice(0, 2) },
      { name: 'salt', quantity: null, unit: '', kind: 'qualitative', availability: 'pantry_staple', optional: false, substitutions: [] },
    ],
    steps: [
      { instruction: 'Prep and chop all your ingredients into even pieces.', durationMinutes: 5, tip: 'Even sizes cook at the same rate.' },
      { instruction: `Heat the olive oil in a pan over medium heat, then add ${have[0] || 'your main ingredient'}.`, durationMinutes: 5, tip: '' },
      { instruction: 'Add the remaining ingredients and cook, stirring occasionally, until tender.', durationMinutes: 8, tip: 'Season gradually and taste as you go.' },
      { instruction: 'Season to taste and serve warm.', durationMinutes: 2, tip: '' },
    ],
    additionalIngredients: [],
    safetyNotes: ['Cook all ingredients to a safe internal temperature before serving.'],
  };
}

/** Mock substitution output — real, curated swaps (empty for unknown ingredients). */
export function buildMockSubstitutions(ingredientName) {
  return { substitutions: substitutionsFor(ingredientName) };
}

function titleCase(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}
