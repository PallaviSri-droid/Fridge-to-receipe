import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { DIETS, ALLERGENS, DIFFICULTIES, DIET_LABELS, ALLERGEN_LABELS, DIFFICULTY_LABELS } from '../lib/uiConstants.js';

/**
 * Preferences that get sent to the model: diets (multi), allergens (strict, multi),
 * target servings, max time, difficulty, optional cuisine. Collapsible to keep the
 * first screen calm.
 */
export default function PreferencesPanel({ prefs, onChange }) {
  const [open, setOpen] = useState(false);

  const toggleIn = (key, value) => {
    const set = new Set(prefs[key]);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ ...prefs, [key]: [...set] });
  };
  const set = (key, value) => onChange({ ...prefs, [key]: value });
  const activeCount = prefs.diets.length + prefs.allergens.length + (prefs.difficulty ? 1 : 0) + (prefs.maxTimeMinutes ? 1 : 0) + (prefs.cuisine ? 1 : 0);

  return (
    <div className="prefs">
      <button type="button" className="link-btn" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)' }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <SlidersHorizontal size={16} /> Preferences {activeCount > 0 && `(${activeCount})`}
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
      </button>

      {open && (
        <>
          <div className="prefs-group">
            <label className="group-label">Diet</label>
            <div className="toggle-set">
              {DIETS.map((d) => (
                <button type="button" key={d} className={`toggle ${prefs.diets.includes(d) ? 'on' : ''}`} onClick={() => toggleIn('diets', d)} aria-pressed={prefs.diets.includes(d)}>
                  {DIET_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="prefs-group">
            <label className="group-label">Allergens to strictly exclude</label>
            <div className="toggle-set">
              {ALLERGENS.map((a) => (
                <button type="button" key={a} className={`toggle allergen ${prefs.allergens.includes(a) ? 'on' : ''}`} onClick={() => toggleIn('allergens', a)} aria-pressed={prefs.allergens.includes(a)}>
                  {ALLERGEN_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          <div className="prefs-inline">
            <div className="field">
              <label className="group-label" htmlFor="pref-servings">Servings</label>
              <input id="pref-servings" className="num-input" type="number" min={1} max={50} value={prefs.servings}
                onChange={(e) => set('servings', Math.max(1, Math.min(50, Number(e.target.value) || 1)))} style={{ width: 90 }} />
            </div>
            <div className="field">
              <label className="group-label" htmlFor="pref-time">Max time (min)</label>
              <input id="pref-time" className="num-input" type="number" min={5} max={600} placeholder="any" value={prefs.maxTimeMinutes ?? ''}
                onChange={(e) => set('maxTimeMinutes', e.target.value ? Math.max(5, Number(e.target.value)) : null)} style={{ width: 90 }} />
            </div>
            <div className="field">
              <label className="group-label" htmlFor="pref-diff">Difficulty</label>
              <select id="pref-diff" className="select" value={prefs.difficulty ?? ''} onChange={(e) => set('difficulty', e.target.value || null)}>
                <option value="">Any</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label className="group-label" htmlFor="pref-cuisine">Cuisine (optional)</label>
              <input id="pref-cuisine" className="num-input" type="text" maxLength={60} placeholder="e.g. Italian, Thai" value={prefs.cuisine}
                onChange={(e) => set('cuisine', e.target.value)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
