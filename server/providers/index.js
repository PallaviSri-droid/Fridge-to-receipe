import { config } from '../config.js';
import { mockProvider } from './mock.js';
import { geminiProvider } from './gemini.js';

/**
 * Select the active provider from config. Tests bypass this entirely by passing a
 * provider straight into createApp({ provider }).
 */
export function selectProvider() {
  if (config.provider === 'gemini') return geminiProvider;
  return mockProvider;
}
