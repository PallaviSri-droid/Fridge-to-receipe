import { parseRecipe, SubstitutionSchema } from '../../src/shared/recipeSchema.js';
import { z } from 'zod';
import { config } from '../config.js';
import { AppError, classifyProviderError, RETRYABLE } from './errors.js';
import { normalizeRecipe } from './normalize.js';
import { resolveExclusions, scanRecipe, CROSS_CONTAMINATION_NOTE } from './allergens.js';
import { isSafeSubstitute } from './substitutions.js';
import { SYSTEM_INSTRUCTION, buildGeneratePrompt, buildSubstitutePrompt } from './prompt.js';

/**
 * Run a provider call with a hard timeout. Aborts the provider via AbortSignal and
 * also races a timer so a provider that ignores the signal still can't hang us.
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTimeout(fn) {
  const controller = new AbortController();
  let timer;
  // One timer: it both aborts the provider and rejects the race. Cleared in `finally`
  // when the provider settles first, so no orphaned promise can reject later.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AppError('TIMEOUT'));
    }, config.requestTimeoutMs);
  });
  try {
    return await Promise.race([fn(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run an operation, retrying ONCE for retryable failure types only.
 * @template T
 * @param {() => Promise<T>} op
 * @param {Set<string>} retrySet
 */
async function withRetry(op, retrySet) {
  try {
    return await op();
  } catch (err) {
    const e = err instanceof AppError ? err : classifyProviderError(err);
    if (retrySet.has(e.type)) {
      try {
        return await op(); // one bounded retry
      } catch (err2) {
        // ensure the second failure is a classified AppError, not a raw provider error
        throw err2 instanceof AppError ? err2 : classifyProviderError(err2);
      }
    }
    throw e;
  }
}

/** Parse + validate + normalize raw provider text into a trustworthy recipe. */
function materializeRecipe(text, userIngredients) {
  if (!text || !text.trim()) throw new AppError('EMPTY_RESPONSE');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError('MALFORMED_JSON');
  }

  const result = parseRecipe(parsed);
  if (!result.ok) throw new AppError('SCHEMA_MISMATCH');

  return normalizeRecipe(result.recipe, userIngredients);
}

/**
 * Generate a validated, safety-checked recipe.
 * @param {object} provider active provider
 * @param {import('../../src/shared/recipeSchema.js').GenerateRequest} req validated request
 */
export async function generateRecipe(provider, req) {
  const exclusions = resolveExclusions(req.diets, req.allergens);

  const attempt = async () => {
    const prompt = buildGeneratePrompt(req, exclusions);
    const { text } = await withTimeout((signal) =>
      provider.generate({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        ingredients: req.ingredients,
        servings: req.servings,
        signal,
      })
    );

    const recipe = materializeRecipe(text, req.ingredients);

    // Never trust the model's safety claims: scan the generated recipe ourselves.
    const violations = scanRecipe(recipe, exclusions);
    if (violations.length) {
      // triggers one regen via the SAFETY_VIOLATION retry entry below
      throw new AppError('SAFETY_VIOLATION');
    }

    // scanRecipe does not inspect inline substitutions, so filter those here — an unsafe
    // swap must never reach the client (the UI falls back to them if /substitute fails).
    if (exclusions.length || req.diets.length) {
      for (const ing of recipe.ingredients) {
        if (ing.substitutions?.length) {
          ing.substitutions = ing.substitutions.filter((s) => isSafeSubstitute(s.name, exclusions, req.diets));
        }
      }
    }

    // Always disclose the limits of our automated check.
    if (exclusions.length) {
      recipe.safetyNotes = [...(recipe.safetyNotes || []), CROSS_CONTAMINATION_NOTE];
    }
    return recipe;
  };

  // Regenerate once on a safety violation, plus the standard retryable set.
  const retrySet = new Set([...RETRYABLE, 'SAFETY_VIOLATION']);
  return withRetry(attempt, retrySet);
}

// Allow an empty list: for an unknown ingredient the honest answer is "no known swaps",
// not a fabricated one. The UI renders a clear message for the empty case.
const SubstituteResponseSchema = z.object({
  substitutions: z.array(SubstitutionSchema),
});

/**
 * Suggest substitutions for one ingredient, filtered against dietary exclusions.
 * @param {object} provider
 * @param {import('../../src/shared/recipeSchema.js').SubstituteRequest} req
 */
export async function suggestSubstitutions(provider, req) {
  const exclusions = resolveExclusions(req.diets, req.allergens);

  const attempt = async () => {
    const prompt = buildSubstitutePrompt(req.ingredientName, req.recipeTitle, exclusions);
    const { text } = await withTimeout((signal) =>
      provider.substitute({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        ingredientName: req.ingredientName,
        signal,
      })
    );

    if (!text || !text.trim()) throw new AppError('EMPTY_RESPONSE');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AppError('MALFORMED_JSON');
    }
    const result = SubstituteResponseSchema.safeParse(parsed);
    if (!result.success) throw new AppError('SCHEMA_MISMATCH');

    // Drop any substitute that itself breaks the exclusions or diet — never trust the model.
    // Scan the NAME only; a natural note ("not vegan", ratio text) must not disqualify a swap.
    const safe = result.data.substitutions.filter((s) => isSafeSubstitute(s.name, exclusions, req.diets));

    return {
      ingredientName: req.ingredientName,
      substitutions: safe,
      // disclose only when we actually kept allergen-relevant swaps to vet
      disclosure: exclusions.length && safe.length ? CROSS_CONTAMINATION_NOTE : '',
    };
  };

  return withRetry(attempt, RETRYABLE);
}
