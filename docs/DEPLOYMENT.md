# Deploying FridgeChef AI to Vercel

The app is **deploy-ready**. The Express backend runs as a single Vercel serverless
function (`api/index.js` wraps `server/app.js`); `vercel.json` builds the Vite frontend to
`dist/` and rewrites every `/api/*` request to that function. No code changes are needed to
deploy — only your Vercel account.

With **no API key**, the deployed site runs the deterministic **mock** provider — a fully
working demo. Add `GEMINI_API_KEY` to turn on live Gemini.

Run everything below from the project folder:
`C:\Users\goura\Downloads\fridge-to-recipe-main\fridge-to-recipe-main`

---

## Option A — Vercel CLI (fastest, no GitHub needed)

```bash
npm i -g vercel
```

```bash
vercel login
```

```bash
vercel --prod
```

- `vercel login` opens your browser to sign in (GitHub/Google/email).
- `vercel --prod` uploads the folder, builds it, and prints your **production URL**
  (e.g. `https://fridgechef-ai.vercel.app`).
- Accept the detected defaults when prompted (framework: Vite; build: `npm run build`;
  output: `dist`). `vercel.json` already sets these.

### Turn on live Gemini (optional)
```bash
vercel env add GEMINI_API_KEY production
```
Paste your key when prompted, then redeploy so it takes effect:
```bash
vercel --prod
```
(Without this, the live site serves mock recipes — which is a complete, working demo.)

---

## Option B — GitHub + Vercel dashboard

1. Create a new **empty** GitHub repo (do not add a README/license).
2. Push this project to it:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. At https://vercel.com/new, **Import** that repo.
4. Vercel auto-detects Vite + `vercel.json`. Leave the build settings as detected.
5. (Optional) Add an environment variable `GEMINI_API_KEY` for live Gemini.
6. Click **Deploy** — the dashboard shows your production URL.

---

## Environment variables (all optional)
| Variable | Purpose | Default if unset |
|----------|---------|------------------|
| `GEMINI_API_KEY` | Enables live Gemini | unset → **mock** provider |
| `GEMINI_MODEL` | Override the model | `gemini-flash-latest` |
| `AI_PROVIDER` | Force `mock` or `gemini` | auto (gemini if key present) |
| `REQUEST_TIMEOUT_MS` | Upstream timeout before 504 | `30000` |
| `CORS_ORIGINS` | Extra allowed origins | localhost (same-origin needs none) |

## Notes
- Frontend and API deploy to the **same origin**, so no CORS configuration is required.
- The API key, if set, lives only in Vercel's server environment — it is never sent to the
  browser.
- `dist/` and `node_modules/` are gitignored; Vercel builds them during deploy.
- To preview the exact serverless behavior locally before deploying: `vercel dev`.
