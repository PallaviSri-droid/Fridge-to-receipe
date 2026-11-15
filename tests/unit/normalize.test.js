import { describe, it, expect } from 'vitest';
import { normalizeRecipe } from '../../server/lib/normalize.js';
import { resolveAvailability } from '../../server/lib/availability.js';
import { resolveExclusions, findViolations, scanRecipe } from '../../server/lib/allergens.js';

const rawRecipe = {
  title: 'T', description: 'd', cuisine: '', difficulty: 'easy',
  prepTimeMinutes: 5, cookTimeMinutes: 5, baseServings: 2, dietaryTags: [],
  additionalIngredients: [], safetyNotes: [],
  ingredients: [
    { name: 'spinach', quantity: 100, unit: 'g', kind: 'continuous', availability: 'available', optional: false, substitutions: [] },
    { name: 'truffle oil', quantity: 1, unit: 'tbsp', kind: 'continuous', availability: 'available', optional: false, substitutions: [] },
    { name: 'eggs', quantity: 2.6, unit: '', kind: 'discrete', availability: 'available', optional: false, substitutions: [] },
    { name: 'salt', quantity: 3, unit: '', kind: 'qualitative', availability: 'available', optional: false, substitutions: [] },
  ],
  steps: [
    { instruction: 'b', durationMinutes: 2, tip: '', stepNumber: 5 },
    { instruction: 'a', durationMinutes: 1, tip: '', stepNumber: 1 },
  ],
};

describe('normalizeRecipe', () => {
  const out = normalizeRecipe(structuredClone(rawRecipe), ['spinach', 'eggs']);

  it('assigns ids to recipe, ingredients and steps', () => {
    expect(out.id).toMatch(/^recipe_/);
    expect(out.ingredients.every((i) => i.id)).toBe(true);
    expect(out.steps.every((s) => s.id)).toBe(true);
  });

  it('renumbers steps sequentially regardless of model numbering', () => {
    expect(out.steps.map((s) => s.stepNumber)).toEqual([1, 2]);
  });

  it('downgrades unverified "available" claims to to_buy', () => {
    const truffle = out.ingredients.find((i) => i.name === 'truffle oil');
    expect(truffle.availability).toBe('to_buy'); // user never listed it
    const spinach = out.ingredients.find((i) => i.name === 'spinach');
    expect(spinach.availability).toBe('available');
  });

  it('rounds discrete quantities and nulls qualitative', () => {
    expect(out.ingredients.find((i) => i.name === 'eggs').quantity).toBe(3);
    expect(out.ingredients.find((i) => i.name === 'salt').quantity).toBeNull();
  });
});

describe('availability', () => {
  it('matches singular/plural and substrings', () => {
    expect(resolveAvailability('tomatoes', ['tomato'])).toBe('available');
    expect(resolveAvailability('cheddar cheese', ['cheddar'])).toBe('available');
    expect(resolveAvailability('saffron', ['rice'])).toBe('to_buy');
    expect(resolveAvailability('olive oil', [])).toBe('pantry_staple');
  });
});

describe('allergens', () => {
  it('expands diets into allergen exclusions', () => {
    expect(resolveExclusions(['vegan'], []).sort()).toContain('dairy');
    expect(resolveExclusions(['nut-free'], []).sort()).toEqual(['nuts', 'peanuts'].sort());
  });
  it('detects keyword violations', () => {
    expect(findViolations('add grated cheese', ['dairy'])).not.toHaveLength(0);
    expect(findViolations('toss with olive oil', ['dairy'])).toHaveLength(0);
  });
  it('scans a whole recipe', () => {
    const recipe = { ingredients: [{ name: 'almonds' }], steps: [{ instruction: 'chop' }], additionalIngredients: [] };
    expect(scanRecipe(recipe, ['nuts'])).not.toHaveLength(0);
  });
});
