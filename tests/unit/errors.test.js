import { describe, it, expect } from 'vitest';
import { AppError, classifyProviderError, RETRYABLE } from '../../server/lib/errors.js';
import { presentError } from '../../src/lib/errors.js';

describe('AppError', () => {
  it('maps types to correct status codes', () => {
    expect(new AppError('INVALID_INPUT').status).toBe(400);
    expect(new AppError('MALFORMED_JSON').status).toBe(502);
    expect(new AppError('TIMEOUT').status).toBe(504);
    expect(new AppError('RATE_LIMITED').status).toBe(429);
    expect(new AppError('PROVIDER_UNAVAILABLE').status).toBe(503);
  });
  it('never leaks internal detail in the envelope', () => {
    const env = new AppError('INTERNAL', undefined, { cause: new Error('secret stack') }).toEnvelope();
    expect(JSON.stringify(env)).not.toContain('secret stack');
    expect(env).toEqual({ success: false, errorType: 'INTERNAL', message: expect.any(String) });
  });
});

describe('classifyProviderError', () => {
  it('classifies rate limits', () => {
    expect(classifyProviderError({ status: 429 }).type).toBe('RATE_LIMITED');
    expect(classifyProviderError(new Error('quota exceeded')).type).toBe('RATE_LIMITED');
  });
  it('classifies auth errors as PROVIDER_AUTH (never 401 to client)', () => {
    const e = classifyProviderError({ status: 401 });
    expect(e.type).toBe('PROVIDER_AUTH');
    expect(e.status).toBe(503);
  });
  it('classifies timeouts and unavailability', () => {
    expect(classifyProviderError({ name: 'AbortError' }).type).toBe('TIMEOUT');
    expect(classifyProviderError({ status: 503 }).type).toBe('PROVIDER_UNAVAILABLE');
  });
  it('falls back to INTERNAL for unknown errors', () => {
    expect(classifyProviderError(new Error('???')).type).toBe('INTERNAL');
  });
  it('marks the right types retryable', () => {
    expect(RETRYABLE.has('TIMEOUT')).toBe(true);
    expect(RETRYABLE.has('RATE_LIMITED')).toBe(false);
    expect(RETRYABLE.has('PROVIDER_AUTH')).toBe(false);
  });
});

describe('presentError (client)', () => {
  it('provides a presentation for every known type', () => {
    const p = presentError('TIMEOUT');
    expect(p.retryable).toBe(true);
    expect(p.title).toBeTruthy();
  });
  it('coerces unknown types to INTERNAL', () => {
    expect(presentError('WAT').type).toBe('INTERNAL');
  });
});
