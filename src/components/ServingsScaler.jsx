import React from 'react';
import { Users, Minus, Plus, RotateCcw } from 'lucide-react';

export default function ServingsScaler({ baseServings, servings, onChange }) {
  const scaled = servings !== baseServings;
  return (
    <div className="servings-bar">
      <div className="servings-label">
        <Users size={20} style={{ color: 'var(--primary)' }} />
        <span>Servings: <span className="count">{servings}</span></span>
        {scaled && <span className="base">(recipe written for {baseServings})</span>}
      </div>
      <div className="stepper">
        <button onClick={() => onChange(Math.max(1, servings - 1))} disabled={servings <= 1} aria-label="Decrease servings"><Minus size={16} /></button>
        <span className="val" aria-live="polite">{servings}</span>
        <button onClick={() => onChange(servings + 1)} disabled={servings >= 50} aria-label="Increase servings"><Plus size={16} /></button>
        {scaled && (
          <button className="reset-link" onClick={() => onChange(baseServings)}><RotateCcw size={14} /> Reset</button>
        )}
      </div>
    </div>
  );
}
