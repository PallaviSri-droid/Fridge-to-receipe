import React, { useMemo } from 'react';
import { Clock, Flame, Timer, Soup, BarChart3, Bookmark, BookmarkCheck, CookingPot, ShieldAlert } from 'lucide-react';
import { scaleRecipe } from '../lib/scaling.js';
import { DIFFICULTY_LABELS } from '../lib/uiConstants.js';
import ServingsScaler from './ServingsScaler.jsx';
import IngredientList from './IngredientList.jsx';
import StepList from './StepList.jsx';

/**
 * The interactive recipe. Everything shown is a pure projection of the immutable base
 * recipe through (servings, substitution overlay) — scaling can never compound.
 */
export default function RecipeResult({
  recipe, servings, onServings, subs, checkedIngredients, checkedSteps,
  onToggleIngredient, onToggleStep, onSave, saved, onCook, context,
}) {
  const view = useMemo(() => scaleRecipe(recipe, servings, subs.overlay), [recipe, servings, subs.overlay]);

  return (
    <article className="card">
      <header className="recipe-head">
        <span className="eyebrow"><Soup size={14} /> Your recipe</span>
        <h1>{view.title}</h1>
        <p className="desc">{view.description}</p>

        {(view.dietaryTags?.length > 0) && (
          <div className="tag-row">
            {view.dietaryTags.map((t) => <span className="diet-tag" key={t}>{t}</span>)}
          </div>
        )}

        <div className="meta-bar">
          <span className="meta-pill"><Clock size={16} /><span><span className="k">Prep</span><span className="v">{view.prepTimeMinutes} min</span></span></span>
          <span className="meta-pill"><Flame size={16} /><span><span className="k">Cook</span><span className="v">{view.cookTimeMinutes} min</span></span></span>
          <span className="meta-pill"><Timer size={16} /><span><span className="k">Total</span><span className="v">{view.totalTimeMinutes} min</span></span></span>
          <span className="meta-pill"><BarChart3 size={16} /><span><span className="k">Difficulty</span><span className="v">{DIFFICULTY_LABELS[view.difficulty] || view.difficulty}</span></span></span>
          {view.cuisine && <span className="meta-pill"><Soup size={16} /><span><span className="k">Cuisine</span><span className="v">{view.cuisine}</span></span></span>}
        </div>

        <div className="recipe-actions">
          <button className="btn btn-accent" onClick={onCook}><CookingPot size={18} /> Start cooking</button>
          <button className="btn btn-ghost" onClick={() => onSave(view)}>
            {saved ? <><BookmarkCheck size={18} /> Saved</> : <><Bookmark size={18} /> Save recipe</>}
          </button>
        </div>
      </header>

      <ServingsScaler baseServings={recipe.baseServings} servings={servings} onChange={onServings} />

      <div className="recipe-grid">
        <IngredientList
          recipe={view}
          ingredients={view.ingredients}
          checked={checkedIngredients}
          onToggle={onToggleIngredient}
          subs={subs}
          context={context}
        />
        <StepList steps={view.steps} checked={checkedSteps} onToggle={onToggleStep} />
      </div>

      {view.safetyNotes?.length > 0 && (
        <div className="safety-notes">
          <h4><ShieldAlert size={14} /> Safety notes</h4>
          <ul>{view.safetyNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
    </article>
  );
}
