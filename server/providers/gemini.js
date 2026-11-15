import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.js';
import { geminiResponseSchema } from './geminiSchema.js';

/**
 * Real Gemini provider via the official @google/genai SDK. The API key stays here on
 * the server and is never sent to the client. The model is config-driven (default is a
 * Google rolling alias) so a retired model ID can't break us.
 *
 * Note: the live path is implemented but can only be VERIFIED once a GEMINI_API_KEY is
 * present. With no key, config selects the mock provider instead.
 */
const substitutionSchema = {
  type: Type.OBJECT,
  properties: {
    substitutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, note: { type: Type.STRING } },
        required: ['name'],
      },
    },
  },
  required: ['substitutions'],
};

function client() {
  return new GoogleGenAI({ apiKey: config.gemini.apiKey });
}

async function call({ systemInstruction, prompt, schema, signal }) {
  const ai = client();
  const response = await ai.models.generateContent({
    model: config.gemini.model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.7,
      abortSignal: signal,
    },
  });
  return { text: response?.text ?? '' };
}

export const geminiProvider = {
  name: 'gemini',
  generate: ({ systemInstruction, prompt, signal }) =>
    call({ systemInstruction, prompt, schema: geminiResponseSchema, signal }),
  substitute: ({ systemInstruction, prompt, signal }) =>
    call({ systemInstruction, prompt, schema: substitutionSchema, signal }),
};
