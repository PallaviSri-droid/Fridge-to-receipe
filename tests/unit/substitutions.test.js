import { describe, it, expect } from 'vitest';
import { substitutionsFor, isSafeSubstitute } from '../../server/lib/substitutions.js';
import { findViolations } from '../../server/lib/allergens.js';

const names = (name) => substitutionsFor(name).map((s) => s.name);

// All keyword keys we expect the KB to cover, so we can sweep every entry.
const SAMPLE_KEYS = ['cheddar', 'cheese', 'butter', 'milk', 'egg', 'chicken', 'rice', 'flour', 'onion', 'olive oil', 'soy sauce', 'tomato'];

describe('substitutionsFor — real, specific swaps', () => {
  it('returns real substitutes for common ingredients', () => {
    expect(names('cheddar')).toContain('Monterey Jack');
    expect(names('butter')).toContain('Olive oil');
    expect(names('egg')).toContain('Flax egg');
    expect(names('rice')).toContain('Quinoa');
  });

  it('never fabricates a swap for unknown ingredients', () => {
    expect(substitutionsFor('dragonfruit')).toEqual([]);
    expect(substitutionsFor('')).toEqual([]);
    expect(substitutionsFor(undefined)).toEqual([]);
  });

  it('every swap name is non-empty and has a note', () => {
    for (const s of substitutionsFor('cheddar')) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(typeof s.note).toBe('string');
    }
  });

  it('contains no placeholder swap names', () => {
    for (const key of SAMPLE_KEYS) {
      for (const name of names(key)) {
        expect(name).not.toMatch(/another|alternative|similar|option|plant-based\)/i);
      }
    }
  });
});

describe('substitutionsFor — whole-word, longest-match-first', () => {
  it('"peanut butter" does not match the dairy "butter" entry', () => {
    expect(names('peanut butter')).toContain('Almond butter');
    expect(names('peanut butter')).not.toContain('Olive oil');
  });
  it('"coconut milk" is distinct from dairy "milk"', () => {
    expect(names('coconut milk')).toContain('Oat cream');
    expect(names('coconut milk')).not.toContain('Oat milk');
    expect(names('milk')).toContain('Oat milk');
  });
  it('"eggplant" is distinct from "egg"', () => {
    expect(names('eggplant')).toContain('Zucchini');
    expect(names('eggplant')).not.toContain('Flax egg');
  });
  it('"cream cheese" wins over "cheese" and "cream"', () => {
    expect(names('cream cheese')).toContain('Mascarpone');
    expect(names('cream cheese')).not.toContain('Evaporated milk'); // the "cream" entry
  });
  it('"cheddar cheese" resolves to the cheddar entry', () => {
    expect(names('cheddar cheese')).toContain('Monterey Jack');
  });
  it('does not match "butternut squash" as butter', () => {
    expect(substitutionsFor('butternut squash')).toEqual([]);
  });
});

describe('isSafeSubstitute — allergen filtering (name only)', () => {
  it('drops dairy cheeses for a dairy exclusion but keeps the dairy-free option', () => {
    const safe = substitutionsFor('cheddar').filter((s) => isSafeSubstitute(s.name, ['dairy'], []));
    expect(safe.length).toBeGreaterThan(0);
    expect(safe.map((s) => s.name)).toContain('Nutritional yeast');
    expect(safe.map((s) => s.name)).not.toContain('Monterey Jack');
  });

  it('keeps dairy-free fats when butter is excluded for dairy', () => {
    const safe = substitutionsFor('butter').filter((s) => isSafeSubstitute(s.name, ['dairy'], []));
    expect(safe.map((s) => s.name)).toContain('Olive oil');
    expect(safe.map((s) => s.name)).not.toContain('Ghee'); // ghee is dairy
  });

  it('a note never disqualifies a safe swap (name is scanned, not the note)', () => {
    // "Vegan butter" reads as butter but is dairy-free per the allergen exceptions
    expect(isSafeSubstitute('Vegan butter', ['dairy'], ['vegan'])).toBe(true);
  });

  it('keeps a gluten-free flour when gluten is excluded', () => {
    const safe = substitutionsFor('flour').filter((s) => isSafeSubstitute(s.name, ['gluten'], []));
    expect(safe.map((s) => s.name)).toContain('Almond flour');
    expect(safe.map((s) => s.name)).not.toContain('Whole wheat flour');
  });
});

describe('isSafeSubstitute — vegan/vegetarian exclude meat', () => {
  it('drops meat/poultry swaps for vegan and vegetarian diets', () => {
    const exclusions = ['dairy', 'eggs', 'fish', 'shellfish']; // vegan-resolved
    const safe = substitutionsFor('chicken').filter((s) => isSafeSubstitute(s.name, exclusions, ['vegan']));
    expect(safe.length).toBeGreaterThan(0);
    expect(safe.map((s) => s.name)).toContain('Chickpeas');
    expect(safe.map((s) => s.name)).not.toContain('Turkey breast');
  });

  it('allows meat swaps when no vegetarian/vegan diet is set', () => {
    expect(isSafeSubstitute('Turkey breast', [], [])).toBe(true);
  });

  it('keeps goat cheese for a vegetarian (goat is not treated as meat)', () => {
    expect(isSafeSubstitute('Goat cheese', ['fish', 'shellfish'], ['vegetarian'])).toBe(true);
  });
});

describe('dairy keyword expansion does not over-match non-dairy words', () => {
  it('does not flag "romano beans" as dairy', () => {
    expect(findViolations('romano beans', ['dairy'])).toHaveLength(0);
  });
  it('still flags a real named cheese with no "cheese" in the word', () => {
    expect(findViolations('monterey jack', ['dairy']).length).toBeGreaterThan(0);
    expect(findViolations('provolone', ['dairy']).length).toBeGreaterThan(0);
  });
});
