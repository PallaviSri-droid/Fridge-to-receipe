import { useCallback, useRef, useState } from 'react';
import { generateRecipeApi } from '../lib/api.js';
import { parseRecipe } from '../shared/recipeSchema.js';

/**
 * Orchestrates recipe generation with stale-request protection.
 *
 * Two guards (ported from the original repo, which got this right):
 *  - AbortController cancels the previous in-flight request on a new submit.
 *  - An incrementing request id means a late response from an old request can never
 *    overwrite the result of a newer one.
 *
 * Unlike the original, client-side validation REJECTS bad data (it does not silently
 * backfill fake values) — the server already normalized a good recipe, so a failure
 * here means something genuinely wrong.
 */
export function useRecipeGenerator() {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { type, message }
  const [lastRequest, setLastRequest] = useState(null);

  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  const generate = useCallback(async (request) => {
    if (!request?.ingredients?.length) {
      setError({ type: 'INVALID_INPUT', message: 'Add at least one ingredient first.' });
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setLastRequest(request);

    try {
      const result = await generateRecipeApi(request, controller.signal);
      if (requestId !== requestIdRef.current) return; // a newer request superseded this one

      if (!result.success) {
        setRecipe(null);
        setError({ type: result.errorType, message: result.message });
        return;
      }

      const validated = parseRecipe(result.data);
      if (!validated.ok) {
        setRecipe(null);
        setError({ type: 'SCHEMA_MISMATCH', message: 'The recipe failed validation in the browser.' });
        return;
      }

      setRecipe(validated.recipe);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // superseded — ignore
      if (requestId === requestIdRef.current) {
        setRecipe(null);
        setError({ type: 'NETWORK', message: err.message || 'Unexpected error.' });
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastRequest) generate(lastRequest);
  }, [lastRequest, generate]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    requestIdRef.current += 1;
    setRecipe(null);
    setError(null);
    setLoading(false);
  }, []);

  return { recipe, loading, error, generate, retry, reset, lastRequest };
}
