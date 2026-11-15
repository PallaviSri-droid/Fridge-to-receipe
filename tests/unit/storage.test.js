import { describe, it, expect, beforeEach } from 'vitest';
import { saveRecipe, getSavedRecipes, deleteRecipe, isSaved, loadStore, STORAGE_KEY } from '../../src/lib/storage.js';

/** Minimal in-memory Storage mock. */
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    _raw: m,
  };
}

const recipe = {
  id: 'r1', title: 'Soup', description: 'warm', cuisine: '', difficulty: 'easy',
  prepTimeMinutes: 5, cookTimeMinutes: 10, baseServings: 2, dietaryTags: [],
  additionalIngredients: [], safetyNotes: [],
  ingredients: [{ id: 'i1', name: 'water', quantity: 500, unit: 'ml', kind: 'continuous', availability: 'pantry_staple', optional: false, substitutions: [] }],
  steps: [{ id: 's1', stepNumber: 1, instruction: 'boil', durationMinutes: 5, tip: '' }],
};

describe('storage', () => {
  let store;
  beforeEach(() => { store = memStorage(); });

  it('saves and reloads a recipe', () => {
    saveRecipe({ recipe, servings: 4 }, store);
    const saved = getSavedRecipes(store);
    expect(saved).toHaveLength(1);
    expect(saved[0].recipe.id).toBe('r1');
    expect(saved[0].servings).toBe(4);
    expect(isSaved('r1', store)).toBe(true);
  });

  it('updates in place rather than duplicating', () => {
    saveRecipe({ recipe, servings: 2 }, store);
    saveRecipe({ recipe, servings: 6 }, store);
    const saved = getSavedRecipes(store);
    expect(saved).toHaveLength(1);
    expect(saved[0].servings).toBe(6);
  });

  it('deletes a recipe', () => {
    saveRecipe({ recipe, servings: 2 }, store);
    deleteRecipe('r1', store);
    expect(getSavedRecipes(store)).toHaveLength(0);
  });

  it('drops corrupt JSON and starts fresh', () => {
    store.setItem(STORAGE_KEY, 'not json {');
    expect(loadStore(store).recipes).toEqual([]);
  });

  it('discards data from an incompatible version', () => {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 999, recipes: [{ recipe, servings: 2, savedAt: 1, substitutions: {}, progress: { ingredients: {}, steps: {} } }] }));
    expect(loadStore(store).recipes).toEqual([]);
  });

  it('salvages valid entries and drops invalid ones', () => {
    store.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      recipes: [
        { recipe, servings: 2, savedAt: 1, substitutions: {}, progress: { ingredients: {}, steps: {} } },
        { recipe: { id: 'bad' }, servings: 2, savedAt: 2 }, // invalid recipe
      ],
    }));
    const loaded = loadStore(store);
    expect(loaded.recipes).toHaveLength(1);
    expect(loaded.recipes[0].recipe.id).toBe('r1');
  });
});
