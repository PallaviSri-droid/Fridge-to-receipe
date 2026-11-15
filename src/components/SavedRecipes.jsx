import React, { useState } from 'react';
import { Search, Trash2, FolderOpen, Clock, Users, BookMarked } from 'lucide-react';

/** Saved-recipe collection with search, open, and delete. Backed by localStorage. */
export default function SavedRecipes({ recipes, onOpen, onDelete }) {
  const [q, setQ] = useState('');

  const filtered = recipes.filter((r) => {
    const hay = `${r.recipe.title} ${r.recipe.cuisine} ${r.recipe.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  if (!recipes.length) {
    return (
      <div className="card state-card">
        <div className="state-illus"><BookMarked size={32} /></div>
        <h3>No saved recipes yet</h3>
        <p>Generate a recipe and tap <strong>Save recipe</strong> to keep it here. Saved recipes
          survive a page refresh.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="search-field">
        <Search size={18} style={{ color: 'var(--text-dim)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved recipes…" aria-label="Search saved recipes" />
      </div>

      {filtered.length === 0 ? (
        <p className="hint" style={{ textAlign: 'center', padding: 24 }}>No recipes match “{q}”.</p>
      ) : (
        <div className="saved-grid">
          {filtered.map((r) => (
            <div className="saved-card" key={r.recipe.id}>
              <h3>{r.recipe.title}</h3>
              <p className="hint" style={{ margin: 0 }}>{r.recipe.description.slice(0, 90)}{r.recipe.description.length > 90 ? '…' : ''}</p>
              <div className="meta">
                <span><Clock size={12} /> {(r.recipe.prepTimeMinutes + r.recipe.cookTimeMinutes)} min</span>
                <span><Users size={12} /> {r.servings}</span>
                <span>{new Date(r.savedAt).toLocaleDateString()}</span>
              </div>
              <div className="actions">
                <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.88rem', flex: 1 }} onClick={() => onOpen(r)}>
                  <FolderOpen size={15} /> Open
                </button>
                <button className="icon-btn" onClick={() => onDelete(r.recipe.id)} aria-label={`Delete ${r.recipe.title}`} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
