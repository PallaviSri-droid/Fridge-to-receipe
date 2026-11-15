import { RecipeSchema } from '../shared/recipeSchema.js';
import { z } from 'zod';

/**
 * Versioned localStorage persistence. Everything loaded from storage is Zod-validated;
 * corrupt or outdated entries are dropped rather than crashing the app. A version bump
 * invalidates incompatible old data cleanly.
 */

export const STORAGE_KEY = 'fridgechef.store.v1';
export const STORE_VERSION = 1;

const ProgressSchema = z.object({
  ingredients: z.record(z.boolean()).default({}),
  steps: z.record(z.boolean()).default({}),
});

const SavedRecipeSchema = z.object({
  recipe: RecipeSchema,
  servings: z.number().int().positive(),
  substitutions: z.record(z.object({ name: z.string(), note: z.string().default('') })).default({}),
  diets: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  savedAt: z.number(),
  progress: ProgressSchema.default({ ingredients: {}, steps: {} }),
});

const StoreSchema = z.object({
  version: z.literal(STORE_VERSION),
  recipes: z.array(SavedRecipeSchema).default([]),
});

/** Always return a FRESH empty store — never share the recipes array (it gets mutated). */
function empty() {
  return { version: STORE_VERSION, recipes: [] };
}

function backend(storage) {
  return storage || (typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined);
}

/**
 * Load the store, dropping anything that doesn't validate. Never throws.
 * @param {Storage} [storage] injectable for tests
 */
export function loadStore(storage) {
  const store = backend(storage);
  if (!store) return empty();
  let raw;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return empty();
  }
  if (!raw) return empty();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty(); // corrupt JSON -> start fresh
  }

  // version mismatch -> discard old data
  if (!parsed || parsed.version !== STORE_VERSION) return empty();

  // validate; if the top-level fails, salvage valid individual recipes
  const result = StoreSchema.safeParse(parsed);
  if (result.success) return result.data;

  const recipes = Array.isArray(parsed.recipes)
    ? parsed.recipes.filter((r) => SavedRecipeSchema.safeParse(r).success)
    : [];
  return { version: STORE_VERSION, recipes };
}

function persist(store, data) {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode — fail silently; app still works in-memory */
  }
}

/** @param {Storage} [storage] */
export function getSavedRecipes(storage) {
  return loadStore(storage).recipes.slice().sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Save (or update) a recipe by its id.
 * @param {object} entry { recipe, servings, substitutions, progress }
 * @param {Storage} [storage]
 */
export function saveRecipe(entry, storage) {
  const store = backend(storage);
  const data = loadStore(storage);
  const payload = {
    recipe: entry.recipe,
    servings: entry.servings ?? entry.recipe.baseServings,
    substitutions: entry.substitutions || {},
    diets: entry.diets || [],
    allergens: entry.allergens || [],
    savedAt: Date.now(),
    progress: entry.progress || { ingredients: {}, steps: {} },
  };
  const idx = data.recipes.findIndex((r) => r.recipe.id === entry.recipe.id);
  if (idx >= 0) data.recipes[idx] = payload;
  else data.recipes.push(payload);
  if (store) persist(store, data);
  return payload;
}

/** @param {string} recipeId @param {Storage} [storage] */
export function deleteRecipe(recipeId, storage) {
  const store = backend(storage);
  const data = loadStore(storage);
  data.recipes = data.recipes.filter((r) => r.recipe.id !== recipeId);
  if (store) persist(store, data);
  return data.recipes;
}

/** @param {string} recipeId @param {Storage} [storage] */
export function isSaved(recipeId, storage) {
  return loadStore(storage).recipes.some((r) => r.recipe.id === recipeId);
}

/**
 * Update just the cooking progress for a saved recipe.
 * @param {string} recipeId
 * @param {object} progress
 * @param {Storage} [storage]
 */
export function updateProgress(recipeId, progress, storage) {
  const store = backend(storage);
  const data = loadStore(storage);
  const entry = data.recipes.find((r) => r.recipe.id === recipeId);
  if (!entry) return false;
  entry.progress = ProgressSchema.parse(progress);
  if (store) persist(store, data);
  return true;
}
