import { describe, it, expect } from 'vitest';
import { findViolations, resolveExclusions } from '../../server/lib/allergens.js';

const hasDairy = (t) => findViolations(t, ['dairy']).length > 0;
const hasNuts = (t) => findViolations(t, ['nuts']).length > 0;
const hasPeanuts = (t) => findViolations(t, ['peanuts']).length > 0;

describe('allergen scanner — dairy (catches real dairy)', () => {
  it.each(['grated cheddar', 'crumbled feta', 'parmesan shavings', 'buttermilk pancakes', 'whole milk', 'a knob of butter', 'heavy cream', 'greek yogurt'])(
    'flags "%s"', (t) => expect(hasDairy(t)).toBe(true)
  );
});

describe('allergen scanner — dairy (ignores plant/exception phrases)', () => {
  it.each(['coconut milk', 'almond milk', 'oat milk', 'soy milk', 'peanut butter', 'cocoa butter', 'cream of tartar', 'toss with olive oil', 'vegan cheese'])(
    'does NOT flag "%s" as dairy', (t) => expect(hasDairy(t)).toBe(false)
  );
});

describe('allergen scanner — nuts', () => {
  it('flags almonds and bare "mixed nuts"', () => {
    expect(hasNuts('toasted almonds')).toBe(true);
    expect(hasNuts('a handful of mixed nuts')).toBe(true);
    expect(hasNuts('almond butter')).toBe(true); // nut butter is still nuts
  });
  it('does NOT flag coconut, nutmeg, or butternut squash as nuts', () => {
    expect(hasNuts('coconut cream')).toBe(false);
    expect(hasNuts('a pinch of nutmeg')).toBe(false);
    expect(hasNuts('roasted butternut squash')).toBe(false);
  });
});

describe('allergen scanner — peanuts stay separate', () => {
  it('peanut butter trips peanuts but not dairy and not tree nuts', () => {
    expect(hasPeanuts('peanut butter')).toBe(true);
    expect(hasDairy('peanut butter')).toBe(false);
    expect(hasNuts('peanut butter')).toBe(false);
  });
});

describe('allergen scanner — gluten (ignores gluten-free flours/pastas)', () => {
  const hasGluten = (t) => findViolations(t, ['gluten']).length > 0;
  it.each(['rice flour', 'almond flour', 'chickpea flour', 'gluten-free pasta', 'rice noodles', 'corn tortilla'])(
    'does NOT flag "%s" as gluten', (t) => expect(hasGluten(t)).toBe(false)
  );
  it.each(['wheat flour', 'regular pasta', 'sourdough bread', 'soy sauce'])(
    'still flags "%s" as gluten', (t) => expect(hasGluten(t)).toBe(true)
  );
});

describe('resolveExclusions', () => {
  it('vegan implies dairy/eggs/fish/shellfish', () => {
    expect(resolveExclusions(['vegan'], []).sort()).toEqual(['dairy', 'eggs', 'fish', 'shellfish'].sort());
  });
  it('a vegan recipe using plant milk is NOT a violation', () => {
    expect(findViolations('simmer rice in coconut milk', resolveExclusions(['vegan'], []))).toHaveLength(0);
  });
});
