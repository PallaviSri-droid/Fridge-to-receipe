import { describe, it, expect } from 'vitest';
import { parseIngredients, addIngredients, removeIngredient, normalizeIngredient, MAX_INGREDIENTS } from '../../src/lib/ingredients.js';

describe('parseIngredients', () => {
  it('splits on commas and newlines, trims, drops empties', () => {
    expect(parseIngredients('  eggs, spinach\n onion ,, ')).toEqual(['eggs', 'spinach', 'onion']);
  });
  it('collapses internal whitespace', () => {
    expect(normalizeIngredient('  cheddar   cheese ')).toBe('cheddar cheese');
  });
});

describe('addIngredients', () => {
  it('dedupes case-insensitively', () => {
    const r = addIngredients(['Eggs'], 'eggs, spinach');
    expect(r.list).toEqual(['Eggs', 'spinach']);
    expect(r.added).toBe(1);
    expect(r.rejectedDuplicate).toBe(1);
  });
  it('enforces the max ingredient count', () => {
    const many = Array.from({ length: MAX_INGREDIENTS }, (_, i) => `ing${i}`);
    const r = addIngredients(many, 'overflow');
    expect(r.list).toHaveLength(MAX_INGREDIENTS);
    expect(r.atLimit).toBe(true);
    expect(r.added).toBe(0);
  });
});

describe('removeIngredient', () => {
  it('removes by index', () => {
    expect(removeIngredient(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });
});
