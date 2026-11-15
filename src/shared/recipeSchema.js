import { z } from 'zod';

/**
 * Canonical recipe data contract — the SINGLE source of truth for validation,
 * imported by both the Express backend and the React frontend. The provider
 * JSON schema (see server/providers/geminiSchema.js) is a generation *hint*;
 * THIS Zod schema is the authority that guarantees shape before anything renders.
 */

// ---- Enums (shared across UI, prompt, and validation) ----

export const DIETARY_OPTIONS = /** @type {const} */ ([
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'egg-free',
  'nut-free',
]);

/** Allergen exclusions are a strict superset concept layered on dietary tags. */
export const ALLERGEN_OPTIONS = /** @type {const} */ ([
  'dairy',
  'eggs',
  'nuts',
  'peanuts',
  'gluten',
  'soy',
  'shellfish',
  'fish',
]);

export const DIFFICULTY_OPTIONS = /** @type {const} */ (['easy', 'medium', 'hard']);

/** How a quantity behaves under serving-scaling. */
export const INGREDIENT_KINDS = /** @type {const} */ ([
  'continuous', // grams, ml, cups — scales smoothly
  'discrete', // eggs, onions, slices — whole numbers, min 1
  'qualitative', // "a pinch", "to taste" — never scaled
]);

export const AVAILABILITY = /** @type {const} */ ([
  'available', // user said they have it
  'to_buy', // must be purchased
  'pantry_staple', // assumed on hand (salt, oil, water, pepper)
]);

// ---- Leaf schemas ----

export const SubstitutionSchema = z.object({
  name: z.string().min(1),
  note: z.string().default(''),
});

export const IngredientSchema = z.object({
  id: z.string().optional(), // assigned server-side; optional from the model
  name: z.string().min(1, 'Ingredient name cannot be empty'),
  /** null for qualitative items ("a pinch"); a number otherwise. */
  quantity: z.number().positive().nullable(),
  unit: z.string().default(''),
  kind: z.enum(INGREDIENT_KINDS).default('continuous'),
  availability: z.enum(AVAILABILITY).default('to_buy'),
  optional: z.boolean().default(false),
  substitutions: z.array(SubstitutionSchema).default([]),
});

export const StepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive().optional(),
  instruction: z.string().min(1, 'Instruction cannot be empty'),
  durationMinutes: z.number().nonnegative().nullable().default(null),
  tip: z.string().default(''),
});

export const RecipeSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  cuisine: z.string().default(''),
  difficulty: z.enum(DIFFICULTY_OPTIONS).default('medium'),
  prepTimeMinutes: z.number().nonnegative(),
  cookTimeMinutes: z.number().nonnegative(),
  baseServings: z.number().int().positive(),
  dietaryTags: z.array(z.string()).default([]),
  ingredients: z.array(IngredientSchema).min(1, 'Recipe must contain at least one ingredient'),
  steps: z.array(StepSchema).min(1, 'Recipe must contain at least one step'),
  additionalIngredients: z.array(z.string()).default([]),
  safetyNotes: z.array(z.string()).default([]),
});

/** Request body the client sends to /api/recipes/generate. */
export const GenerateRequestSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1).max(40),
  diets: z.array(z.enum(DIETARY_OPTIONS)).default([]),
  allergens: z.array(z.enum(ALLERGEN_OPTIONS)).default([]),
  maxTimeMinutes: z.number().int().positive().max(600).nullable().default(null),
  difficulty: z.enum(DIFFICULTY_OPTIONS).nullable().default(null),
  servings: z.number().int().positive().max(50).default(2),
  cuisine: z.string().max(60).default(''),
});

/** Request body the client sends to /api/recipes/substitute. */
export const SubstituteRequestSchema = z.object({
  ingredientName: z.string().min(1),
  recipeTitle: z.string().min(1),
  diets: z.array(z.enum(DIETARY_OPTIONS)).default([]),
  allergens: z.array(z.enum(ALLERGEN_OPTIONS)).default([]),
});

/**
 * @typedef {z.infer<typeof RecipeSchema>} Recipe
 * @typedef {z.infer<typeof IngredientSchema>} Ingredient
 * @typedef {z.infer<typeof StepSchema>} Step
 */

/**
 * Validate an unknown value as a Recipe. Returns a discriminated result so
 * callers can branch without try/catch.
 * @param {unknown} data
 */
export function parseRecipe(data) {
  const result = RecipeSchema.safeParse(data);
  if (result.success) return { ok: true, recipe: result.data };
  return { ok: false, issues: result.error.issues };
}
