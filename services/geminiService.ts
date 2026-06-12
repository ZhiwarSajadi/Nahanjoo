/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { QueryResult } from '../types';

export function initialize() {
    // No-op for server-side auth
}

export async function createRagStore(displayName: string): Promise<string> {
    const res = await fetch('/api/rag/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
    });
    if (!res.ok) {
        const errText = await res.text();
        console.error("createRagStore output:", errText);
        let cleanMsg = errText;
        try {
            const parsed = JSON.parse(errText);
            if (parsed.error && parsed.error.message) {
                cleanMsg = parsed.error.message;
            } else if (parsed.error && typeof parsed.error === 'string') {
                const innerParsed = JSON.parse(parsed.error);
                if (innerParsed.error && innerParsed.error.message) {
                    cleanMsg = innerParsed.error.message;
                }
            }
        } catch(e) {}
        throw new Error(`Failed to create index: ${cleanMsg}`);
    }
    const data = await res.json();
    return data.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('ragStoreName', ragStoreName);
    formData.append('file', file);

    const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData
    });
    if (!res.ok) {
        const text = await res.text();
        let cleanMsg = text;
        try {
            const parsed = JSON.parse(text);
            if (parsed.error && parsed.error.message) {
                cleanMsg = parsed.error.message;
            } else if (parsed.error && typeof parsed.error === 'string') {
                const innerParsed = JSON.parse(parsed.error);
                if (innerParsed.error && innerParsed.error.message) {
                    cleanMsg = innerParsed.error.message;
                }
            }
        } catch(e) {}
        throw new Error(`Failed to upload file: ${cleanMsg}`);
    }
    
    const data = await res.json();
    let op = data.operation;
    
    let attempts = 0;
    while (op && !op.done && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const checkRes = await fetch('/api/rag/check-operation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: op.name || op })
        });
        if (!checkRes.ok) {
            let errorText = await checkRes.text().catch(() => 'Unknown error text');
            throw new Error(`Failed to check operation status: ${checkRes.status} ${checkRes.statusText} - ${errorText}`);
        }
        const checkData = await checkRes.json();
        op = checkData.operation;
        attempts++;
    }
    
    if (op && op.error) {
        throw new Error(`Upload operation failed: ${op.error.message || 'Unknown error'}`);
    }
}

export async function fileSearch(ragStoreName: string, query: string): Promise<QueryResult> {
    const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragStoreName, query })
    });
    if (!res.ok) {
        const errText = await res.text();
        let cleanMsg = errText;
        try {
            const parsed = JSON.parse(errText);
            if (parsed.error && parsed.error.message) {
                cleanMsg = parsed.error.message;
            } else if (parsed.error && typeof parsed.error === 'string') {
                const innerParsed = JSON.parse(parsed.error);
                if (innerParsed.error && innerParsed.error.message) {
                    cleanMsg = innerParsed.error.message;
                }
            }
        } catch(e) {}
        throw new Error(cleanMsg);
    }
    return await res.json();
}

export async function generateExampleQuestions(ragStoreName: string, language: string = 'English'): Promise<string[]> {
    try {
        const res = await fetch('/api/rag/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ragStoreName, language })
        });
        if (!res.ok) return [];
        const data = await res.json();
        const parsedData = data.result;
        
        if (Array.isArray(parsedData)) {
            if (parsedData.length === 0) return [];
            const firstItem = parsedData[0];
            if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
                return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
            }
            if (typeof firstItem === 'string') return parsedData.filter(q => typeof q === 'string');
        }
        return [];
    } catch (e: any) {
        if (e.message && e.message.includes("Unexpected token '<'")) {
            console.error("generateExampleQuestions: Server returned HTML instead of JSON.");
        } else {
            console.error("generateExampleQuestions error:", e.message || e);
        }
        return [];
    }
}

    export async function deleteRagStore(ragStoreName: string): Promise<void> {
        await fetch('/api/rag/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ragStoreName }),
            keepalive: true
        });
    }

    export async function generateDocumentAnalysis(ragStoreName: string, language: string = 'English'): Promise<any> {
        try {
            const res = await fetch('/api/rag/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ragStoreName, language })
            });
            if (!res.ok) {
                const errText = await res.text();
                let cleanMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && typeof parsed.error === 'string') {
                        const innerParsed = JSON.parse(parsed.error);
                        if (innerParsed.error && innerParsed.error.message) {
                            cleanMsg = innerParsed.error.message;
                        } else if (innerParsed.error) {
                            cleanMsg = innerParsed.error.toString();
                        }
                    } else if (parsed.error && parsed.error.message) {
                        cleanMsg = parsed.error.message;
                    }
                } catch(e) {}
                throw new Error(`${cleanMsg}`);
            }
            const data = await res.json();
            return data.result;
        } catch (error: any) {
            console.error("generateDocumentAnalysis error:", error.message || error);
            return null;
        }
    }