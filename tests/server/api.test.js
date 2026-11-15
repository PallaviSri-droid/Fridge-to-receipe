import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { buildMockRecipe } from '../../server/providers/fixtures.js';

/** Provider whose generate() returns a fixed text (one or a sequence of calls). */
function providerReturning(...texts) {
  let i = 0;
  return {
    name: 'test',
    async generate() {
      const t = texts[Math.min(i, texts.length - 1)];
      i += 1;
      return { text: typeof t === 'function' ? t() : t };
    },
    async substitute() {
      return { text: JSON.stringify({ substitutions: [{ name: 'tofu', note: 'vegan' }] }) };
    },
  };
}

/** Provider whose generate() throws a given error. */
function providerThrowing(err) {
  return {
    name: 'test',
    async generate() { throw err; },
    async substitute() { throw err; },
  };
}

const validBody = { ingredients: ['eggs', 'spinach', 'cheddar'], servings: 2 };
const validRecipeText = () => JSON.stringify(buildMockRecipe(['eggs', 'spinach'], 2));

describe('POST /api/recipes/generate', () => {
  it('returns a validated, normalized recipe on success', async () => {
    const app = createApp({ provider: providerReturning(validRecipeText()) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^recipe_/);
    expect(res.body.data.steps[0].stepNumber).toBe(1);
    // availability re-derived: "eggs"/"spinach" available, others downgraded
    const spinach = res.body.data.ingredients.find((i) => i.name === 'spinach');
    expect(spinach.availability).toBe('available');
  });

  it('400 INVALID_INPUT on empty ingredients', async () => {
    const app = createApp({ provider: providerReturning(validRecipeText()) });
    const res = await request(app).post('/api/recipes/generate').send({ ingredients: [] });
    expect(res.status).toBe(400);
    expect(res.body.errorType).toBe('INVALID_INPUT');
  });

  it('502 MALFORMED_JSON on unparseable model output', async () => {
    const app = createApp({ provider: providerReturning('{bad json') });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(502);
    expect(res.body.errorType).toBe('MALFORMED_JSON');
    expect(JSON.stringify(res.body)).not.toContain('bad json'); // no raw leakage
  });

  it('502 EMPTY_RESPONSE on empty text', async () => {
    const app = createApp({ provider: providerReturning('', '') });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(502);
    expect(res.body.errorType).toBe('EMPTY_RESPONSE');
  });

  it('502 SCHEMA_MISMATCH on wrong-shape JSON', async () => {
    const bad = JSON.stringify({ title: 'x', ingredients: [], steps: [] });
    const app = createApp({ provider: providerReturning(bad, bad) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(502);
    expect(res.body.errorType).toBe('SCHEMA_MISMATCH');
  });

  it('504 TIMEOUT when the provider aborts/times out', async () => {
    const app = createApp({ provider: providerThrowing(Object.assign(new Error('timed out'), { name: 'AbortError' })) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(504);
    expect(res.body.errorType).toBe('TIMEOUT');
  });

  it('429 RATE_LIMITED with Retry-After on provider 429', async () => {
    const app = createApp({ provider: providerThrowing(Object.assign(new Error('rate limit'), { status: 429 })) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(429);
    expect(res.body.errorType).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('503 PROVIDER_UNAVAILABLE on provider 503', async () => {
    const app = createApp({ provider: providerThrowing(Object.assign(new Error('unavailable'), { status: 503 })) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(503);
    expect(res.body.errorType).toBe('PROVIDER_UNAVAILABLE');
  });

  it('503 PROVIDER_AUTH on provider auth failure (never 401 to client)', async () => {
    const app = createApp({ provider: providerThrowing(Object.assign(new Error('invalid api key'), { status: 401 })) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(503);
    expect(res.body.errorType).toBe('PROVIDER_AUTH');
  });

  it('500 INTERNAL on an unexpected provider exception', async () => {
    const app = createApp({ provider: providerThrowing(new Error('kaboom')) });
    const res = await request(app).post('/api/recipes/generate').send(validBody);
    expect(res.status).toBe(500);
    expect(res.body.errorType).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('kaboom');
  });

  it('enforces allergen exclusions, regenerating once then succeeding', async () => {
    // first call returns a dairy-laden recipe, second is clean
    const dairy = JSON.stringify({
      ...JSON.parse(validRecipeText()),
      ingredients: [{ name: 'cheese', quantity: 50, unit: 'g', kind: 'continuous', availability: 'to_buy', optional: false, substitutions: [] }],
    });
    const app = createApp({ provider: providerReturning(dairy, validRecipeText()) });
    const res = await request(app).post('/api/recipes/generate').send({ ...validBody, allergens: ['dairy'] });
    expect(res.status).toBe(200);
    expect(res.body.data.ingredients.some((i) => /cheese/i.test(i.name))).toBe(false);
  });

  it('422 SAFETY_VIOLATION when it cannot avoid an allergen after a retry', async () => {
    const dairy = JSON.stringify({
      ...JSON.parse(validRecipeText()),
      ingredients: [{ name: 'butter', quantity: 50, unit: 'g', kind: 'continuous', availability: 'to_buy', optional: false, substitutions: [] }],
    });
    const app = createApp({ provider: providerReturning(dairy, dairy) });
    const res = await request(app).post('/api/recipes/generate').send({ ...validBody, allergens: ['dairy'] });
    expect(res.status).toBe(422);
    expect(res.body.errorType).toBe('SAFETY_VIOLATION');
  });
});

describe('POST /api/recipes/substitute', () => {
  it('returns safe substitutions', async () => {
    const app = createApp({ provider: providerReturning(validRecipeText()) });
    const res = await request(app).post('/api/recipes/substitute').send({ ingredientName: 'butter', recipeTitle: 'Toast', diets: ['vegan'] });
    expect(res.status).toBe(200);
    expect(res.body.data.substitutions.length).toBeGreaterThan(0);
    expect(res.body.data.disclosure).toBeTruthy();
  });

  it('400 on missing ingredient name', async () => {
    const app = createApp({ provider: providerReturning(validRecipeText()) });
    const res = await request(app).post('/api/recipes/substitute').send({ recipeTitle: 'Toast' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/health', () => {
  it('reports status and provider', async () => {
    const app = createApp({ provider: providerReturning(validRecipeText()) });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
