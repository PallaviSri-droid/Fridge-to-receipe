import { useCallback, useState } from 'react';
import { substituteApi } from '../lib/api.js';

/**
 * Manages the substitution overlay (keyed by ingredient id) plus on-demand fetching of
 * substitute options from the backend. Undo is simply removing a key — the base recipe
 * is never mutated, so the original is always recoverable.
 */
export function useSubstitutions() {
  const [overlay, setOverlay] = useState({}); // { [ingredientId]: { name, note } }
  const [options, setOptions] = useState({}); // { [ingredientId]: { loading, items, disclosure, error } }

  const fetchOptions = useCallback(async (ingredient, { recipeTitle, diets, allergens }) => {
    setOptions((o) => ({ ...o, [ingredient.id]: { loading: true, items: [], disclosure: '', error: null } }));
    const res = await substituteApi({ ingredientName: ingredient.originalName || ingredient.name, recipeTitle, diets, allergens });
    if (!res.success) {
      // fall back to any model-provided substitutions baked into the recipe
      const fallback = (ingredient.substitutions || []).map((s) => ({ name: s.name, note: s.note || '' }));
      setOptions((o) => ({
        ...o,
        [ingredient.id]: { loading: false, items: fallback, disclosure: '', error: fallback.length ? null : res.message },
      }));
      return;
    }
    setOptions((o) => ({
      ...o,
      [ingredient.id]: { loading: false, items: res.data.substitutions, disclosure: res.data.disclosure, error: null },
    }));
  }, []);

  const applySubstitution = useCallback((ingredientId, sub) => {
    setOverlay((o) => ({ ...o, [ingredientId]: { name: sub.name, note: sub.note || '' } }));
    setOptions((o) => { const next = { ...o }; delete next[ingredientId]; return next; });
  }, []);

  const undo = useCallback((ingredientId) => {
    setOverlay((o) => { const next = { ...o }; delete next[ingredientId]; return next; });
  }, []);

  const reset = useCallback(() => { setOverlay({}); setOptions({}); }, []);

  return { overlay, options, fetchOptions, applySubstitution, undo, reset, setOverlay };
}
