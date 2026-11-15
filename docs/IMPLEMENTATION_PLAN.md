# Implementation Plan — FridgeChef AI

Prioritized roadmap. **Ordering principle (from the assignment PDF, the primary source):**
a clean, solid, reliable core beats a pile of half-working features. Grading weights:
React/architecture 25%, AI integration & data handling 25%, **handling bad AI output 20%**,
UI/UX 15%, communication 15%. The master prompt's extra pages (dedicated cooking-mode route,
settings, shopping list, photo scan, voice) are **stretch** and are only done once the core
is solid and tested.

Language: **JavaScript** (+ JSDoc + a shared Zod schema). TypeScript is explicitly *not
graded* and adds setup risk; a shared runtime Zod schema gives us the data-contract safety
that matters, in both server and client.

---

## P0 — Foundation & reliability (the graded core)

1. **Consolidate the project.** One root `package.json` (one `node_modules`, one Vitest).
   Run the Express server with `tsx`/`node`. Delete `app.py` + `requirements.txt` (redundant
   Streamlit copy) and the separate `server/package.json`, after documenting why.
2. **Canonical schema.** `src/shared/recipeSchema.js` — one Zod schema, richer than the
   original: ingredient `kind` (continuous|discrete|qualitative), `quantity` (nullable),
   `availability` (available|to_buy|pantry_staple), `optional`, `substitutions`, step
   `durationMinutes` + `tips`, recipe `cuisine`, `difficulty`, `dietaryTags`,
   `additionalIngredients`, `safetyNotes`. Derive the Gemini JSON schema from it.
3. **Provider abstraction.** `server/providers/` with `gemini.js` and `mock.js`, chosen by
   `AI_PROVIDER` (`gemini` | `mock`). `GEMINI_MODEL` env, default `gemini-flash-latest`.
   The mock returns deterministic fixtures and can be told to emit each failure mode.
4. **App factory.** `createApp({ provider })` separate from `listen()` so Supertest injects
   providers without credits.
5. **Error taxonomy + failure handling.** Status codes: 400 invalid input, 502 bad model
   output, 504 upstream timeout, 429/503 rate-limit (+`Retry-After`), 502/503 generic for
   auth/provider errors (**never leak** message/stack/raw). Server-side timeout via
   `AbortController`. Bounded **retry-once** only for malformed/schema/timeout/503.
6. **Deterministic trust checks** (never trust the model): assign recipe/ingredient/step
   IDs server-side; renumber steps; downgrade "available" ingredients that don't fuzzy-match
   the user's input to "to_buy"; enforce allergen exclusion by keyword (regen once on
   violation, else error); validate substitutes against dietary limits + always attach a
   cross-contamination disclosure.
7. **Security.** CORS restricted to localhost origins via env; `express.json({ limit })`;
   `express-rate-limit`; ingredient count/length caps; user ingredients sent to the model as
   a JSON array (not interpolated prose).
8. **Backend tests (Supertest + mock).** Valid, malformed JSON, incomplete, empty, invalid
   schema, timeout, 429, 503, auth error, unexpected exception → all ten of 5.5.

## P0 — Core domain logic (pure, unit-tested)

9. **Scaling** `src/lib/scaling.js` — pure fn of (base, servings, substitutions). Discrete →
   whole, min 1; qualitative → never scaled; continuous → scaled, pretty fractions. Base
   recipe immutable.
10. **Ingredient parsing/normalization** `src/lib/ingredients.js` — split on commas/newlines,
    trim, normalize case, dedupe, enforce max count. Unit-tested.
11. **Storage** `src/lib/storage.js` — versioned `localStorage` key; Zod-validate on load;
    drop corrupt/outdated entries; save recipe + servings + saved status + timestamp +
    cooking progress.
12. **Error classification** `src/lib/errors.js` — map server envelopes/HTTP to a small set of
    user-facing error types. Unit-tested.

## P1 — Frontend experience

13. Keep `useRecipeGenerator` abort/request-id logic; point it at `/api/recipes/generate`;
    use the new client validation (reject, don't mask).
14. Ingredient **chips** input: free text + comma/Enter to add, remove, clear-all, dedupe,
    normalize, max-count, inline validation. Preference controls: diet (multi), allergens
    (strict), max time, difficulty, target servings, optional cuisine.
15. **Recipe result**: title/description/times/difficulty/cuisine/servings/dietary tags;
    availability-grouped ingredients (have / to-buy / pantry); interactive **servings scaler**;
    ingredient **checklist**; **substitutions** with confirm + undo; designed image fallback
    (no AI image URLs).
16. **Cooking mode** (focused step-by-step overlay): progress %, completed/remaining,
    prev/next, per-step tips, ingredient checklist; progress persisted.
17. **Saved recipes** view: list, search/filter, open, delete, empty state, survives refresh.
18. States everywhere: loading skeletons, typed error cards with working retry, empty states.
19. **Design system**: tokens (forest green / warm cream / terracotta / charcoal), light +
    dark, typography pairing, consistent components, focus states, responsive/mobile.

## P1 — Verification

20. Vitest unit suite green; Supertest backend suite green; `npm run build` passes.
21. Playwright smoke flows against the **mock** provider (generate, malformed-output handling,
    scale, substitute, complete steps, save, reload, mobile viewport) — produces README
    screenshots. *(Stretch within P1; cut first if time runs short, per the PDF.)*

## P2 — Stretch (only if core is solid)

22. `/api/recipes/refine` refinement loop; shopping list from to-buy ingredients; print view;
    settings (theme, default servings); richer keyboard nav.

## Explicitly deferred (documented as future work, not built)

Photo/fridge scanning, ingredient detection, voice input, meal planning, nutrition estimates.
Per the master prompt these are optional future enhancements and must not compromise the core.

## Definition of done for THIS pass

Core (P0 + the P1 frontend + unit/backend tests + production build) complete and verified
locally. Live Gemini path implemented but **unverified** until the user supplies a
`GEMINI_API_KEY` (none is present; the app runs fully on the mock provider meanwhile).
