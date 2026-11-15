/**
 * Deterministic substitution knowledge base.
 *
 * Powers the mock provider (so swaps are genuinely useful without an API key) and the
 * inline recipe substitutions. Entries are curated, real cooking swaps with short notes
 * that include ratio guidance where it matters.
 *
 * Matching is whole-word and longest-key-first (reusing the allergen scanner's matcher),
 * so "peanut butter" wins over "butter", "coconut milk" over "milk", and "cheddar" never
 * collides with "butternut". Unknown ingredients return [] — we never fabricate a swap.
 */

import { keywordRegex, findViolations } from './allergens.js';

/** keyword -> ordered list of { name, note } substitutes. */
const SUBS = {
  // ---- Cheese & dairy ----
  cheddar: [
    { name: 'Monterey Jack', note: 'Melts the same way, a touch milder. Swap 1:1.' },
    { name: 'Gouda', note: 'Similar melt, slightly sweeter and nuttier. Swap 1:1.' },
    { name: 'Nutritional yeast', note: 'Dairy-free; use ~1 tbsp for a savory, cheesy hit.' },
  ],
  parmesan: [
    { name: 'Pecorino Romano', note: 'Sharper and saltier; use a little less.' },
    { name: 'Grana Padano', note: 'Milder, less expensive, melts similarly. Swap 1:1.' },
    { name: 'Nutritional yeast', note: 'Dairy-free; adds a nutty, umami finish.' },
  ],
  mozzarella: [
    { name: 'Provolone', note: 'Melts well with a little more tang. Swap 1:1.' },
    { name: 'Monterey Jack', note: 'Mild and very meltable. Swap 1:1.' },
  ],
  feta: [
    { name: 'Goat cheese', note: 'Similar tang and crumble; a bit creamier.' },
    { name: 'Ricotta salata', note: 'Firm, salty, crumbles like feta. Swap 1:1.' },
  ],
  'cream cheese': [
    { name: 'Mascarpone', note: 'Richer and sweeter; swap 1:1 in most dishes.' },
    { name: 'Ricotta', note: 'Blend until smooth for a lighter result.' },
  ],
  cheese: [
    { name: 'Gouda', note: 'Mild and very meltable; or try Jack or Swiss.' },
    { name: 'Mozzarella', note: 'Mild, stretchy melt. Swap 1:1.' },
    { name: 'Nutritional yeast', note: 'Dairy-free; adds savory, cheesy depth.' },
  ],
  butter: [
    { name: 'Olive oil', note: 'For sautéing, use ~3/4 the amount.' },
    { name: 'Ghee', note: 'Nutty, lactose-reduced; swap 1:1.' },
    { name: 'Coconut oil', note: 'Dairy-free; swap 1:1 (adds mild coconut note).' },
  ],
  // Keyed longer than "butter" so nut butters never match the dairy "butter" entry.
  'peanut butter': [
    { name: 'Almond butter', note: 'Swap 1:1; slightly sweeter and milder.' },
    { name: 'Sunflower seed butter', note: 'Nut-free and peanut-free; swap 1:1.' },
  ],
  'almond butter': [
    { name: 'Peanut butter', note: 'Swap 1:1; more classic flavor.' },
    { name: 'Sunflower seed butter', note: 'Nut-free; swap 1:1.' },
  ],
  'coconut milk': [
    { name: 'Oat cream', note: 'Dairy-free; similar body for curries and sauces.' },
    { name: 'Heavy cream', note: 'Richer; thin with a splash of water. Not vegan.' },
    { name: 'Cashew cream', note: 'Blend soaked cashews with water until smooth.' },
  ],
  milk: [
    { name: 'Oat milk', note: 'Dairy-free; neutral and creamy. Swap 1:1.' },
    { name: 'Soy milk', note: 'Dairy-free; highest protein, swap 1:1.' },
    { name: 'Almond milk', note: 'Dairy-free; lighter body. Swap 1:1.' },
  ],
  cream: [
    { name: 'Evaporated milk', note: 'Lighter; good in sauces. Swap 1:1.' },
    { name: 'Greek yogurt', note: 'Add off the heat so it does not split.' },
    { name: 'Coconut cream', note: 'Dairy-free, rich; swap 1:1.' },
  ],
  yogurt: [
    { name: 'Sour cream', note: 'Similar tang and body. Swap 1:1.' },
    { name: 'Buttermilk', note: 'Thinner; good where you want a pourable tang.' },
    { name: 'Coconut yogurt', note: 'Dairy-free; swap 1:1.' },
  ],
  'sour cream': [
    { name: 'Greek yogurt', note: 'Tangier and lighter. Swap 1:1.' },
    { name: 'Crème fraîche', note: 'Richer, less tangy. Swap 1:1.' },
  ],

  // ---- Eggs ----
  egg: [
    { name: 'Flax egg', note: 'Baking only: 1 tbsp ground flax + 3 tbsp water per egg.' },
    { name: 'Silken tofu', note: '1/4 cup blended per egg; good for binding.' },
    { name: 'Unsweetened applesauce', note: 'Baking: 1/4 cup per egg for moisture.' },
  ],

  // ---- Proteins ----
  chicken: [
    { name: 'Tofu', note: 'Press firm tofu; sear for texture. Plant-based.' },
    { name: 'Chickpeas', note: 'Hearty, plant-based; great in curries and bowls.' },
    { name: 'Turkey breast', note: 'Leaner, cooks similarly. Swap 1:1.' },
  ],
  beef: [
    { name: 'Lentils', note: 'Plant-based; brown well for a meaty bite.' },
    { name: 'Mushrooms', note: 'Finely chopped for a savory, plant-based base.' },
    { name: 'Ground turkey', note: 'Leaner; cooks the same. Swap 1:1.' },
  ],
  pork: [
    { name: 'Chicken thighs', note: 'Juicy and forgiving. Swap 1:1.' },
    { name: 'Jackfruit', note: 'Young jackfruit shreds like pulled pork. Plant-based.' },
  ],
  turkey: [
    { name: 'Chicken', note: 'Interchangeable in most dishes. Swap 1:1.' },
    { name: 'Tofu', note: 'Plant-based; press and sear for texture.' },
  ],
  bacon: [
    { name: 'Pancetta', note: 'Unsmoked but similar richness.' },
    { name: 'Smoked tempeh', note: 'Plant-based; brush with a little oil and crisp.' },
  ],
  shrimp: [
    { name: 'Firm tofu', note: 'Plant-based; cube and sear.' },
    { name: 'Chicken', note: 'Cut small so it cooks quickly.' },
  ],
  fish: [
    { name: 'Chicken breast', note: 'Mild and flaky when gently cooked.' },
    { name: 'Hearts of palm', note: 'Plant-based; flakes like white fish.' },
    { name: 'Firm tofu', note: 'Plant-based; marinate for flavor.' },
  ],
  tofu: [
    { name: 'Tempeh', note: 'Firmer, nuttier; steam first to mellow.' },
    { name: 'Paneer', note: 'Holds shape when fried. Not vegan.' },
    { name: 'Chickpeas', note: 'Plant-based, soy-free alternative.' },
  ],

  // ---- Grains, starches, flour ----
  rice: [
    { name: 'Quinoa', note: 'Cooks faster; higher protein. Swap 1:1 cooked.' },
    { name: 'Couscous', note: 'Quick; fluffier texture.' },
    { name: 'Cauliflower rice', note: 'Low-carb; needs much less cook time.' },
  ],
  pasta: [
    { name: 'Rice noodles', note: 'Gluten-free; soak or boil briefly.' },
    { name: 'Zucchini noodles', note: 'Low-carb; barely cook so they stay firm.' },
    { name: 'Gnocchi', note: 'Heartier; cooks in a couple of minutes.' },
  ],
  bread: [
    { name: 'Tortilla', note: 'Good for wraps and quick sandwiches.' },
    { name: 'Pita', note: 'Pocket or flat; warm before serving.' },
  ],
  breadcrumbs: [
    { name: 'Panko', note: 'Crispier, lighter coating. Swap 1:1.' },
    { name: 'Crushed crackers', note: 'Similar bind and crunch.' },
    { name: 'Rolled oats', note: 'Pulse to crumbs; gluten-free if certified.' },
  ],
  flour: [
    { name: 'Whole wheat flour', note: 'Nuttier, denser; start at a 1:1 swap.' },
    { name: 'Almond flour', note: 'Gluten-free; add a binder as it lacks gluten.' },
    { name: 'Oat flour', note: 'Mild; gluten-free if certified. Swap ~1:1.' },
  ],

  // ---- Vegetables & aromatics ----
  onion: [
    { name: 'Shallot', note: 'Milder and sweeter; use a similar volume.' },
    { name: 'Leek', note: 'Use the white part; gentler onion flavor.' },
    { name: 'Green onion', note: 'Lighter; add near the end.' },
  ],
  garlic: [
    { name: 'Shallot', note: 'Adds allium depth without the sharp bite.' },
    { name: 'Garlic powder', note: '1/8 tsp per clove.' },
  ],
  shallot: [
    { name: 'Onion', note: 'Use a bit less; a little stronger.' },
    { name: 'Red onion', note: 'Milder raw; good in dressings.' },
  ],
  spinach: [
    { name: 'Kale', note: 'Heartier; cook a little longer.' },
    { name: 'Swiss chard', note: 'Similar when wilted; stems take longer.' },
    { name: 'Arugula', note: 'Peppery; wilt at the end.' },
  ],
  kale: [
    { name: 'Spinach', note: 'Softer; wilts much faster.' },
    { name: 'Collard greens', note: 'Sturdier; cook longer.' },
  ],
  tomato: [
    { name: 'Canned tomatoes', note: 'Drain for a fresher texture.' },
    { name: 'Red bell pepper', note: 'Sweet, not acidic; roast for depth.' },
  ],
  'bell pepper': [
    { name: 'Poblano', note: 'Mild heat; roast and peel for sweetness.' },
    { name: 'Zucchini', note: 'Neutral; adds body without sweetness.' },
  ],
  mushroom: [
    { name: 'Zucchini', note: 'Milder; brown well for savoriness.' },
    { name: 'Eggplant', note: 'Meaty; salt and sear.' },
  ],
  eggplant: [
    { name: 'Zucchini', note: 'Lighter; cooks faster.' },
    { name: 'Portobello', note: 'Meaty and similar when roasted.' },
  ],
  zucchini: [
    { name: 'Yellow squash', note: 'Nearly identical. Swap 1:1.' },
    { name: 'Eggplant', note: 'Meatier; may need more oil.' },
  ],
  potato: [
    { name: 'Sweet potato', note: 'Sweeter; cooks a bit faster.' },
    { name: 'Cauliflower', note: 'Low-carb; shorter cook time.' },
    { name: 'Turnip', note: 'Peppery, lower-carb. Swap 1:1.' },
  ],
  'sweet potato': [
    { name: 'Butternut squash', note: 'Similar sweetness and texture.' },
    { name: 'Carrot', note: 'Firmer; cut smaller to match cook time.' },
  ],
  carrot: [
    { name: 'Parsnip', note: 'Sweeter, earthier. Swap 1:1.' },
    { name: 'Sweet potato', note: 'Softer; adds sweetness.' },
  ],

  // ---- Oils, condiments, sweeteners, acids ----
  'olive oil': [
    { name: 'Avocado oil', note: 'Neutral, high smoke point. Swap 1:1.' },
    { name: 'Vegetable oil', note: 'Neutral flavor. Swap 1:1.' },
  ],
  'vegetable oil': [
    { name: 'Olive oil', note: 'More flavor; fine for most cooking. Swap 1:1.' },
    { name: 'Sunflower oil', note: 'Neutral, high smoke point. Swap 1:1.' },
  ],
  'soy sauce': [
    { name: 'Tamari', note: 'Gluten-free, similar salt and umami. Swap 1:1.' },
    { name: 'Coconut aminos', note: 'Soy-free, milder and a bit sweet; use a little more.' },
  ],
  honey: [
    { name: 'Maple syrup', note: 'Vegan; swap 1:1.' },
    { name: 'Agave nectar', note: 'Milder, slightly thinner. Swap ~1:1.' },
  ],
  sugar: [
    { name: 'Honey', note: 'Use ~3/4 the amount and cut other liquid slightly.' },
    { name: 'Maple syrup', note: 'Use ~3/4 the amount; reduce liquid a touch.' },
    { name: 'Coconut sugar', note: 'Swap 1:1; adds a faint caramel note.' },
  ],
  lemon: [
    { name: 'Lime juice', note: 'Swap 1:1 for similar brightness.' },
    { name: 'White vinegar', note: 'Use about half; purely for acidity.' },
  ],
  lime: [
    { name: 'Lemon juice', note: 'Swap 1:1; a little less floral.' },
    { name: 'White vinegar', note: 'Use about half; just for acid.' },
  ],
  vinegar: [
    { name: 'Lemon juice', note: 'Brighter acidity. Swap ~1:1.' },
    { name: 'Lime juice', note: 'Similar acidity. Swap ~1:1.' },
  ],

  // ---- Herbs & seasoning ----
  cilantro: [
    { name: 'Flat-leaf parsley', note: 'Fresh and green, without the citrus note.' },
    { name: 'Thai basil', note: 'Different but works in many of the same dishes.' },
  ],
  parsley: [
    { name: 'Cilantro', note: 'Brighter, citrusy; swap 1:1.' },
    { name: 'Chives', note: 'Milder; adds a gentle onion note.' },
  ],
  basil: [
    { name: 'Oregano', note: 'Use about half; much stronger.' },
    { name: 'Flat-leaf parsley', note: 'Milder, for color and freshness.' },
  ],
  ginger: [
    { name: 'Ground ginger', note: '1/4 tsp per 1 tbsp fresh.' },
    { name: 'Galangal', note: 'Sharper, citrusy; common in SE Asian dishes.' },
  ],
  pepper: [
    { name: 'White pepper', note: 'Milder, earthier; disappears into light sauces.' },
    { name: 'Cayenne', note: 'Use a pinch; adds heat without much aroma.' },
  ],
};

/** Keys longest-first so multi-word keys win over the single word they contain. */
const KEYS_BY_LENGTH = Object.keys(SUBS).sort((a, b) => b.length - a.length || a.localeCompare(b));

/**
 * Real, deterministic substitutes for an ingredient name. Returns [] for anything not in
 * the knowledge base — we never invent a swap.
 * @param {string} rawName
 * @returns {{ name: string, note: string }[]}
 */
export function substitutionsFor(rawName) {
  const name = ` ${String(rawName || '').toLowerCase().trim()} `;
  for (const key of KEYS_BY_LENGTH) {
    if (keywordRegex(key).test(name)) {
      return SUBS[key].map((s) => ({ name: s.name, note: s.note }));
    }
  }
  return [];
}

/** Meat/poultry keywords that vegan and vegetarian diets must exclude (fish/shellfish are
 *  already handled by allergen exclusions via resolveExclusions). */
// Note: "goat" is intentionally excluded — "goat cheese"/"goat milk" are vegetarian-friendly
// dairy, and goat meat does not appear in this knowledge base.
const MEAT_KEYWORDS = [
  'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'venison',
  'bacon', 'ham', 'sausage', 'prosciutto', 'pancetta', 'steak', 'mince', 'poultry', 'gelatin',
];

/**
 * Whether a proposed substitute is safe to show, given the user's exclusions and diets.
 * We scan the NAME ONLY (never the note — natural notes like "not vegan" or ratio text must
 * not disqualify an otherwise-safe swap), plus a meat check for vegan/vegetarian diets.
 * @param {string} name substitute name
 * @param {string[]} exclusions resolved allergen keys
 * @param {string[]} diets dietary tags from the request
 */
export function isSafeSubstitute(name, exclusions = [], diets = []) {
  if (findViolations(name, exclusions).length > 0) return false;
  if (diets.includes('vegan') || diets.includes('vegetarian')) {
    const hay = ` ${String(name).toLowerCase()} `;
    if (MEAT_KEYWORDS.some((kw) => keywordRegex(kw).test(hay))) return false;
  }
  return true;
}
