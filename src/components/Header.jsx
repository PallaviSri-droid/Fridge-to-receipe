import React from 'react';
import { ChefHat, Sun, Moon, Sparkles, BookMarked } from 'lucide-react';

export default function Header({ view, onView, savedCount, theme, onToggleTheme }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onView('create')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <span className="brand-mark"><ChefHat size={20} /></span>
        <span className="brand-name">Fridge<b>Chef</b> AI</span>
      </button>

      <div className="header-actions">
        <nav className="nav-tabs" aria-label="Views">
          <button className={`nav-tab ${view === 'create' ? 'active' : ''}`} onClick={() => onView('create')} aria-current={view === 'create'}>
            <Sparkles size={16} /> <span className="label">Create</span>
          </button>
          <button className={`nav-tab ${view === 'saved' ? 'active' : ''}`} onClick={() => onView('saved')} aria-current={view === 'saved'}>
            <BookMarked size={16} /> <span className="label">Saved</span>
            {savedCount > 0 && <span className="count">{savedCount}</span>}
          </button>
        </nav>
        <button className="icon-btn" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
