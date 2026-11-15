import React, { useState } from 'react';
import { Carrot, Plus, X, AlertCircle } from 'lucide-react';
import { addIngredients, removeIngredient, MAX_INGREDIENTS } from '../lib/ingredients.js';
import { SUGGESTED_COMBOS } from '../lib/uiConstants.js';

/**
 * Chip-based ingredient entry: free text, comma- or Enter-to-add, remove, clear-all,
 * duplicate prevention, normalization, and a max-count guard.
 */
export default function IngredientInput({ items, onChange }) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const commit = (text) => {
    if (!text.trim()) return;
    const { list, rejectedDuplicate, atLimit } = addIngredients(items, text);
    onChange(list);
    setDraft('');
    if (atLimit && list.length >= MAX_INGREDIENTS) setNotice(`You can add up to ${MAX_INGREDIENTS} ingredients.`);
    else if (rejectedDuplicate) setNotice('Skipped a duplicate ingredient.');
    else setNotice('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && items.length) {
      onChange(removeIngredient(items, items.length - 1));
    }
  };

  const addCombo = (combo) => {
    const { list } = addIngredients(items, combo.items.join(','));
    onChange(list);
    setNotice('');
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="icon-badge"><Carrot size={22} /></span>
        <div>
          <h2>What's in your fridge?</h2>
          <p>Add ingredients one at a time or paste a comma-separated list.</p>
        </div>
      </div>

      <div className={`chips-field ${notice && items.length >= MAX_INGREDIENTS ? 'has-error' : ''}`} onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        {items.map((item, i) => (
          <span className="chip" key={`${item}-${i}`}>
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(removeIngredient(items, i))}>
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          id="ingredient-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder={items.length ? 'Add another…' : 'e.g. eggs, spinach, cheddar, leftover rice'}
          aria-label="Add an ingredient"
        />
      </div>

      <div className="field-row">
        <span className="hint">{items.length}/{MAX_INGREDIENTS} ingredients {notice && <>· {notice}</>}</span>
        {items.length > 0 && (
          <button type="button" className="link-btn" onClick={() => { onChange([]); setNotice(''); }}>Clear all</button>
        )}
      </div>

      {items.length === 0 && (
        <div className="suggestions">
          {SUGGESTED_COMBOS.map((c) => (
            <button type="button" key={c.label} className="suggestion" onClick={() => addCombo(c)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
