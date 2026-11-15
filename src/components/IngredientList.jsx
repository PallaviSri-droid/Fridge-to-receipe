import React from 'react';
import { Check, Repeat, Undo2, Info, Loader2 } from 'lucide-react';
import { formatMeasure } from '../lib/format.js';
import { AVAILABILITY_LABELS } from '../lib/uiConstants.js';

const GROUP_ORDER = ['available', 'to_buy', 'pantry_staple'];

/**
 * Ingredient checklist grouped by availability, with real substitutions: clicking Swap
 * fetches options from the backend; choosing one overlays it; Undo restores the original.
 */
export default function IngredientList({ recipe, ingredients, checked, onToggle, subs, context }) {
  const groups = GROUP_ORDER
    .map((key) => ({ key, items: ingredients.filter((i) => i.availability === key) }))
    .filter((g) => g.items.length);

  const checkedCount = ingredients.filter((i) => checked[i.id]).length;

  return (
    <section>
      <div className="section-head">
        <h3>Ingredients</h3>
        <span className="progress-pill">{checkedCount}/{ingredients.length}</span>
      </div>

      {groups.map((group) => (
        <div className="avail-group" key={group.key}>
          <div className={`avail-label ${group.key}`}>{AVAILABILITY_LABELS[group.key]}</div>
          {group.items.map((ing) => {
            const isChecked = !!checked[ing.id];
            const opt = subs.options[ing.id];
            const swapped = !!ing.substitutedWith;
            return (
              <div className={`ing-item ${isChecked ? 'checked' : ''}`} key={ing.id}>
                <label className="ing-main">
                  <input type="checkbox" className="hidden-cb" checked={isChecked} onChange={() => onToggle(ing.id)} />
                  <span className={`cbox ${isChecked ? 'on' : ''}`}>{isChecked && <Check size={14} strokeWidth={3} />}</span>
                  {ing.displayQuantity != null || ing.unit ? (
                    <span className="ing-qty">{formatMeasure({ ...ing, quantity: ing.displayQuantity })}</span>
                  ) : null}
                  <span className={`ing-name ${isChecked ? 'struck' : ''}`}>
                    {ing.name}{ing.optional && <span className="opt-flag"> · optional</span>}
                  </span>
                  {swapped && <span className="sub-badge">swapped</span>}
                </label>

                <div className="ing-sub-row">
                  {swapped ? (
                    <>
                      <span className="hint">was {ing.originalName}</span>
                      <button className="undo-link" onClick={() => subs.undo(ing.id)}><Undo2 size={12} /> undo</button>
                    </>
                  ) : opt ? (
                    opt.loading ? (
                      <span className="hint"><Loader2 size={13} className="spin" /> finding swaps…</span>
                    ) : opt.items.length ? (
                      <div className="sub-options">
                        {opt.items.map((s) => (
                          <button key={s.name} className="sub-option" title={s.note} onClick={() => subs.applySubstitution(ing.id, s)}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="hint error">{opt.error || 'No safe swaps found.'}</span>
                    )
                  ) : (
                    <button className="sub-btn" onClick={() => subs.fetchOptions(ing, context)}>
                      <Repeat size={12} /> Swap
                    </button>
                  )}
                </div>

                {opt && !opt.loading && opt.disclosure && !swapped && (
                  <div className="disclosure"><Info size={14} /> <span>{opt.disclosure}</span></div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {recipe.additionalIngredients?.length > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          Also handy: {recipe.additionalIngredients.join(', ')}
        </p>
      )}
    </section>
  );
}
