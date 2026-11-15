import { createApp } from './app.js';
import { config, isProviderConfigured } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  const mode = config.provider === 'gemini' ? `Gemini (${config.gemini.model})` : 'MOCK (no API key needed)';
  console.log(`🍳 FridgeChef AI backend on http://localhost:${config.port}`);
  console.log(`   Provider: ${mode}`);
  if (config.provider === 'gemini' && !isProviderConfigured()) {
    console.warn('   ⚠ GEMINI_API_KEY is missing — generation will fail. Set it in server/.env or run `npm run server:mock`.');
  }
});
