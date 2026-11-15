import React from 'react';
import { Salad } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="card state-card">
      <div className="state-illus"><Salad size={32} /></div>
      <h3>Ready when you are</h3>
      <p>Add the ingredients you have, set any dietary preferences, then generate a recipe with
        scalable servings, ingredient swaps, and a step-by-step cooking mode.</p>
    </div>
  );
}
