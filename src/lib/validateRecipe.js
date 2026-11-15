/**
 * Client-side validation function to guard against malformed data or missing array elements before render.
 * @param {any} data 
 * @returns {{ valid: boolean, errorType?: string, errorMessage?: string, cleanedData?: any }}
 */
export function validateRecipe(data) {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errorType: 'MALFORMED_JSON',
      errorMessage: 'The response received from the server was not a valid recipe object.'
    };
  }

  const {
    title,
    description,
    base_servings,
    prep_time_minutes,
    cook_time_minutes,
    ingredients,
    steps
  } = data;

  if (typeof title !== 'string' || !title.trim()) {
    return { valid: false, errorType: 'MALFORMED_JSON', errorMessage: 'Recipe is missing a valid title.' };
  }

  if (typeof description !== 'string' || !description.trim()) {
    return { valid: false, errorType: 'MALFORMED_JSON', errorMessage: 'Recipe is missing a description.' };
  }

  if (typeof base_servings !== 'number' || base_servings <= 0) {
    return { valid: false, errorType: 'MALFORMED_JSON', errorMessage: 'Recipe base servings must be a positive number.' };
  }

  if (typeof prep_time_minutes !== 'number' || prep_time_minutes < 0) {
    return { valid: false, errorType: 'MALFORMED_JSON', errorMessage: 'Recipe prep time must be a non-negative number.' };
  }

  if (typeof cook_time_minutes !== 'number' || cook_time_minutes < 0) {
    return { valid: false, errorType: 'MALFORMED_JSON', errorMessage: 'Recipe cook time must be a non-negative number.' };
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return {
      valid: false,
      errorType: 'EMPTY_RESPONSE',
      errorMessage: 'The generated recipe contains no ingredients. Please try again.'
    };
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    return {
      valid: false,
      errorType: 'EMPTY_RESPONSE',
      errorMessage: 'The generated recipe contains no cooking steps. Please try again.'
    };
  }

  // Ensure individual ingredients have fallback defaults
  const cleanedIngredients = ingredients.map((ing, idx) => ({
    id: ing.id ? String(ing.id) : `ing-${idx + 1}-${Date.now()}`,
    name: typeof ing.name === 'string' ? ing.name : 'Unknown ingredient',
    amount: typeof ing.amount === 'number' && ing.amount > 0 ? ing.amount : 1,
    unit: typeof ing.unit === 'string' ? ing.unit : '',
    swaps: Array.isArray(ing.swaps) ? ing.swaps.filter(s => typeof s === 'string' && s.trim()) : []
  }));

  // Ensure individual steps have valid step_number and instruction
  const cleanedSteps = steps.map((step, idx) => ({
    id: step.id ? String(step.id) : `step-${idx + 1}-${Date.now()}`,
    instruction: typeof step.instruction === 'string' ? step.instruction : '',
    step_number: typeof step.step_number === 'number' ? step.step_number : idx + 1
  })).sort((a, b) => a.step_number - b.step_number);

  return {
    valid: true,
    cleanedData: {
      title: title.trim(),
      description: description.trim(),
      base_servings: Math.round(base_servings),
      prep_time_minutes: Math.round(prep_time_minutes),
      cook_time_minutes: Math.round(cook_time_minutes),
      ingredients: cleanedIngredients,
      steps: cleanedSteps
    }
  };
}
