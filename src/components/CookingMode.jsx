import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, Check, Clock } from 'lucide-react';
import { formatMeasure } from '../lib/format.js';

/**
 * Focused, full-screen step-by-step cooking view. Progress is driven by the same
 * checked-step state as the recipe card, so toggling here persists everywhere.
 */
export default function CookingMode({ view, checkedSteps, onToggleStep, checkedIngredients, onToggleIngredient, onClose }) {
  const steps = view.steps;
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const doneCount = steps.filter((s) => checkedSteps[s.id]).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(steps.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps.length, onClose]);

  const markAndNext = () => {
    if (!checkedSteps[step.id]) onToggleStep(step.id);
    if (idx < steps.length - 1) setIdx(idx + 1);
  };

  return (
    <div className="cook-overlay" role="dialog" aria-modal="true" aria-label="Cooking mode">
      <div className="cook-top">
        <h2>{view.title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Exit cooking mode"><X size={18} /></button>
      </div>
      <div className="cook-progress-track"><div className="cook-progress-fill" style={{ width: `${pct}%` }} /></div>

      <div className="cook-body">
        <span className="cook-step-count">Step {idx + 1} of {steps.length} · {doneCount} done</span>
        <p className="cook-instruction">{step.instruction}</p>
        {step.durationMinutes ? <p className="hint"><Clock size={13} /> about {step.durationMinutes} min</p> : null}
        {step.tip ? <p className="cook-tip"><Lightbulb size={16} /> {step.tip}</p> : null}

        <div className="cook-dots">
          {steps.map((s, i) => (
            <button key={s.id} className={`cook-dot ${i === idx ? 'active' : ''} ${checkedSteps[s.id] ? 'done' : ''}`}
              onClick={() => setIdx(i)} aria-label={`Go to step ${i + 1}`} />
          ))}
        </div>

        <div className="cook-nav">
          <button className="btn btn-ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft size={18} /> Back</button>
          <button className="btn btn-primary" onClick={markAndNext}>
            {checkedSteps[step.id] ? <>Next <ChevronRight size={18} /></> : <><Check size={18} /> {idx < steps.length - 1 ? 'Done, next' : 'Finish'}</>}
          </button>
        </div>
      </div>

      <details className="cook-ingredients">
        <summary>Ingredient checklist ({view.ingredients.filter((i) => checkedIngredients[i.id]).length}/{view.ingredients.length})</summary>
        <div style={{ marginTop: 12 }}>
          {view.ingredients.map((ing) => (
            <label className={`ing-item ${checkedIngredients[ing.id] ? 'checked' : ''}`} key={ing.id} style={{ cursor: 'pointer' }}>
              <span className="ing-main">
                <input type="checkbox" className="hidden-cb" checked={!!checkedIngredients[ing.id]} onChange={() => onToggleIngredient(ing.id)} />
                <span className={`cbox ${checkedIngredients[ing.id] ? 'on' : ''}`}>{checkedIngredients[ing.id] && <Check size={14} strokeWidth={3} />}</span>
                <span className="ing-qty">{formatMeasure({ ...ing, quantity: ing.displayQuantity })}</span>
                <span className={`ing-name ${checkedIngredients[ing.id] ? 'struck' : ''}`}>{ing.name}</span>
              </span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
