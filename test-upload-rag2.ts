import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake-key' });
const fss = (ai as any).fileSearchStores;
console.log(fss.apiClient.uploadFileToFileSearchStore.toString());
