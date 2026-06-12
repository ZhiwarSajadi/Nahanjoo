import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake-key' });

async function test() {
  try {
    const rawOperation = await (ai as any).apiClient.request({
        path: `operations/foo-bar`,
        httpMethod: 'GET',
    });
    console.log(await rawOperation.json());
  } catch(e: any) {
    console.log(e.message);
  }
}
test();
