/**
 * Error taxonomy. Every failure the API can produce maps to exactly one of these
 * types, each with a correct HTTP status and a safe, user-facing message. Internal
 * details (stack, provider message, raw model text) are NEVER sent to the client.
 */

/** @typedef {'INVALID_INPUT'|'EMPTY_RESPONSE'|'MALFORMED_JSON'|'SCHEMA_MISMATCH'|'SAFETY_VIOLATION'|'TIMEOUT'|'RATE_LIMITED'|'PROVIDER_UNAVAILABLE'|'PROVIDER_AUTH'|'INTERNAL'} ErrorType */

const STATUS_BY_TYPE = {
  INVALID_INPUT: 400,
  EMPTY_RESPONSE: 502,
  MALFORMED_JSON: 502,
  SCHEMA_MISMATCH: 502,
  SAFETY_VIOLATION: 422,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_AUTH: 503,
  INTERNAL: 500,
};

const SAFE_MESSAGE = {
  INVALID_INPUT: 'Please provide a valid list of ingredients.',
  EMPTY_RESPONSE: 'The AI returned an empty response. Please try again.',
  MALFORMED_JSON: 'The AI returned data we could not read. Please try again.',
  SCHEMA_MISMATCH: 'The AI returned a recipe in an unexpected shape. Please try again.',
  SAFETY_VIOLATION: 'We could not generate a recipe that respects your dietary restrictions. Try adjusting your ingredients.',
  TIMEOUT: 'The AI took too long to respond. Please try again.',
  RATE_LIMITED: 'Too many requests right now. Please wait a moment and try again.',
  PROVIDER_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again shortly.',
  PROVIDER_AUTH: 'The AI service is not configured correctly on the server.',
  INTERNAL: 'Something went wrong on our end. Please try again.',
};

/** Which failures are worth one bounded retry. */
export const RETRYABLE = new Set(['EMPTY_RESPONSE', 'MALFORMED_JSON', 'SCHEMA_MISMATCH', 'TIMEOUT', 'PROVIDER_UNAVAILABLE']);

export class AppError extends Error {
  /**
   * @param {ErrorType} type
   * @param {string} [message] optional override for the safe client message
   * @param {{ retryAfterSeconds?: number, cause?: unknown }} [opts]
   */
  constructor(type, message, opts = {}) {
    super(message || SAFE_MESSAGE[type] || SAFE_MESSAGE.INTERNAL);
    this.type = type;
    this.status = STATUS_BY_TYPE[type] || 500;
    this.clientMessage = message || SAFE_MESSAGE[type] || SAFE_MESSAGE.INTERNAL;
    this.retryAfterSeconds = opts.retryAfterSeconds;
    if (opts.cause) this.cause = opts.cause;
  }

  /** Safe JSON envelope for the client — nothing internal leaks. */
  toEnvelope() {
    return { success: false, errorType: this.type, message: this.clientMessage };
  }
}

/**
 * Classify an unknown error thrown by a provider into an AppError. Inspects common
 * shapes (status codes, messages) without trusting or forwarding their contents.
 * @param {unknown} err
 * @returns {AppError}
 */
export function classifyProviderError(err) {
  if (err instanceof AppError) return err;

  const status = Number(err?.status ?? err?.code ?? err?.response?.status);
  const msg = String(err?.message || '').toLowerCase();

  if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out')) {
    return new AppError('TIMEOUT');
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource exhausted')) {
    return new AppError('RATE_LIMITED', undefined, { retryAfterSeconds: 30 });
  }
  if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission') || msg.includes('unauthenticated')) {
    // Never surface as 401 to the browser — it's a server config problem.
    return new AppError('PROVIDER_AUTH');
  }
  if (status === 503 || status === 500 || status === 502 || status === 504 || msg.includes('unavailable') || msg.includes('overloaded')) {
    return new AppError('PROVIDER_UNAVAILABLE');
  }
  return new AppError('INTERNAL');
}
