import { Type } from '@google/genai';

/**
 * Provider-side response schema passed to Gemini's structured-output mode. This is a
 * GENERATION HINT that nudges the model toward the right shape; the canonical Zod
 * schema (src/shared/recipeSchema.js) is what actually validates the result afterward.
 * Kept deliberately small and flat — Gemini's schema subset dislikes deep nesting.
 */
export const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    cuisine: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
    prepTimeMinutes: { type: Type.NUMBER },
    cookTimeMinutes: { type: Type.NUMBER },
    baseServings: { type: Type.INTEGER },
    dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          unit: { type: Type.STRING },
          kind: { type: Type.STRING, enum: ['continuous', 'discrete', 'qualitative'] },
          availability: { type: Type.STRING, enum: ['available', 'to_buy', 'pantry_staple'] },
          optional: { type: Type.BOOLEAN },
          substitutions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, note: { type: Type.STRING } },
              required: ['name'],
            },
          },
        },
        required: ['name', 'quantity', 'unit', 'kind', 'availability'],
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          instruction: { type: Type.STRING },
          durationMinutes: { type: Type.NUMBER, nullable: true },
          tip: { type: Type.STRING },
        },
        required: ['instruction'],
      },
    },
    additionalIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    safetyNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'title',
    'description',
    'difficulty',
    'prepTimeMinutes',
    'cookTimeMinutes',
    'baseServings',
    'ingredients',
    'steps',
  ],
};
