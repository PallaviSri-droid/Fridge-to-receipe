import React from 'react';
import { AlertTriangle, RefreshCw, Code2, ServerCrash, WifiOff, ShieldAlert } from 'lucide-react';
import { presentError } from '../../lib/errors.js';

const ICONS = { parser: Code2, network: WifiOff, server: ServerCrash, warn: ShieldAlert };

/** Typed error card driven by the shared error presentation map. Retry only shows when sensible. */
export default function ErrorState({ errorType, message, onRetry }) {
  const p = presentError(errorType, message);
  const Icon = ICONS[p.variant] || AlertTriangle;

  return (
    <div className={`card state-card error-card ${p.variant}`} role="alert">
      <span className="error-tag">{p.type.replace(/_/g, ' ')}</span>
      <div className="state-illus"><Icon size={30} /></div>
      <h3>{p.title}</h3>
      <p>{p.message}</p>
      {p.retryable && onRetry && (
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onRetry}>
            <RefreshCw size={18} /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
