import { AppError } from '../lib/errors.js';
import { buildMockRecipe, buildMockSubstitutions } from './fixtures.js';

/**
 * Mock provider — deterministic, zero-credit. Lets the whole app (and Playwright) run
 * without an API key. It also understands magic trigger ingredients so the real UI can
 * demonstrate failure handling on demand:
 *   fail:timeout | fail:malformed | fail:empty | fail:schema | fail:rate | fail:unavailable | fail:auth
 */
function detectTrigger(ingredients = []) {
  const joined = ingredients.join(' ').toLowerCase();
  const m = joined.match(/fail:(\w+)/);
  return m ? m[1] : null;
}

export const mockProvider = {
  name: 'mock',

  /**
   * @param {{ ingredients: string[], servings: number }} ctx
   * @returns {Promise<{ text: string }>}
   */
  async generate({ ingredients = [], servings = 2 } = {}) {
    const trigger = detectTrigger(ingredients);
    switch (trigger) {
      case 'timeout':
        throw new AppError('TIMEOUT');
      case 'empty':
        return { text: '' };
      case 'malformed':
        return { text: '{ "title": "Broken", this is not json ]' };
      case 'schema':
        // valid JSON, wrong shape (missing required fields, empty arrays)
        return { text: JSON.stringify({ title: 'Mystery', ingredients: [], steps: [] }) };
      case 'rate':
        throw Object.assign(new Error('rate limit exceeded'), { status: 429 });
      case 'unavailable':
        throw Object.assign(new Error('service unavailable'), { status: 503 });
      case 'auth':
        throw Object.assign(new Error('invalid api key'), { status: 401 });
      default:
        return { text: JSON.stringify(buildMockRecipe(ingredients, servings)) };
    }
  },

  /**
   * @param {{ ingredientName: string }} ctx
   * @returns {Promise<{ text: string }>}
   */
  async substitute({ ingredientName } = {}) {
    return { text: JSON.stringify(buildMockSubstitutions(ingredientName)) };
  },
};
