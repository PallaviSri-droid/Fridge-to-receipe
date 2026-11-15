# Project Audit — Fridge-to-Recipe reference repo

**Audited:** 2026-11-15
**Source:** public reference repo `SIVANIKESH002/fridge-to-recipe` (downloaded).
**Goal of audit:** understand the real implementation before changing anything, and
decide what to preserve, fix, or rebuild.

---

## 1. Existing architecture

```
React (Vite) SPA  ──POST /api/generate-recipe──▶  Express server  ──▶  Google Gemini (@google/genai)
   src/                                             server/index.js       structured JSON output
```

Two **parallel, redundant** implementations of the same product exist:

- **A** — React (Vite) frontend + Express backend (the intended submission).
- **B** — `app.py`, a **Streamlit** Python app that reimplements the whole thing standalone.

They do not share code. `B` looks like a deployment convenience (Streamlit Cloud) but
doubles the surface area, carries the same bugs, and muddies provenance.

## 2. Existing technology stack

| Layer | Tech | Notes |
|------|------|------|
| Frontend | React 18, Vite 6, lucide-react | Plain JavaScript (no TypeScript). |
| Backend | Express 4, `@google/genai`, Zod 3, cors, dotenv | ESM. |
| Alt | Streamlit, `google-genai` (Python), python-dotenv | Redundant copy. |
| Tests | — | **None.** |

Installed versions (from lockfiles): `@google/genai@2.13.0` (spec is the floating
`"latest"` — an audit risk), `zod@3.25.76`.

## 3. Current project structure

- `src/App.jsx` — single screen; input → loading/error/empty/recipe.
- `src/hooks/useRecipeGenerator.js` — fetch orchestration; **AbortController + request-id
  stale-guard (this is correct and worth keeping).**
- `src/lib/api.js` — fetch wrapper, envelope handling.
- `src/lib/validateRecipe.js` — hand-written client validator.
- `src/components/*` — IngredientInput, IngredientList, StepList, ServingsScaler,
  RecipeCard, LoadingState, ErrorState.
- `server/index.js` — one route `/api/generate-recipe`, `/api/health`, Zod schema,
  Gemini schema, model fallback loop.
- `app.py` — Streamlit duplicate.

## 4. Working functionality

- End-to-end happy path (given a valid key and a live model): ingredients → structured
  recipe → interactive render.
- **Stale-request protection** via `AbortController` + incremental request id — genuinely
  implemented and correct.
- Server-side Zod validation and a client-side defensive validator both exist.
- Servings scaling, UI-level ingredient swaps, and check-off checklists render.
- Loading, error, and empty states exist and are reasonably designed (dark theme).

## 5. Incomplete / misleading functionality

- **README overstates reality:** claims "production-quality" and lists guarantees, but
  there are **no tests**, no `.env.example` (README tells you to `cp` a file that isn't in
  the repo), and the "Time Spent" line is a placeholder.
- **Swaps are decorative-ish:** pre-generated, swapped only in the UI; no dedicated
  endpoint, no undo, no dietary re-validation (README admits this).
- No dietary preferences, allergens, difficulty, cuisine, or target-servings are ever sent
  to the model — the schema and UI don't support them.
- No persistence: refresh wipes everything (README admits).
- No availability distinction (already-have vs. must-buy vs. pantry staple).

## 6. Bugs & architectural weaknesses

1. **Dead/fictional model IDs.** `candidateModels = ['gemini-3.5-flash',
   'gemini-3.6-flash', 'gemini-2.0-flash']`. Verified against Google's official docs
   (2026-11-15): **`gemini-2.0-flash` was retired (shutdown June 2026)** and the 3.5/3.6
   IDs are churny alias targets. Hardcoding a model-ID list is fragile by design.
2. **Fallback loop retries on *any* error** — including auth failures and 400s — for every
   model, with **no timeout**. A bad key means three slow failing calls.
3. **Error leakage.** The server returns `err.message`, raw model text (`raw`), and Zod
   `details` to the client — internal-shape disclosure.
4. **Wrong HTTP semantics.** Bad model output returns `422`; upstream auth/timeout/rate-limit
   are all collapsed into `500`. No `429`/`502`/`504`, no `Retry-After`.
5. **Schema duplicated four times** (Gemini schema object, server Zod, client
   `validateRecipe`, and again in `app.py`) — guaranteed to drift.
6. **Client validator masks bad data instead of rejecting it:** missing amount silently
   becomes `1`, missing name becomes `"Unknown ingredient"`, empty instruction passes. This
   defeats the point of validation and can render a nonsense recipe as "valid".
7. **Scaling produces fractional discrete items.** `amount * scaleFactor` with no notion of
   discrete (eggs) vs. continuous (grams) vs. qualitative ("a pinch") → "2.67 eggs".
8. **Model-supplied IDs trusted** for React keys (collision risk) and step order relies on
   the model numbering steps correctly.
9. **No availability/allergen enforcement.** The model's claims are rendered as truth.
10. `app.py` line 148 calls `ingredients_text.trim()` (Python strings have no `.trim()`),
    guarded only by a `hasattr` hack — dead giveaway of untested code.

## 7. Security issues

- **CORS wide open** (`app.use(cors())`) — any origin.
- **No rate limiting**, **no request-size limit** (JSON body unbounded).
- **Prompt-injection surface:** raw user string is concatenated into the system/prompt with
  no length cap or structure.
- Internal error detail leaked to clients (see bug #3).
- `.gitignore` *does* correctly ignore `.env` / `server/.env` (good), but there is **no
  `.env.example`**, so the documented setup step fails.
- `@google/genai: "latest"` — unpinned dependency, non-reproducible builds.
- No `LICENSE` file in the repo → **default "all rights reserved."** Provenance must be
  disclosed; reused code must be credited (see README).

## 8. UI/UX weaknesses

- Single screen only; no saved recipes, no cooking-focused mode.
- Swap control looks interactive but has no real consequence (no undo, steps still name the
  original ingredient after a swap).
- Dark-only theme; no light mode, limited empty-state guidance, no keyboard affordances
  beyond native inputs.
- Servings scaler can show absurd values (fractional eggs).

## 9. Testing gaps

Everything. No unit tests, no backend tests, no E2E, no mocked-provider tests — despite the
assignment weighting "handling bad AI output" at **20%** and naming it the main signal.

## 10. Proposed improvements (summary — details in IMPLEMENTATION_PLAN.md)

- **One canonical Zod schema** shared by server and client; derive the provider JSON schema
  from it. Delete the three duplicates and `app.py`.
- **Provider abstraction** (`gemini` + `mock`) selected by env, so failure-mode tests and
  Playwright run with zero API credits.
- **Config-driven model** (`GEMINI_MODEL`, default `gemini-flash-latest` — a real Google
  rolling alias) instead of a hardcoded fictional list.
- **Proper error taxonomy** with correct status codes, `Retry-After`, bounded retry only for
  retryable failures, server-side timeout via `AbortController`, and **no internal leakage**.
- **Deterministic server-side trust checks:** assign all IDs, renumber steps, verify
  "available" claims against the user's actual input, enforce allergen exclusions (regen
  once on violation), validate substitutions against dietary limits with a
  cross-contamination disclosure.
- **Correct scaling**: immutable base recipe; discrete/continuous/qualitative kinds;
  whole-number discrete items (min 1); never re-scale scaled values.
- **Real substitutions**: dedicated `/api/recipes/substitute` endpoint, overlay keyed by
  ingredient id, undo = delete the key.
- **Persistence**: versioned `localStorage`, Zod-validated on load, corrupt entries dropped.
- **Security**: restricted CORS, body limit, rate limiting, ingredient caps.
- **Tests**: Vitest unit + Supertest backend covering all failure modes; Playwright against
  the mock provider.

> Note: the project's active HawkScan security hook cannot run (`HAWK_API_KEY` unset); the
> security work above is done by hand and by the security checklist, not that scanner.
