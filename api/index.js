/**
 * Vercel serverless entry point.
 *
 * Wraps the existing Express app (server/app.js) so the whole `/api/*` surface runs as a
 * single Node serverless function on Vercel. The app is unchanged — this just exports it as
 * the function handler. vercel.json rewrites every `/api/(.*)` request to this file, and the
 * Express router matches the original `/api/...` path as usual.
 *
 * Provider selection is automatic: set GEMINI_API_KEY in the Vercel project to run live
 * Gemini, or leave it unset to serve the deterministic mock (a fully working demo).
 */

import { createApp } from '../server/app.js';

const app = createApp();

// Behind Vercel's proxy the client IP is in X-Forwarded-For; trust it so rate limiting
// keys on the real client rather than the proxy hop.
app.set('trust proxy', 1);

export default app;
