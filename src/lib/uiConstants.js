import { DIETARY_OPTIONS, ALLERGEN_OPTIONS, DIFFICULTY_OPTIONS } from '../shared/recipeSchema.js';

export const DIET_LABELS = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  'egg-free': 'Egg-free',
  'nut-free': 'Nut-free',
};

export const ALLERGEN_LABELS = {
  dairy: 'Dairy',
  eggs: 'Eggs',
  nuts: 'Tree nuts',
  peanuts: 'Peanuts',
  gluten: 'Gluten',
  soy: 'Soy',
  shellfish: 'Shellfish',
  fish: 'Fish',
};

export const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const DIETS = DIETARY_OPTIONS;
export const ALLERGENS = ALLERGEN_OPTIONS;
export const DIFFICULTIES = DIFFICULTY_OPTIONS;

/** Suggested ingredient combinations shown on the empty input. */
export const SUGGESTED_COMBOS = [
  { label: '🍳 Omelet', items: ['eggs', 'spinach', 'onion', 'cheddar', 'butter'] },
  { label: '🍝 Pasta night', items: ['pasta', 'tomatoes', 'garlic', 'olive oil', 'basil'] },
  { label: '🥗 Garden salad', items: ['cucumber', 'cherry tomatoes', 'feta', 'olives', 'lemon'] },
  { label: '🍚 Fried rice', items: ['leftover rice', 'eggs', 'peas', 'carrot', 'soy sauce'] },
];

export const AVAILABILITY_LABELS = {
  available: 'You have these',
  to_buy: 'You’ll need to buy',
  pantry_staple: 'Pantry staples',
};
