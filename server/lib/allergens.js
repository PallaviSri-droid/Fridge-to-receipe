/**
 * Deterministic allergen enforcement. We never trust the model's claim that a recipe or
 * substitute is "safe": we scan the generated text for keyword matches against the user's
 * strict exclusions. The scanner is plant-milk aware so it doesn't flag "almond milk" or
 * "peanut butter" as dairy, and it recognizes common cheeses and bare "nuts".
 */

/** Allergen -> indicative keywords (lowercased, whole-word match). */
const ALLERGEN_KEYWORDS = {
  dairy: [
    'milk', 'butter', 'cheese', 'cream', 'yogurt', 'yoghurt', 'ghee', 'paneer', 'whey',
    'casein', 'custard', 'buttermilk', 'creme fraiche', 'crème fraîche',
    'cheddar', 'feta', 'parmesan', 'parmigiano', 'mozzarella', 'brie', 'gouda', 'ricotta', 'mascarpone', 'halloumi',
    // named cheeses with no "cheese" in the word — needed so they can't slip past the scan
    'monterey jack', 'provolone', 'pecorino', 'grana padano', 'gruyere', 'gruyère',
    'asiago', 'manchego', 'gorgonzola', 'havarti', 'colby',
  ],
  eggs: ['egg', 'eggs', 'mayonnaise', 'mayo', 'albumen', 'meringue'],
  nuts: ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'pine nut', 'nut', 'nuts'],
  peanuts: ['peanut', 'peanuts', 'groundnut', 'arachis'],
  gluten: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'barley', 'rye', 'couscous', 'bulgur', 'semolina', 'cracker', 'soy sauce'],
  soy: ['soy', 'soya', 'tofu', 'edamame', 'miso', 'tempeh', 'soy sauce'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop', 'squid', 'crayfish'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'sardine', 'mackerel', 'tilapia', 'haddock', 'trout'],
};

/** Dietary tags imply allergen exclusions too. */
const DIET_IMPLIES_ALLERGENS = {
  vegan: ['dairy', 'eggs', 'fish', 'shellfish'],
  vegetarian: ['fish', 'shellfish'],
  'gluten-free': ['gluten'],
  'dairy-free': ['dairy'],
  'egg-free': ['eggs'],
  'nut-free': ['nuts', 'peanuts'],
};

/**
 * Phrases that LOOK like an allergen by keyword but are NOT. Removed from the text before
 * that specific allergen's scan only — so e.g. stripping "peanut butter" for the dairy scan
 * doesn't stop the peanuts scan (which runs on the original text) from catching it.
 */
const ALLERGEN_EXCEPTIONS = {
  dairy: [
    /\b(coconut|almond|oat|soy|soya|rice|cashew|hemp|pea|hazelnut|macadamia|walnut|pistachio|sunflower|plant[- ]?based|vegan|non[- ]?dairy|dairy[- ]?free)\s+(milk|cream|butter|yogurt|yoghurt|cheese)\b/g,
    /\bpeanut\s+butter\b/g,
    /\bnut\s+butter\b/g,
    /\bcocoa\s+butter\b/g,
    /\bshea\s+butter\b/g,
    /\bcream\s+of\s+tartar\b/g,
    /\bnon[- ]?dairy\b/g,
    /\bdairy[- ]?free\b/g,
  ],
  gluten: [
    // gluten-free flours/pastas/breads (note: oats are intentionally NOT excepted — commonly
    // cross-contaminated — and the cross-contamination disclosure covers that case)
    /\b(rice|almond|coconut|corn|chickpea|gram|tapioca|buckwheat|cassava|potato|sorghum|millet|quinoa|gluten[- ]?free)\s+(flour|pasta|noodles?|bread|crackers?|couscous)\b/g,
    /\bgluten[- ]?free\b/g,
    /\brice\s+noodles?\b/g,
  ],
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word (plural-tolerant) matcher for a keyword. */
export function keywordRegex(kw) {
  return new RegExp(`(^|[^a-z])${escapeRe(kw)}(s|es)?([^a-z]|$)`, 'i');
}

/** Remove an allergen's known-safe phrases before scanning for that allergen. */
function stripExceptions(text, allergen) {
  let t = text;
  for (const re of ALLERGEN_EXCEPTIONS[allergen] || []) t = t.replace(re, ' ');
  return t;
}

/**
 * Expand diets + explicit allergens into the full allergen exclusion set.
 * @param {string[]} diets
 * @param {string[]} allergens
 * @returns {string[]}
 */
export function resolveExclusions(diets = [], allergens = []) {
  const set = new Set(allergens);
  for (const d of diets) (DIET_IMPLIES_ALLERGENS[d] || []).forEach((a) => set.add(a));
  return [...set];
}

/**
 * Find allergen violations in a block of text.
 * @param {string} text
 * @param {string[]} exclusions resolved allergen keys
 * @returns {{ allergen: string, keyword: string }[]}
 */
export function findViolations(text, exclusions) {
  const lower = String(text).toLowerCase();

  /** @type {{ allergen: string, keyword: string }[]} */
  const hits = [];
  for (const allergen of exclusions) {
    const hay = ` ${stripExceptions(lower, allergen)} `;
    for (const kw of ALLERGEN_KEYWORDS[allergen] || []) {
      if (keywordRegex(kw).test(hay)) {
        hits.push({ allergen, keyword: kw });
        break; // one hit per allergen is enough
      }
    }
  }
  return hits;
}

/**
 * Scan a full recipe for allergen violations across names + instructions + substitutions.
 * @param {{ ingredients: {name:string}[], steps: {instruction:string}[], additionalIngredients?: string[] }} recipe
 * @param {string[]} exclusions
 */
export function scanRecipe(recipe, exclusions) {
  if (!exclusions.length) return [];
  const parts = [
    ...recipe.ingredients.map((i) => i.name),
    ...(recipe.additionalIngredients || []),
    ...recipe.steps.map((s) => s.instruction),
  ];
  return findViolations(parts.join(' | '), exclusions);
}

/** Human-readable cross-contamination disclosure appended whenever exclusions are active. */
export const CROSS_CONTAMINATION_NOTE =
  'Automatically checked against your exclusions by keyword only. Always verify product labels — ' +
  'processed or packaged foods may carry allergen cross-contamination we cannot detect.';
