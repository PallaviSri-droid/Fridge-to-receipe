import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env first, then a root .env as fallback. Never committed (see .gitignore).
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

/**
 * Centralized, validated configuration. Reading env in one place keeps secrets
 * off the rest of the codebase and makes test overrides trivial.
 */
const PLACEHOLDER_KEY = 'your_gemini_api_key_here';
const hasRealKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== PLACEHOLDER_KEY);

export const config = {
  port: Number(process.env.PORT) || 3001,

  /** 'gemini' (real provider) or 'mock' (deterministic fixtures, no credits).
   *  Auto-selects gemini only when a REAL key is present (the placeholder doesn't count). */
  provider: (process.env.AI_PROVIDER || (hasRealKey ? 'gemini' : 'mock')).toLowerCase(),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    // A real Google *rolling alias* (hot-swapped with 2 weeks' notice) so we never
    // hardcode a model ID that gets retired. Override with any current stable ID,
    // e.g. gemini-3.8-flash or gemini-3.5-flash-lite.
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  },

  /** Upstream request timeout (ms) before we return 504. */
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 30000,

  /** Comma-separated allowed CORS origins. Defaults to the Vite dev server. */
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Hard caps that bound the prompt-injection / abuse surface. */
  limits: {
    jsonBody: '32kb',
    maxIngredients: 40,
    maxIngredientLength: 80,
    rateWindowMs: 60_000,
    rateMax: 20,
  },
};

export function isProviderConfigured() {
  if (config.provider === 'mock') return true;
  return Boolean(config.gemini.apiKey && config.gemini.apiKey !== PLACEHOLDER_KEY);
}
