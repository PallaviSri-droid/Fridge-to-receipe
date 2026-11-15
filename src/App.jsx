import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import Header from './components/Header.jsx';
import IngredientInput from './components/IngredientInput.jsx';
import PreferencesPanel from './components/PreferencesPanel.jsx';
import LoadingState from './components/states/LoadingState.jsx';
import ErrorState from './components/states/ErrorState.jsx';
import EmptyState from './components/states/EmptyState.jsx';
import RecipeResult from './components/RecipeResult.jsx';
import CookingMode from './components/CookingMode.jsx';
import SavedRecipes from './components/SavedRecipes.jsx';
import Toast from './components/Toast.jsx';

import { useRecipeGenerator } from './hooks/useRecipeGenerator.js';
import { useSubstitutions } from './hooks/useSubstitutions.js';
import { useTheme } from './hooks/useTheme.js';
import { scaleRecipe } from './lib/scaling.js';
import { getSavedRecipes, saveRecipe, deleteRecipe, isSaved, updateProgress } from './lib/storage.js';

const DEFAULT_PREFS = { diets: [], allergens: [], servings: 2, maxTimeMinutes: null, difficulty: null, cuisine: '' };

export default function App() {
  const { theme, toggle } = useTheme();
  const [view, setView] = useState('create');
  const [ingredients, setIngredients] = useState([]);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const gen = useRecipeGenerator();
  const subs = useSubstitutions();

  const [active, setActive] = useState(null); // { recipe, diets, allergens }
  const [servings, setServings] = useState(2);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});
  const [cooking, setCooking] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [savedTick, setSavedTick] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => { setSavedList(getSavedRecipes()); }, [savedTick]);

  // Load a recipe for display (from a fresh generation or a saved entry).
  const openRecipe = useCallback((recipe, opts = {}) => {
    setActive({ recipe, diets: opts.diets || [], allergens: opts.allergens || [] });
    setServings(opts.servings ?? recipe.baseServings);
    subs.setOverlay(opts.substitutions || {});
    setCheckedIngredients(opts.progress?.ingredients || {});
    setCheckedSteps(opts.progress?.steps || {});
    setView('create');
  }, [subs]);

  // Sync a successful generation into the active recipe.
  useEffect(() => {
    if (gen.recipe) openRecipe(gen.recipe, { diets: prefs.diets, allergens: prefs.allergens, servings: prefs.servings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.recipe]);

  const handleGenerate = useCallback(() => {
    setView('create');
    gen.generate({
      ingredients,
      diets: prefs.diets,
      allergens: prefs.allergens,
      maxTimeMinutes: prefs.maxTimeMinutes,
      difficulty: prefs.difficulty,
      servings: prefs.servings,
      cuisine: prefs.cuisine,
    });
  }, [gen, ingredients, prefs]);

  const saved = active ? isSaved(active.recipe.id) : false;

  const handleSave = useCallback(() => {
    if (!active) return;
    saveRecipe({ recipe: active.recipe, servings, substitutions: subs.overlay, diets: active.diets, allergens: active.allergens, progress: { ingredients: checkedIngredients, steps: checkedSteps } });
    setSavedTick((t) => t + 1);
    setToast('Recipe saved');
  }, [active, servings, subs.overlay, checkedIngredients, checkedSteps]);

  // Persist cooking progress for an already-saved recipe whenever it changes.
  useEffect(() => {
    if (active && isSaved(active.recipe.id)) {
      updateProgress(active.recipe.id, { ingredients: checkedIngredients, steps: checkedSteps });
    }
  }, [checkedIngredients, checkedSteps, active]);

  const openSaved = useCallback((entry) => {
    openRecipe(entry.recipe, { servings: entry.servings, substitutions: entry.substitutions, diets: entry.diets, allergens: entry.allergens, progress: entry.progress });
  }, [openRecipe]);

  const handleDelete = useCallback((id) => {
    deleteRecipe(id);
    setSavedTick((t) => t + 1);
    if (active?.recipe.id === id) { /* keep showing it; it's just no longer saved */ }
    setToast('Recipe deleted');
  }, [active]);

  const toggleIngredient = useCallback((id) => setCheckedIngredients((m) => ({ ...m, [id]: !m[id] })), []);
  const toggleStep = useCallback((id) => setCheckedSteps((m) => ({ ...m, [id]: !m[id] })), []);

  const cookView = useMemo(
    () => (active ? scaleRecipe(active.recipe, servings, subs.overlay) : null),
    [active, servings, subs.overlay]
  );

  const substitutionContext = active
    ? { recipeTitle: active.recipe.title, diets: active.diets, allergens: active.allergens }
    : {};

  return (
    <div className="app-shell">
      <Header view={view} onView={setView} savedCount={savedList.length} theme={theme} onToggleTheme={toggle} />

      {view === 'create' && (
        <>
          <section className="hero">
            <h1>Turn what you have into <span className="accent">something delicious</span></h1>
            <p>List the ingredients in your fridge and FridgeChef AI builds a structured, interactive recipe — with scalable servings, smart swaps, and a guided cooking mode.</p>
          </section>

          <IngredientInput items={ingredients} onChange={setIngredients} />

          <div className="card">
            <PreferencesPanel prefs={prefs} onChange={setPrefs} />
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={handleGenerate} disabled={gen.loading || ingredients.length === 0}>
              {gen.loading ? <><span className="spinner on-accent" /> Cooking up your recipe…</> : <><Sparkles size={20} /> Generate recipe</>}
            </button>
          </div>

          {gen.loading && <LoadingState />}
          {!gen.loading && gen.error && <ErrorState errorType={gen.error.type} message={gen.error.message} onRetry={gen.retry} />}
          {!gen.loading && !gen.error && active && (
            <RecipeResult
              recipe={active.recipe}
              servings={servings}
              onServings={setServings}
              subs={subs}
              checkedIngredients={checkedIngredients}
              checkedSteps={checkedSteps}
              onToggleIngredient={toggleIngredient}
              onToggleStep={toggleStep}
              onSave={handleSave}
              saved={saved}
              onCook={() => setCooking(true)}
              context={substitutionContext}
            />
          )}
          {!gen.loading && !gen.error && !active && <EmptyState />}
        </>
      )}

      {view === 'saved' && (
        <>
          <section className="hero"><h1>Saved recipes</h1><p>Your kept recipes, stored locally in this browser.</p></section>
          <SavedRecipes recipes={savedList} onOpen={openSaved} onDelete={handleDelete} />
        </>
      )}

      <footer className="site-footer">
        <p>FridgeChef AI · React + Express + Gemini · Recipes are AI-generated — always use your judgment on food safety.</p>
      </footer>

      {cooking && cookView && (
        <CookingMode
          view={cookView}
          checkedSteps={checkedSteps}
          onToggleStep={toggleStep}
          checkedIngredients={checkedIngredients}
          onToggleIngredient={toggleIngredient}
          onClose={() => setCooking(false)}
        />
      )}

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
