import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake-key' });
console.log((ai as any).fileSearchStores.uploadToFileSearchStore.toString());
