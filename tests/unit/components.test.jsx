import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IngredientInput from '../../src/components/IngredientInput.jsx';
import ErrorState from '../../src/components/states/ErrorState.jsx';
import IngredientList from '../../src/components/IngredientList.jsx';

describe('IngredientInput', () => {
  it('adds an ingredient on Enter', () => {
    const onChange = vi.fn();
    render(<IngredientInput items={[]} onChange={onChange} />);
    const input = screen.getByLabelText('Add an ingredient');
    fireEvent.change(input, { target: { value: 'eggs' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['eggs']);
  });

  it('prevents duplicates (case-insensitive)', () => {
    const onChange = vi.fn();
    render(<IngredientInput items={['Eggs']} onChange={onChange} />);
    const input = screen.getByLabelText('Add an ingredient');
    fireEvent.change(input, { target: { value: 'eggs' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Eggs']); // unchanged, no duplicate
  });

  it('removes an ingredient via its chip button', () => {
    const onChange = vi.fn();
    render(<IngredientInput items={['eggs', 'spinach']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Remove eggs'));
    expect(onChange).toHaveBeenCalledWith(['spinach']);
  });
});

describe('ErrorState', () => {
  it('renders a typed error and fires retry for retryable errors', () => {
    const onRetry = vi.fn();
    render(<ErrorState errorType="MALFORMED_JSON" message="bad" onRetry={onRetry} />);
    expect(screen.getByText(/Unreadable AI output/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides retry for non-retryable errors', () => {
    render(<ErrorState errorType="INVALID_INPUT" message="x" onRetry={() => {}} />);
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });
});

describe('IngredientList — substitution UI', () => {
  const baseSubs = () => ({ options: {}, undo: vi.fn(), fetchOptions: vi.fn(), applySubstitution: vi.fn() });
  const renderList = (ingredients, subs, context = {}) =>
    render(
      <IngredientList
        recipe={{ additionalIngredients: [] }}
        ingredients={ingredients}
        checked={{}}
        onToggle={() => {}}
        subs={subs}
        context={context}
      />
    );

  it('renders fetched options and applies the chosen one', () => {
    const ing = { id: 'i1', name: 'cheddar', availability: 'available', displayQuantity: 150, unit: 'g', kind: 'continuous' };
    const subs = { ...baseSubs(), options: { i1: { loading: false, items: [{ name: 'Gouda', note: 'melts' }], disclosure: '', error: null } } };
    renderList([ing], subs);
    fireEvent.click(screen.getByRole('button', { name: 'Gouda' }));
    expect(subs.applySubstitution).toHaveBeenCalledWith('i1', { name: 'Gouda', note: 'melts' });
  });

  it('shows "was <original>" and the applied note after a swap', () => {
    const ing = {
      id: 'i1', name: 'Gouda', originalName: 'cheddar',
      substitutedWith: { name: 'Gouda', note: 'melts the same way' },
      availability: 'to_buy', displayQuantity: 150, unit: 'g', kind: 'continuous',
    };
    renderList([ing], baseSubs());
    expect(screen.getByText(/was cheddar/i)).toBeInTheDocument();
    expect(screen.getByText(/melts the same way/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('uses a restriction-aware message when no swaps fit the diet', () => {
    const ing = { id: 'i1', name: 'quark', availability: 'available', displayQuantity: 50, unit: 'g', kind: 'continuous' };
    const subs = { ...baseSubs(), options: { i1: { loading: false, items: [], disclosure: '', error: null } } };
    renderList([ing], subs, { diets: ['vegan'], allergens: [] });
    expect(screen.getByText(/that fit your restrictions/i)).toBeInTheDocument();
  });

  it('uses a plain message when no swaps and no restrictions', () => {
    const ing = { id: 'i1', name: 'quark', availability: 'available', displayQuantity: 50, unit: 'g', kind: 'continuous' };
    const subs = { ...baseSubs(), options: { i1: { loading: false, items: [], disclosure: '', error: null } } };
    renderList([ing], subs, { diets: [], allergens: [] });
    expect(screen.getByText(/No common swaps for quark/i)).toBeInTheDocument();
  });
});
