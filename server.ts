import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? '/tmp/uploads/' : 'uploads/';

const upload = multer({ dest: uploadDir });

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const aiAny = ai as any;

    // Endpoint to create RAG store
    app.post('/api/rag/create', async (req, res) => {
        try {
            const { displayName } = req.body;
            const ragStore = await aiAny.fileSearchStores.create({ config: { displayName } });
            res.json({ name: ragStore.name });
        } catch (err: any) {
            console.error("rag/create error:", err);
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    // Endpoint to upload file
    app.post('/api/rag/upload', upload.single('file'), async (req, res) => {
        try {
            const { ragStoreName } = req.body;
            if (!req.file || !ragStoreName) {
                if (req.file?.path) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Missing file or ragStoreName" });
            }
            
            let op = await aiAny.fileSearchStores.uploadToFileSearchStore({
                fileSearchStoreName: ragStoreName,
                file: req.file.path,
                config: {
                    displayName: req.file.originalname,
                    mimeType: req.file.mimetype
                }
            });

            fs.unlinkSync(req.file.path); // cleanup
            res.json({ success: true, fileResult: op, operation: op });
        } catch (err: any) {
            console.error("rag/upload error:", err);
            try { fs.unlinkSync(req.file?.path || ""); } catch { }
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    // Endpoint to check operation
    app.post('/api/rag/check-operation', async (req, res) => {
        try {
            const { operation } = req.body;
            let op = await aiAny.operations.get({ operation: operation });
            res.json({ success: true, operation: op });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Endpoint to chat
    app.post('/api/rag/search', async (req, res) => {
        try {
            const { ragStoreName, query } = req.body;
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: `${query} \n\nDO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself. IMPORTANT: When citing information from the document, you MUST include inline citations in the format [1], [2], etc. Do not hallucinate references.`,
                config: {
                    tools: [{ fileSearch: { fileSearchStoreNames: [ragStoreName] } }]
                }
            });
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            res.json({ text: response.text || "", groundingChunks });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Endpoint to generate example questions
    app.post('/api/rag/questions', async (req, res) => {
        try {
            const { ragStoreName, language } = req.body;
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: `Figure out for what product each manual is for. DO NOT GUESS. Generate 4 short practical example questions a user might ask. Return as JSON array: [{"product": "Product A", "questions": ["q1", "q2", "q3", "q4"]}]. Provide questions translated in ${language || 'English'}. DO NOT translate JSON keys.`,
                config: {
                    tools: [{ fileSearch: { fileSearchStoreNames: [ragStoreName] } }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                product: { type: "STRING" },
                                questions: { type: "ARRAY", items: { type: "STRING" } }
                            },
                            required: ["product", "questions"]
                        }
                    }
                }
            });
            let parsedText = null;
            let resText = response.text || "[]";
            
            // Strip markdown code blocks
            if (resText.includes("```json")) {
                resText = resText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
            } else if (resText.includes("```")) {
                resText = resText.replace(/```\n?/g, "");
            }

            try {
                parsedText = JSON.parse(resText);
            } catch (parseError: any) {
                console.error("JSON parse error in questions:", parseError.message);
                const clean = resText.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
                parsedText = JSON.parse(clean);
            }
            res.json({ result: parsedText });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Endpoint to analyze document
    app.post('/api/rag/analyze', async (req, res) => {
        try {
            const { ragStoreName, language } = req.body;
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: `Analyze the document and generate a JSON report with this exact structure: {"summary": "Brief executive summary", "insights": ["Actionable takeaway 1", "Actionable takeaway 2", "Actionable takeaway 3", "Actionable takeaway 4"], "keyTerms": [{"term": "Term", "definition": "Definition"}], "faqs": [{"question": "Q?", "answer": "A"}], "quiz": [{"question": "Q?", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}]}. Generate exactly 4 keyTerms, 3 faqs, and 3 quiz questions based on the document. Translate values to ${language || 'English'}. DO NOT translate JSON keys.`,
                config: {
                    tools: [{ fileSearch: { fileSearchStoreNames: [ragStoreName] } }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            summary: { type: "STRING" },
                            insights: { type: "ARRAY", items: { type: "STRING" } },
                            keyTerms: { type: "ARRAY", items: { type: "OBJECT", properties: { term: { type: "STRING" }, definition: { type: "STRING" } }, required: ["term", "definition"] } },
                            faqs: { type: "ARRAY", items: { type: "OBJECT", properties: { question: { type: "STRING" }, answer: { type: "STRING" } }, required: ["question", "answer"] } },
                            quiz: { type: "ARRAY", items: { type: "OBJECT", properties: { question: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, correctAnswerIndex: { type: "INTEGER" } }, required: ["question", "options", "correctAnswerIndex"] } }
                        },
                        required: ["summary", "insights", "keyTerms", "faqs", "quiz"]
                    }
                }
            });
            let parsedText = null;
            let resText = response.text || "{}";
            
            // Strip markdown code blocks
            if (resText.includes("```json")) {
                resText = resText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
            } else if (resText.includes("```")) {
                resText = resText.replace(/```\n?/g, "");
            }

            try {
                parsedText = JSON.parse(resText);
            } catch (parseError: any) {
                console.error("JSON parse error in analyze:", parseError.message);
                const clean = resText.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
                parsedText = JSON.parse(clean);
            }
            res.json({ result: parsedText });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Endpoint to delete rag store
    app.post('/api/rag/delete', async (req, res) => {
        try {
            const { ragStoreName } = req.body;
            await aiAny.fileSearchStores.delete({ name: ragStoreName, config: { force: true } });
            res.json({ success: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

// Vite middleware for development
if (!isVercel) {
    (async () => {
        if (process.env.NODE_ENV !== "production") {
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: "spa",
            });
            app.use(vite.middlewares);
        } else {
            const distPath = path.join(process.cwd(), 'dist');
            app.use(express.static(distPath));
            app.get('*', (req, res) => {
                res.sendFile(path.join(distPath, 'index.html'));
            });
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })();
}

export default app;
