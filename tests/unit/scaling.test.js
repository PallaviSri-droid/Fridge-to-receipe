import { describe, it, expect } from 'vitest';
import { scaleRecipe, scaleQuantity } from '../../src/lib/scaling.js';
import { formatQuantity, formatMeasure } from '../../src/lib/format.js';

const baseRecipe = {
  id: 'r1',
  title: 'Test',
  description: 'd',
  cuisine: '',
  difficulty: 'easy',
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  baseServings: 2,
  dietaryTags: [],
  additionalIngredients: [],
  safetyNotes: [],
  ingredients: [
    { id: 'i1', name: 'rice', quantity: 150, unit: 'g', kind: 'continuous', availability: 'available', optional: false, substitutions: [] },
    { id: 'i2', name: 'eggs', quantity: 2, unit: '', kind: 'discrete', availability: 'available', optional: false, substitutions: [] },
    { id: 'i3', name: 'salt', quantity: null, unit: '', kind: 'qualitative', availability: 'pantry_staple', optional: false, substitutions: [] },
  ],
  steps: [{ id: 's1', stepNumber: 1, instruction: 'cook', durationMinutes: 5, tip: '' }],
};

describe('scaleQuantity', () => {
  it('scales continuous quantities linearly', () => {
    expect(scaleQuantity({ quantity: 150, kind: 'continuous' }, 2)).toBe(300);
  });
  it('rounds discrete quantities to whole numbers, min 1', () => {
    expect(scaleQuantity({ quantity: 2, kind: 'discrete' }, 1.33)).toBe(3);
    expect(scaleQuantity({ quantity: 2, kind: 'discrete' }, 0.1)).toBe(1); // never below 1
  });
  it('never scales qualitative quantities', () => {
    expect(scaleQuantity({ quantity: null, kind: 'qualitative' }, 4)).toBeNull();
  });
});

describe('scaleRecipe', () => {
  it('doubles 2 -> 4 servings correctly (150g rice -> 300g)', () => {
    const scaled = scaleRecipe(baseRecipe, 4);
    expect(scaled.servings).toBe(4);
    expect(scaled.ingredients[0].displayQuantity).toBe(300);
    expect(scaled.ingredients[1].displayQuantity).toBe(4); // 2 eggs -> 4
    expect(scaled.ingredients[2].displayQuantity).toBeNull(); // salt stays qualitative
  });

  it('does not mutate the immutable base (no re-scaling drift)', () => {
    scaleRecipe(baseRecipe, 4);
    scaleRecipe(baseRecipe, 8);
    expect(baseRecipe.ingredients[0].quantity).toBe(150); // base untouched
  });

  it('avoids fractional eggs at 3 servings (2 eggs * 1.5 = 3)', () => {
    const scaled = scaleRecipe(baseRecipe, 3);
    expect(scaled.ingredients[1].displayQuantity).toBe(3);
    expect(Number.isInteger(scaled.ingredients[1].displayQuantity)).toBe(true);
  });

  it('applies a substitution overlay without losing the original', () => {
    const scaled = scaleRecipe(baseRecipe, 2, { i1: { name: 'quinoa', note: 'gluten-free' } });
    expect(scaled.ingredients[0].name).toBe('quinoa');
    expect(scaled.ingredients[0].originalName).toBe('rice');
    expect(scaled.ingredients[0].substitutedWith.name).toBe('quinoa');
  });
});

describe('formatQuantity', () => {
  it('renders common fractions', () => {
    expect(formatQuantity(0.5)).toBe('1/2');
    expect(formatQuantity(1.5)).toBe('1 1/2');
    expect(formatQuantity(0.25)).toBe('1/4');
  });
  it('renders whole numbers cleanly', () => {
    expect(formatQuantity(3)).toBe('3');
    expect(formatQuantity(300)).toBe('300');
  });
  it('formatMeasure uses "to taste" for qualitative', () => {
    expect(formatMeasure({ quantity: null, unit: '', kind: 'qualitative' })).toBe('to taste');
    expect(formatMeasure({ quantity: 1.5, unit: 'cups', kind: 'continuous' })).toBe('1 1/2 cups');
  });
});
