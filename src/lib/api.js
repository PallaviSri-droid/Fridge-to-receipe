import { normalizeErrorType } from './errors.js';

/**
 * Thin API client. Returns a discriminated result; only AbortError is thrown (so the
 * caller's stale-request guard can distinguish deliberate cancellation).
 */
async function postJson(path, body, signal) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return { success: false, errorType: 'NETWORK', message: 'Network error: cannot reach the backend.' };
  }

  const envelope = await response.json().catch(() => null);

  if (!response.ok || !envelope || envelope.success === false) {
    return {
      success: false,
      errorType: normalizeErrorType(envelope?.errorType),
      message: envelope?.message || `Request failed (HTTP ${response.status}).`,
    };
  }
  return { success: true, data: envelope.data };
}

/**
 * @param {object} request GenerateRequest-shaped body
 * @param {AbortSignal} [signal]
 */
export function generateRecipeApi(request, signal) {
  return postJson('/api/recipes/generate', request, signal);
}

/**
 * @param {object} request SubstituteRequest-shaped body
 * @param {AbortSignal} [signal]
 */
export function substituteApi(request, signal) {
  return postJson('/api/recipes/substitute', request, signal);
}
