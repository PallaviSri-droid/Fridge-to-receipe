import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IngredientInput from '../../src/components/IngredientInput.jsx';
import ErrorState from '../../src/components/states/ErrorState.jsx';

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
