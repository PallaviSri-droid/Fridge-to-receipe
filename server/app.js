import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, isProviderConfigured } from './config.js';
import { GenerateRequestSchema, SubstituteRequestSchema } from '../src/shared/recipeSchema.js';
import { AppError, classifyProviderError } from './lib/errors.js';
import { generateRecipe, suggestSubstitutions } from './lib/recipeService.js';
import { selectProvider } from './providers/index.js';

/**
 * Build the Express app. The active provider is injected so tests can supply a
 * fixture provider (every failure mode) without spending API credits.
 * @param {{ provider?: object }} [opts]
 */
export function createApp({ provider } = {}) {
  const activeProvider = provider || selectProvider();
  const app = express();

  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / non-browser (no Origin header) and whitelisted dev origins
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
    })
  );

  app.use(express.json({ limit: config.limits.jsonBody }));

  const limiter = rateLimit({
    windowMs: config.limits.rateWindowMs,
    max: config.limits.rateMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.set('Retry-After', '30');
      res.status(429).json(new AppError('RATE_LIMITED').toEnvelope());
    },
  });
  app.use('/api/', limiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      provider: activeProvider.name,
      providerConfigured: isProviderConfigured(),
      time: new Date().toISOString(),
    });
  });

  app.post('/api/recipes/generate', asyncRoute(async (req, res) => {
    const parsed = GenerateRequestSchema.safeParse(normalizeGenerateBody(req.body));
    if (!parsed.success) {
      throw new AppError('INVALID_INPUT', firstIssueMessage(parsed.error));
    }
    const recipe = await generateRecipe(activeProvider, parsed.data);
    res.json({ success: true, data: recipe });
  }));

  app.post('/api/recipes/substitute', asyncRoute(async (req, res) => {
    const parsed = SubstituteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('INVALID_INPUT', firstIssueMessage(parsed.error));
    }
    const result = await suggestSubstitutions(activeProvider, parsed.data);
    res.json({ success: true, data: result });
  }));

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, errorType: 'INVALID_INPUT', message: 'Not found.' });
  });

  // Central error handler — the ONLY place errors become responses. Nothing internal leaks.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const appErr = err instanceof AppError ? err : classifyProviderError(err);
    if (appErr.type === 'INTERNAL') {
      // log full detail server-side only
      console.error('[unhandled]', err);
    }
    if (appErr.retryAfterSeconds) res.set('Retry-After', String(appErr.retryAfterSeconds));
    res.status(appErr.status).json(appErr.toEnvelope());
  });

  return app;
}

/** Accept either the new array body or a legacy comma string for `ingredients`. */
function normalizeGenerateBody(body = {}) {
  if (typeof body.ingredients === 'string') {
    return { ...body, ingredients: body.ingredients.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) };
  }
  return body;
}

function firstIssueMessage(zodError) {
  const issue = zodError.issues?.[0];
  return issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : undefined;
}

/** Wrap an async route so thrown errors reach the central handler. */
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
