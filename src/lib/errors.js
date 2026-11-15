/**
 * Client-side error classification. Maps server envelopes / transport failures to a
 * small set of user-facing presentations (title, hint, whether retry makes sense).
 */

/** @typedef {'INVALID_INPUT'|'EMPTY_RESPONSE'|'MALFORMED_JSON'|'SCHEMA_MISMATCH'|'SAFETY_VIOLATION'|'TIMEOUT'|'RATE_LIMITED'|'PROVIDER_UNAVAILABLE'|'PROVIDER_AUTH'|'NETWORK'|'INTERNAL'} ClientErrorType */

const PRESENTATION = {
  INVALID_INPUT: { title: 'Check your ingredients', hint: 'Add at least one ingredient and try again.', retryable: false, variant: 'warn' },
  EMPTY_RESPONSE: { title: 'Empty response', hint: 'The AI returned nothing. Try again or tweak your ingredients.', retryable: true, variant: 'parser' },
  MALFORMED_JSON: { title: 'Unreadable AI output', hint: 'The AI returned data we could not parse. Retrying usually fixes this.', retryable: true, variant: 'parser' },
  SCHEMA_MISMATCH: { title: 'Unexpected recipe shape', hint: 'The recipe came back in the wrong shape. Please try again.', retryable: true, variant: 'parser' },
  SAFETY_VIOLATION: { title: 'Could not respect restrictions', hint: 'We could not build a recipe that honors your dietary limits. Adjust ingredients or restrictions.', retryable: false, variant: 'warn' },
  TIMEOUT: { title: 'The AI timed out', hint: 'That took too long. Please try again.', retryable: true, variant: 'network' },
  RATE_LIMITED: { title: 'Too many requests', hint: 'Please wait a moment, then try again.', retryable: true, variant: 'network' },
  PROVIDER_UNAVAILABLE: { title: 'AI temporarily unavailable', hint: 'The AI service is having trouble. Try again shortly.', retryable: true, variant: 'network' },
  PROVIDER_AUTH: { title: 'Server not configured', hint: 'The AI key is missing or invalid on the server. Add GEMINI_API_KEY, or run the mock provider.', retryable: false, variant: 'server' },
  NETWORK: { title: 'Cannot reach the server', hint: 'Check that the backend is running on port 3001.', retryable: true, variant: 'network' },
  INTERNAL: { title: 'Something went wrong', hint: 'An unexpected error occurred. Please try again.', retryable: true, variant: 'server' },
};

/**
 * @param {ClientErrorType} type
 * @param {string} [message] server-supplied safe message
 */
export function presentError(type, message) {
  const base = PRESENTATION[type] || PRESENTATION.INTERNAL;
  return { type: type in PRESENTATION ? type : 'INTERNAL', ...base, message: message || base.hint };
}

/** Normalize an unknown error type string coming from the server. */
export function normalizeErrorType(type) {
  return type && type in PRESENTATION ? type : 'INTERNAL';
}
