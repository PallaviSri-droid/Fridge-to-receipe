import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const MESSAGES = [
  'Reading your ingredients…',
  'Balancing flavors and proportions…',
  'Writing clear, ordered steps…',
  'Checking dietary restrictions…',
  'Plating your recipe…',
];

export default function LoadingState() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card" role="status" aria-live="polite">
      <div className="loading-head"><span className="spinner" /> <span>{MESSAGES[i]}</span></div>
      <div className="skeleton sk-row" style={{ width: '55%', height: 26 }} />
      <div className="skeleton sk-row" style={{ width: '92%' }} />
      <div className="skeleton sk-row" style={{ width: '78%' }} />
      <div className="sk-grid">
        <div className="skeleton sk-box" /><div className="skeleton sk-box" /><div className="skeleton sk-box" />
      </div>
      <span className="visually-hidden">Generating recipe</span>
    </div>
  );
}
