import React from 'react';
import { Check, Clock, Lightbulb } from 'lucide-react';

/** Cooking-step checklist with completion progress. Checked state is lifted to the parent. */
export default function StepList({ steps, checked, onToggle }) {
  const done = steps.filter((s) => checked[s.id]).length;
  return (
    <section>
      <div className="section-head">
        <h3>Instructions</h3>
        <span className="progress-pill">{done}/{steps.length} done</span>
      </div>
      {steps.map((step) => {
        const isDone = !!checked[step.id];
        return (
          <label className={`step-item ${isDone ? 'done' : ''}`} key={step.id}>
            <input type="checkbox" className="hidden-cb" checked={isDone} onChange={() => onToggle(step.id)} />
            <span className={`step-num ${isDone ? 'done' : ''}`}>{isDone ? <Check size={14} strokeWidth={3} /> : step.stepNumber}</span>
            <div className="step-body">
              <p className={`text ${isDone ? 'struck' : ''}`}>{step.instruction}</p>
              <div className="step-meta">
                {step.durationMinutes ? <span><Clock size={12} /> {step.durationMinutes} min</span> : null}
                {step.tip ? <span className="step-tip"><Lightbulb size={12} /> {step.tip}</span> : null}
              </div>
            </div>
          </label>
        );
      })}
    </section>
  );
}
