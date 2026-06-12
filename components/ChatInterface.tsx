/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, DocumentAnalysis } from '../types';
import Spinner from './Spinner';
import { Sun, Moon, Download, ChevronDown, FileText, FileJson, Copy, Check, Volume2, VolumeX, Sparkles, Trash2, HelpCircle, ArrowLeft, UserCircle, Send as SendIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface ChatInterfaceProps {
    documentName: string;
    history: ChatMessage[];
    isQueryLoading: boolean;
    onSendMessage: (message: string) => void;
    onNewChat: () => void;
    onClearHistory?: () => void;
    exampleQuestions: string[];
    documentAnalysis?: DocumentAnalysis | null;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onBackToHero?: () => void;
    language: string;
    uiLanguage?: 'english' | 'persian';
    toggleUiLanguage?: () => void;
    onOpenDashboard?: () => void;
    user?: User | null;
}

const fallbackAnalysis: DocumentAnalysis = {
    summary: "Detailed analysis compilation complete. Nahanjoo parsed the document, established semantic indexing vectors, and generated structured insights.",
    insights: [
        "Document vectorized in the Nahanjoo fileSearchStore.",
        "Grounding metadata links established across chapters.",
        "Concepts compiled safely into key parameters.",
        "Interactive conversational mode active."
    ],
    keyTerms: [
        { term: "Semantic Retrieval", definition: "Matching queries based on meaning rather than string matching." },
        { term: "RAG Ingestion", definition: "Processing raw files into searchable chunks." },
        { term: "Embedding Store", definition: "A multidimensional vector repository created for files." },
        { term: "Context Grounding", definition: "Restricting output answers to factual elements parsed from files." }
    ],
    faqs: [
        { question: "How to use Nahanjoo Q&A?", answer: "Type any question in the input area. Nahanjoo searches the database of matched facts and synthesizes an answer." },
        { question: "Will Nahanjoo hallucinate?", answer: "Nahanjoo utilizes active context grounding to significantly minimize hallucinations by referencing real citations." },
        { question: "Can I review matched sources?", answer: "Yes! Every response contains source buttons. Click any button to view the exact text segment used." }
    ],
    quiz: [
        { question: "What technique is used to prevent answers from guessing facts?", options: ["Strict Context Grounding", "Random Speculation", "Web Crawling", "Keyword Counting"], correctAnswerIndex: 0 },
        { question: "What system manages the uploaded document vectors?", options: ["Nahanjoo Labs Vector Store", "Browser storage", "Plain text editor", "Static indexer"], correctAnswerIndex: 0 },
        { question: "How are semantic queries resolved?", options: ["By intent meaning", "Using exact alphabetical spelling only", "Ignoring words", "Through offline databases"], correctAnswerIndex: 0 }
    ]
};

const farsiFallbackAnalysis: DocumentAnalysis = {
    summary: "تجمیع و تحلیل دقیق با موفقیت انجام شد. نهان‌جو سند را پردازش کرده، بردارهای نشانه‌گذاری معنایی را در پایگاه داده ایجاد نموده و بینش‌های ساختاریافته تولید کرده است.",
    insights: [
        "سند در فایل‌های نهان‌جو پردازش و برداری شد.",
        "اتصالات فراداده پایه‌ای در بین فصل‌ها برقرار شد.",
        "مفاهیم به طور ایمن در پارامترهای کلیدی تجمیع شدند.",
        "حالت گفتگوی تعاملی فعال شد."
    ],
    keyTerms: [
        { term: "بازیابی معنایی", definition: "تطابق پرسش‌ها بر اساس درک معنی به جای تطابق رشته‌ای کلمات." },
        { term: "پردازش RAG", definition: "تبدیل فایل خام به بخش‌های قابل جستجو." },
        { term: "تعبیه‌ها", definition: "مخزن برداری ایجاد شده برای فایل‌ها." },
        { term: "پایه‌گذاری زمینه‌ای", definition: "محدود کردن پاسخ‌ها به حقایق واقعی از فایل‌ها." }
    ],
    faqs: [
        { question: "چگونه از نهان‌جو استفاده کنم؟", answer: "سوالت را بپرس! نهان‌جو در پایگاه داده جستجو می‌کند و پاسخ می‌دهد." },
        { question: "آیا نهان‌جو توهم می‌زند؟", answer: "خیر، با ارجاع به استنادات واقعی میزان اشتباهات را به حداقل می‌رساند." },
        { question: "می‌توانم منابع را ببینم؟", answer: "بله، با کلیک روی منابع می‌توانید مستقیماً متن را ببینید." }
    ],
    quiz: [
        { question: "برای جلوگیری از حدس زدن چه روشی استفاده می‌شود؟", options: ["پایه‌گذاری سخت‌گیرانه", "حدس تصادفی", "خزش وب", "کلمات کلیدی"], correctAnswerIndex: 0 },
        { question: "کجا ذخیره می‌شود؟", options: ["نهان‌جو لبز Vector Store", "مرورگر", "فایل", "ایندکس استاتیک"], correctAnswerIndex: 0 },
        { question: "پرسش‌ها چگونه حل می‌شوند؟", options: ["از طریق معنا و هدف", "فقط املای دقیق", "صرف نظر از متن", "آفلاین"], correctAnswerIndex: 0 }
    ]
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    documentName, 
    history, 
    isQueryLoading, 
    onSendMessage, 
    onNewChat, 
    onClearHistory, 
    exampleQuestions, 
    documentAnalysis, 
    theme, 
    toggleTheme,
    onBackToHero,
    language,
    uiLanguage,
    toggleUiLanguage,
    onOpenDashboard,
    user
}) => {
    const [query, setQuery] = useState('');
    const [currentSuggestion, setCurrentSuggestion] = useState('');
    const [modalContent, setModalContent] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedSource, setCopiedSource] = useState(false);

    const isRtl = ['Persian/Farsi', 'Kurdish', 'Arabic', 'Hebrew', 'Urdu'].includes(language);
    const contentDir = isRtl ? 'rtl' : 'ltr';
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const [hasFarsiVoice, setHasFarsiVoice] = useState<boolean>(true);

    // Nahanjoo Interactive Matrix states
    const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'analysis'>('chat');
    const [analysisTab, setAnalysisTab] = useState<'briefing' | 'glossary' | 'faq' | 'quiz'>('briefing');
    const [quizSelectedAnswers, setQuizSelectedAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

    const isAnalysisFarsi = language === 'Persian/Farsi';
    const isUiFarsi = uiLanguage === 'persian';
    const isFarsi = isUiFarsi; // Alias for the rest of UI components

    const analysis = {
        summary: documentAnalysis?.summary || (isAnalysisFarsi ? farsiFallbackAnalysis.summary : fallbackAnalysis.summary) || '',
        insights: documentAnalysis?.insights || (isAnalysisFarsi ? farsiFallbackAnalysis.insights : fallbackAnalysis.insights) || [],
        keyTerms: documentAnalysis?.keyTerms || (isAnalysisFarsi ? farsiFallbackAnalysis.keyTerms : fallbackAnalysis.keyTerms) || [],
        faqs: documentAnalysis?.faqs || (isAnalysisFarsi ? farsiFallbackAnalysis.faqs : fallbackAnalysis.faqs) || [],
        quiz: documentAnalysis?.quiz || (isAnalysisFarsi ? farsiFallbackAnalysis.quiz : fallbackAnalysis.quiz) || []
    };

    const matrixTitle = isFarsi ? "ماتریس بینش نهان‌جو™" : "Nahanjoo Insights Matrix™";
    const reportTitle = isFarsi ? "گزارش تحلیل پویا" : "Dynamic Analysis Report";
    const tabLabels = isFarsi ? ['خلاصه', 'واژه‌نامه', 'پرسش و پاسخ', 'آزمون'] : ['briefing', 'glossary', 'faq', 'quiz'];
    const tabMap: any = { 'briefing': 0, 'glossary': 1, 'faq': 2, 'quiz': 3 };

    const getAnalysisTxt = () => {
        let text = `=== ${matrixTitle} ===\n\n`;
        text += (isFarsi ? "خلاصه:\n" : "SUMMARY:\n") + analysis.summary + "\n\n";
        text += (isFarsi ? "ستون‌های کلیدی بینش:\n" : "INSIGHTS:\n") + analysis.insights.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n') + "\n\n";
        text += (isFarsi ? "واژه‌نامه:\n" : "KEY TERMS:\n") + analysis.keyTerms.map((k: any) => `- ${k.term}: ${k.definition}`).join('\n') + "\n\n";
        text += (isFarsi ? "پرسش و پاسخ:\n" : "FAQS:\n") + analysis.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') + "\n\n";
        text += (isFarsi ? "آزمون:\n" : "QUIZ:\n") + analysis.quiz.map((q: any, idx: number) => `Q${idx + 1}: ${q.question}\nOptions: ${q.options.join(', ')}\nAnswer: Option ${q.correctAnswerIndex + 1}`).join('\n\n') + "\n\n";
        return text;
    };

    const getAnalysisHtml = () => {
        let html = `<h2>${matrixTitle}</h2>`;
        html += `<h3>${isFarsi ? "خلاصه" : "SUMMARY"}</h3><p>${analysis.summary}</p>`;
        html += `<h3>${isFarsi ? "ستون‌های کلیدی بینش" : "INSIGHTS"}</h3><ol>${analysis.insights.map((i: string) => `<li>${i}</li>`).join('')}</ol>`;
        html += `<h3>${isFarsi ? "واژه‌نامه" : "KEY TERMS"}</h3><ul>${analysis.keyTerms.map((k: any) => `<li><strong>${k.term}:</strong> ${k.definition}</li>`).join('')}</ul>`;
        html += `<h3>${isFarsi ? "پرسش و پاسخ" : "FAQS"}</h3><ul>${analysis.faqs.map((f: any) => `<li><strong>Q:</strong> ${f.question}<br/><strong>A:</strong> ${f.answer}</li>`).join('')}</ul>`;
        html += `<h3>${isFarsi ? "آزمون" : "QUIZ"}</h3><ul>${analysis.quiz.map((q: any, idx: number) => `<li><strong>Q${idx + 1}:</strong> ${q.question}<br/>Options: ${q.options.join(', ')}<br/>Answer: Option ${q.correctAnswerIndex + 1}</li>`).join('')}</ul>`;
        html += `<hr/><br/>`;
        return html;
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
            const updateVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    setHasFarsiVoice(voices.some(v => v.lang.startsWith('fa')));
                }
            };
            updateVoices();
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }).catch(err => {
            console.error("Failed to copy text: ", err);
        });
    };

    const copySourceToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedSource(true);
            setTimeout(() => setCopiedSource(false), 2000);
        }).catch(err => {
            console.error("Failed to copy source: ", err);
        });
    };

    const toggleSpeech = (text: string, index: number) => {
        if (!synthRef.current) return;

        if (speakingMessageIndex === index) {
            synthRef.current.cancel();
            setSpeakingMessageIndex(null);
        } else {
            synthRef.current.cancel();
            const cleanText = text
                .replace(/<[^>]*>/g, '') 
                .replace(/\*\*|__/g, '') 
                .replace(/\*|_/g, '')    
                .replace(/`([^`]+)`/g, '$1') 
                .replace(/Source \d+/g, '')
                .replace(/\[\d+\]/g, ''); 

            const utterance = new SpeechSynthesisUtterance(cleanText);
            if (['Persian/Farsi', 'Farsi', 'Persian'].includes(language)) {
                utterance.lang = 'fa-IR';
            }
            utteranceRef.current = utterance;
            
            utterance.onend = () => {
                setSpeakingMessageIndex(null);
            };
            utterance.onerror = () => {
                setSpeakingMessageIndex(null);
            };

            setSpeakingMessageIndex(index);
            synthRef.current.speak(utterance);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        };
        const handleCitationClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const citation = target.closest('.citation-link');
            if (citation) {
                const sourceIndex = parseInt(citation.getAttribute('data-source-index') || '0', 10);
                const msgIndex = parseInt(citation.getAttribute('data-message-index') || '-1', 10);
                if (sourceIndex > 0 && msgIndex >= 0) {
                    const msg = history[msgIndex];
                    if (msg && msg.groundingChunks && msg.groundingChunks[sourceIndex - 1]) {
                        const chunk = msg.groundingChunks[sourceIndex - 1];
                        if (chunk.retrievedContext?.text) {
                            handleSourceClick(chunk.retrievedContext.text);
                        }
                    }
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('click', handleCitationClick);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('click', handleCitationClick);
        };
    }, [history]);

    const exportToTxt = () => {
        const content = getAnalysisTxt() + "=== Conversational Chat ===\n\n" + history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Nahanjoo';
            const partsText = msg.parts.map(p => p.text).join('\n');
            return `${role}:\n${partsText}\n\n----------------------------------------\n`;
        }).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_history.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToWord = () => {
        const isRtl = /[\u0600-\u06FF]/.test(history[history.length - 1]?.parts[0]?.text || '');
        const content = history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Nahanjoo';
            const partsText = msg.parts.map(p => p.text).join('<br/>').replace(/\n/g, '<br/>');
            return `<p style="font-weight: bold; margin-top: 1em; color: #4b5563;">${role}:</p><p style="margin-left: 1em;">${partsText}</p>`;
        }).join('');
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Export</title></head>
            <body dir="${isRtl ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; font-size: 14px;">
                <h1 style="font-size: 20px;">Chat History: ${documentName}</h1>
                ${getAnalysisHtml()}
                <h2>Conversational Chat</h2>
                ${content}
            </body></html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_history.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToPdf = () => {
        const isRtl = /[\u0600-\u06FF]/.test(history[history.length - 1]?.parts[0]?.text || '');
        let htmlContent = history.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Nahanjoo';
            return `<div style="margin-bottom: 20px;">
                        <strong style="color: #4b5563;">${role}</strong>
                        <div style="margin-top: 5px;">${msg.parts.map(p => p.text.replace(/\n/g, '<br/>')).join('<br/>')}</div>
                    </div>`;
        }).join('');
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Chat History</title>
                        <style>
                            body { font-family: sans-serif; line-height: 1.5; padding: 20px; color: #111; direction: ${isRtl ? 'rtl' : 'ltr'}; }
                            h1 { border-bottom: 1px solid #ccc; padding-bottom: 10px; font-size: 20px; }
                        </style>
                    </head>
                    <body>
                        <h1>Chat History: ${documentName}</h1>
                        ${getAnalysisHtml()}
                        <h2>Conversational Chat</h2>
                        ${htmlContent}
                        <script>
                            window.onload = () => { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const exportToJson = () => {
        const exportData = {
            documentName,
            exportedAt: new Date().toISOString(),
            insightsMatrix: analysis,
            history: history.map(msg => ({
                role: msg.role,
                message: msg.parts.map(p => p.text).join('\n'),
                groundingChunks: msg.groundingChunks || []
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_history.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (exampleQuestions.length === 0) {
            setCurrentSuggestion('');
            return;
        }

        setCurrentSuggestion(exampleQuestions[0]);
        let suggestionIndex = 0;
        const intervalId = setInterval(() => {
            suggestionIndex = (suggestionIndex + 1) % exampleQuestions.length;
            setCurrentSuggestion(exampleQuestions[suggestionIndex]);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [exampleQuestions]);
    
    const renderMarkdown = (text: string, messageIndex?: number) => {
        if (!text) return { __html: '' };

        const lines = text.split('\n');
        let html = '';
        let listType: 'ul' | 'ol' | null = null;
        let paraBuffer = '';

        function flushPara() {
            if (paraBuffer) {
                html += `<p class="my-2" dir="auto" style="unicode-bidi: isolate;">${paraBuffer}</p>`;
                paraBuffer = '';
            }
        }

        function flushList() {
            if (listType) {
                html += `</${listType}>`;
                listType = null;
            }
        }

        for (const rawLine of lines) {
            const line = rawLine
                .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
                .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-neutral-200 dark:bg-neutral-700/50 px-1 py-0.5 rounded-sm font-mono text-sm" dir="ltr" style="unicode-bidi: isolate;">$1</code>')
                .replace(/\[(\d+)\]/g, (match, p1) => {
                    if (messageIndex === undefined) return `[${p1}]`;
                    return `<sup class="citation-link cursor-pointer bg-blue-500/20 hover:bg-blue-500/40 text-blue-600 dark:text-blue-400 font-mono px-1 rounded-sm mx-0.5 transition-colors" dir="ltr" style="unicode-bidi: isolate;" title="Source ${p1}" data-source-index="${p1}" data-message-index="${messageIndex}">[${p1}]</sup>`;
                });

            const isOl = line.match(/^\s*\d+\.\s(.*)/);
            const isUl = line.match(/^\s*[\*\-]\s(.*)/);

            if (isOl) {
                flushPara();
                if (listType !== 'ol') {
                    flushList();
                    html += '<ol class="list-decimal list-inside my-2 pl-5 space-y-1">';
                    listType = 'ol';
                }
                html += `<li dir="auto" style="unicode-bidi: isolate;">${isOl[1]}</li>`;
            } else if (isUl) {
                flushPara();
                if (listType !== 'ul') {
                    flushList();
                    html += '<ul class="list-disc list-inside my-2 pl-5 space-y-1">';
                    listType = 'ul';
                }
                html += `<li dir="auto" style="unicode-bidi: isolate;">${isUl[1]}</li>`;
            } else {
                flushList();
                if (line.trim() === '') {
                    flushPara();
                } else {
                    paraBuffer += (paraBuffer ? '<br/>' : '') + line;
                }
            }
        }

        flushPara();
        flushList();

        return { __html: html };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSendMessage(query);
            setQuery('');
        }
    };

    const handleSourceClick = (text: string) => {
        setModalContent(text);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isQueryLoading]);

    return (
        <div className="flex flex-col h-screen relative bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans overflow-hidden">
            
            {/* Unified Top Navigation Header */}
            <header className="h-16 px-4 border-b border-neutral-300 dark:border-neutral-700/40 bg-neutral-50 dark:bg-neutral-900/85 backdrop-blur-md flex justify-between items-center z-30 font-sans">
                <div className="flex items-center space-x-2 truncate">
                    {onBackToHero && (
                        <button
                            onClick={onBackToHero}
                            className="mr-2 p-1.5 text-neutral-900 dark:text-neutral-100/70 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/20 transition-all rounded-lg flex items-center justify-center border border-neutral-300 dark:border-neutral-700/35"
                            title="Return to Mainframe Landing Page"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 animate-pulse" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-blue-500/80 font-mono hidden sm:inline">Nahanjoo Labs</span>
                    <span className="text-neutral-900 dark:text-neutral-100/40 hidden sm:inline">|</span>
                    <h1 className="text-sm sm:text-base font-bold truncate text-neutral-900 dark:text-neutral-100" title={`Analyzing: ${documentName}`}>
                        Analyzing: {documentName}
                    </h1>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {user && onOpenDashboard && (
                        <button
                            onClick={onOpenDashboard}
                            className="p-1.5 px-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/30 transition-colors rounded-full flex items-center justify-center shadow-sm text-xs font-semibold gap-1.5"
                            title={isUiFarsi ? 'داشبورد' : 'Dashboard'}
                        >
                            <UserCircle className="w-4 h-4 text-blue-500" />
                            <span className="hidden sm:inline">{isUiFarsi ? 'داشبورد' : 'Dashboard'}</span>
                        </button>
                    )}
                    {toggleUiLanguage && (
                        <button
                            onClick={toggleUiLanguage}
                            className="p-1.5 border border-neutral-300 dark:border-neutral-700/50 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/30 transition-colors rounded-full flex items-center justify-center shadow-sm w-7 h-7"
                            title={isUiFarsi ? 'Switch to English' : 'تغییر به فارسی'}
                        >
                            <span className="text-[10px] font-bold font-mono tracking-wider">{isUiFarsi ? 'EN' : 'FA'}</span>
                        </button>
                    )}
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700/50 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/30 transition-colors rounded-full flex items-center justify-center shadow-sm w-7 h-7"
                        title={theme === 'dark' ? (isUiFarsi ? 'تغییر به حالت روشن' : 'Switch to light mode') : (isUiFarsi ? 'تغییر به حالت تاریک' : 'Switch to dark mode')}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                    </button>
                    
                    <div className="relative text-left" ref={dropdownRef}>
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="flex items-center px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/20 rounded-full transition-all text-xs font-semibold shadow-sm"
                            title={isUiFarsi ? "خروجی تحلیل و مکالمات" : "Export analysis and conversation log"}
                        >
                            <Download className="w-3.5 h-3.5 text-blue-500" />
                            <span className={`hidden md:inline ${isUiFarsi ? 'mr-1.5' : 'ml-1.5'}`}>{isUiFarsi ? 'خروجی' : 'Export'}</span>
                            <ChevronDown className={`w-2.5 h-2.5 opacity-70 ${isUiFarsi ? 'mr-1' : 'ml-1'}`} />
                        </button>
                        {isExportOpen && (
                            <div className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                <div className="py-1 rtl:text-right">
                                    <button
                                        onClick={() => {
                                            exportToTxt();
                                            setIsExportOpen(false);
                                        }}
                                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                    >
                                        <FileText className={`w-4 h-4 text-blue-500 shrink-0 ${isUiFarsi ? 'ml-2' : 'mr-2'}`} />
                                        {isUiFarsi ? "خروجی متن (TXT)" : "Export as TXT"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            exportToPdf();
                                            setIsExportOpen(false);
                                        }}
                                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                    >
                                        <FileText className={`w-4 h-4 text-red-500 shrink-0 ${isUiFarsi ? 'ml-2' : 'mr-2'}`} />
                                        {isUiFarsi ? "خروجی پی‌دی‌اف (PDF)" : "Export as PDF"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            exportToWord();
                                            setIsExportOpen(false);
                                        }}
                                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                    >
                                        <FileText className={`w-4 h-4 text-blue-700 shrink-0 ${isUiFarsi ? 'ml-2' : 'mr-2'}`} />
                                        {isUiFarsi ? "خروجی ورد (Word)" : "Export as Word"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            exportToJson();
                                            setIsExportOpen(false);
                                        }}
                                        className="w-full text-left rtl:text-right px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                    >
                                        <FileJson className={`w-4 h-4 text-emerald-500 shrink-0 ${isUiFarsi ? 'ml-2' : 'mr-2'}`} />
                                        {isUiFarsi ? "خروجی داده (JSON)" : "Export as JSON"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {onClearHistory && history.length > 0 && (
                        <button
                            onClick={onClearHistory}
                            className="flex items-center px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full transition-colors font-semibold text-xs flex-shrink-0"
                            title={isUiFarsi ? "پاک کردن گفتگو (محفوظ ماندن تحلیل‌ها)" : "Clear conversation but keep analysis"}
                        >
                            <Trash2 className={`w-3.5 h-3.5 ${isUiFarsi ? 'ml-1' : 'mr-1'}`} />
                            <span className="hidden md:inline">{isUiFarsi ? 'پاک کردن گفتگو' : 'Clear Chat'}</span>
                        </button>
                    )}

                    <button
                        onClick={onNewChat}
                        className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-colors text-xs font-bold flex-shrink-0"
                        title={isUiFarsi ? "شروع مجدد با اسناد جدید" : "Start over with new documents"}
                    >
                        <RefreshIcon />
                        <span className={`hidden sm:inline ${isUiFarsi ? 'mr-1.5' : 'ml-1.5'}`}>{isUiFarsi ? 'تغییر سند' : 'New Document'}</span>
                    </button>
                </div>
            </header>

            {/* Main Interactive Grid */}
            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* Mobile Tab Swapper */}
                <div className="lg:hidden flex border-b border-neutral-300 dark:border-neutral-700/30 bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm z-20 flex-shrink-0">
                    <button
                        onClick={() => setMobileActiveTab('chat')}
                        className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                            mobileActiveTab === 'chat' 
                                ? 'border-blue-500 text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-700/10' 
                                : 'border-transparent text-neutral-900 dark:text-neutral-100/50 hover:text-neutral-900 dark:text-neutral-100'
                        }`}
                    >
                        {isFarsi ? "💬 گفتگوی متنی" : "💬 Conversation Chat"}
                    </button>
                    <button
                        onClick={() => setMobileActiveTab('analysis')}
                        className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                            mobileActiveTab === 'analysis' 
                                ? 'border-blue-500 text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-700/10' 
                                : 'border-transparent text-neutral-900 dark:text-neutral-100/50 hover:text-neutral-900 dark:text-neutral-100'
                        }`}
                    >
                        {isFarsi ? "📊 ماتریس بینش نهان‌جو" : "📊 Nahanjoo Insights Matrix"}
                    </button>
                </div>

                {/* Left Side: Conversational Chat Interface (60% on Wide Screens) */}
                <div className={`flex-[1.3] flex flex-col overflow-hidden h-full ${
                    mobileActiveTab === 'chat' ? 'flex' : 'hidden lg:flex'
                }`}>
                    
                    {/* Messaging Stream container */}
                    <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-thin scroll-smooth">
                        <div className="max-w-2xl mx-auto space-y-6">
                            
                            {history.length === 0 && (
                                <div className="text-center py-10 px-5 bg-neutral-100/20 dark:bg-neutral-800/20 border border-neutral-300 dark:border-neutral-700/20 rounded-2xl max-w-md mx-auto my-8 space-y-3">
                                    <Sparkles className="w-8 h-8 text-blue-500 mx-auto animate-pulse" />
                                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Document Index Ready</h3>
                                    <p className="text-xs text-neutral-900 dark:text-neutral-100/60 leading-relaxed">
                                        Nahanjoo processed and mapped <strong>{documentName}</strong>. Type below to query or inspect terms in the side panel.
                                    </p>
                                </div>
                            )}

                            {history.map((message, index) => (
                                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative group max-w-[85%] px-5 py-4 rounded-3xl border shadow-sm ${
                                        message.role === 'user' 
                                        ? 'bg-blue-600 border-blue-600/60 text-white rounded-br-sm' 
                                        : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700/30 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
                                    }`}>
                                        <div dir={contentDir === 'rtl' && message.role === 'model' ? 'rtl' : 'auto'} className="text-sm leading-relaxed" dangerouslySetInnerHTML={renderMarkdown(message.parts[0].text, index)} />
                                        
                                        <div className={`flex items-center space-x-2 mt-2.5 pt-2.5 border-t justify-end ${
                                            message.role === 'user' ? 'border-white/10' : 'border-neutral-300 dark:border-neutral-700/45'
                                        }`}>
                                            <button
                                                onClick={() => copyToClipboard(message.parts[0].text, index)}
                                                className={`p-1 rounded transition-colors flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider opacity-60 group-hover:opacity-100 ${
                                                    message.role === 'user' 
                                                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                                                    : 'bg-neutral-200 dark:bg-neutral-700/30 hover:bg-neutral-200 dark:bg-neutral-700/60 text-neutral-900 dark:text-neutral-100'
                                                }`}
                                                title="Copy to clipboard"
                                            >
                                                {copiedIndex === index ? (
                                                    <>
                                                        <Check className="w-2.5 h-2.5 text-emerald-300" />
                                                        <span className="text-emerald-300">{isFarsi ? "کپی شد" : "Copied"}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-2.5 h-2.5" />
                                                        <span>{isFarsi ? "کپی" : "Copy"}</span>
                                                    </>
                                                )}
                                            </button>
                                            
                                            {message.role === 'model' && (!isFarsi || hasFarsiVoice) && (
                                                <button
                                                    onClick={() => toggleSpeech(message.parts[0].text, index)}
                                                    className="p-1 rounded bg-neutral-200 dark:bg-neutral-700/30 hover:bg-neutral-200 dark:bg-neutral-700/60 text-neutral-900 dark:text-neutral-100 transition-all flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider opacity-60 group-hover:opacity-100"
                                                    title={speakingMessageIndex === index ? (isFarsi ? "توقف پخش" : "Stop speaking") : (isFarsi ? "گوش دادن" : "Listen / TTS")}
                                                >
                                                    {speakingMessageIndex === index ? (
                                                        <>
                                                            <VolumeX className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                                                            <span className="text-red-400">{isFarsi ? "توقف" : "Stop"}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Volume2 className="w-2.5 h-2.5" />
                                                            <span>{isFarsi ? "گوش دادن" : "Listen"}</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {message.role === 'model' && message.groundingChunks && message.groundingChunks.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-neutral-300 dark:border-neutral-700/30">
                                                <div className="flex flex-wrap gap-1.5 justify-start items-center">
                                                    <FileText className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                                                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mr-1">{isFarsi ? "منابع:" : "Sources:"}</span>
                                                    {message.groundingChunks.map((chunk, chunkIndex) => (
                                                        chunk.retrievedContext?.text && (
                                                            <button
                                                                key={chunkIndex}
                                                                onClick={() => handleSourceClick(chunk.retrievedContext!.text!)}
                                                                className="bg-neutral-100 dark:bg-neutral-900/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 rounded-full transition-colors flex items-center space-x-1"
                                                                aria-label={`Show Citation Segment ${chunkIndex + 1}`}
                                                            >
                                                                <span>[{chunkIndex + 1}]</span>
                                                            </button>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isQueryLoading && (
                                <div className="flex justify-start">
                                    <div className={`max-w-lg px-4 py-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/10 flex items-center ${isUiFarsi ? 'flex-row-reverse text-right' : ''}`}>
                                        <Spinner />
                                        <span className={`text-xs text-neutral-900 dark:text-neutral-100/60 font-medium ${isUiFarsi ? 'mr-2.5' : 'ml-2.5'}`}>{isUiFarsi ? 'نهان‌جو در حال تدوین پاسخ است...' : 'Nahanjoo is formulating answer...'}</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    {/* Chat Form Container */}
                    <div className="p-4 border-t border-neutral-300 dark:border-neutral-700/25 bg-neutral-50 dark:bg-neutral-900/90 flex-shrink-0 z-10">
                        <div className="max-w-2xl mx-auto space-y-3">
                            
                            {!isQueryLoading && exampleQuestions && exampleQuestions.length > 0 && (
                                <div className={`overflow-x-auto pb-1 grid grid-flow-col auto-cols-max gap-2 scrollbar-none ${isUiFarsi ? 'rtl' : ''}`}>
                                    <span className="h-7 flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 rounded-full border border-emerald-500/20 self-center rtl:flex-row-reverse">
                                        <Sparkles className={`w-3 h-3 ${isUiFarsi ? 'ml-1.5' : 'mr-1.5'}`} />
                                        {isUiFarsi ? 'ایده‌ها' : 'Ideas'}
                                    </span>
                                    {exampleQuestions.slice(0, 4).map((item, idx) => (
                                        <button
                                            key={idx}
                                            dir={contentDir}
                                            type="button"
                                            onClick={() => setQuery(item)}
                                            className="text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700/35 hover:border-blue-500 hover:bg-neutral-200 dark:bg-neutral-700/20 h-7 px-3 rounded-full transition-all duration-150 outline-none select-none max-w-[200px] truncate"
                                            title={isUiFarsi ? `پرسش: "${item}"` : `Click to ask: "${item}"`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className={`flex gap-2 ${isUiFarsi ? 'flex-row-reverse' : ''}`}>
                                <input
                                    dir={contentDir === 'rtl' ? 'auto' : 'ltr'}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={isUiFarsi ? 'از نهان‌جو درباره سند بپرسید...' : 'Ask Nahanjoo a question about the document...'}
                                    className="flex-grow bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-700/40 rounded-full py-2.5 px-4 focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-900 dark:text-neutral-100/40"
                                    disabled={isQueryLoading}
                                />
                                <button 
                                    type="submit" 
                                    disabled={isQueryLoading || !query.trim()} 
                                    className={`p-2.5 h-10 w-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-full text-white disabled:bg-neutral-200 dark:bg-neutral-700/40 disabled:cursor-not-allowed transition-colors flex-shrink-0 ${isUiFarsi ? 'rotate-180' : ''}`} 
                                    title={isUiFarsi ? "ارسال پرسش به نهان‌جو" : "Submit question to Nahanjoo"}
                                >
                                    <SendIcon />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Side: Nahanjoo Document Insights matrix (40% on Wide Screens) */}
                <div className={`flex-1 border-l border-neutral-300 dark:border-neutral-700/25 flex flex-col h-full bg-neutral-100/10 dark:bg-neutral-800/10 overflow-hidden ${
                    mobileActiveTab === 'analysis' ? 'flex animate-fadeIn' : 'hidden lg:flex'
                } ${isUiFarsi ? 'rtl' : ''}`}>
                    
                    {/* Insights Navigation Header */}
                    <div className="p-4 border-b border-neutral-300 dark:border-neutral-700/20 bg-neutral-100/40 dark:bg-neutral-800/40 flex-shrink-0">
                        <div className={`flex items-center space-x-2 text-emerald-500 mb-1 ${isUiFarsi ? 'rtl:space-x-reverse' : ''}`}>
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">{reportTitle}</span>
                        </div>
                        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate mb-3">
                            {matrixTitle}
                        </h2>

                        {/* Interactive Tabs Selector */}
                        <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-300 dark:border-neutral-700/20">
                            {(['briefing', 'glossary', 'faq', 'quiz'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setAnalysisTab(tab)}
                                    className={`py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-colors capitalize ${
                                        analysisTab === tab 
                                            ? 'bg-blue-500 text-white shadow-md' 
                                            : 'text-neutral-900 dark:text-neutral-100/50 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/10'
                                    }`}
                                    title={tabLabels[tabMap[tab]]}
                                >
                                    {tabLabels[tabMap[tab]]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Contents Container */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 pb-20 scrollbar-thin">
                        
                        {analysisTab === 'briefing' && (
                            <div dir={contentDir} className="space-y-4 animate-fadeIn">
                                <div className="bg-neutral-100/30 dark:bg-neutral-800/30 border border-neutral-300 dark:border-neutral-700/20 rounded-xl p-4 space-y-2">
                                    <h3 className="text-xs uppercase tracking-wider font-bold text-blue-500">{isFarsi ? "خلاصه اجرایی نهان‌جو" : "Nahanjoo Executive Briefing"}</h3>
                                    <div 
                                        className="text-xs text-neutral-900 dark:text-neutral-100/85 leading-relaxed bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-lg border border-neutral-300 dark:border-neutral-700/10 space-y-1.5"
                                        dangerouslySetInnerHTML={renderMarkdown(analysis.summary)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xs uppercase tracking-wider font-bold text-emerald-500 pl-1">{isFarsi ? "ستون‌های کلیدی بینش" : "Primary Insight Pillars"}</h3>
                                    {analysis.insights.map((insight, idx) => (
                                        <div key={idx} className="flex gap-2.5 bg-neutral-100/15 dark:bg-neutral-800/15 border border-neutral-300 dark:border-neutral-700/10 p-3 rounded-xl hover:border-neutral-300 dark:border-neutral-700/25 transition-all">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-[10px]">
                                                {idx + 1}
                                            </div>
                                            <p className="text-xs text-neutral-900 dark:text-neutral-100/75 leading-relaxed self-center">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {analysisTab === 'glossary' && (
                            <div dir={contentDir} className="space-y-3 animate-fadeIn">
                                <h3 className="text-xs uppercase tracking-wider font-bold text-purple-400 pl-1">{isFarsi ? "واژه‌نامه و اصطلاحات کلیدی سند" : "Document Glossary & Core Terms"}</h3>
                                {analysis.keyTerms.map((item, idx) => (
                                    <div key={idx} className="bg-neutral-100/25 dark:bg-neutral-800/25 border border-neutral-300 dark:border-neutral-700/15 p-3.5 rounded-xl space-y-2 hover:border-purple-400/35 transition-all">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-[9px] uppercase font-bold text-purple-300 bg-purple-500/10 border border-purple-400/20 px-1.5 py-0.5 rounded">Metadata</span>
                                            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono truncate">{item.term}</h4>
                                        </div>
                                        <p className="text-xs text-neutral-900 dark:text-neutral-100/70 bg-neutral-50 dark:bg-neutral-900/30 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700/5 leading-relaxed">
                                            {item.definition}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {analysisTab === 'faq' && (
                            <div dir={contentDir} className="space-y-3 animate-fadeIn">
                                <h3 className="text-xs uppercase tracking-wider font-bold text-emerald-400 pl-1">{isFarsi ? "مجموعه پرسش و پاسخ‌های استخراج شده" : "Extracted FAQ Aggregator"}</h3>
                                {analysis.faqs.map((item, idx) => (
                                    <div key={idx} className="bg-neutral-100/25 dark:bg-neutral-800/25 border border-neutral-300 dark:border-neutral-700/15 rounded-xl overflow-hidden hover:border-emerald-400/35 transition-all">
                                        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/20 border-b border-neutral-300 dark:border-neutral-700/10 flex items-start gap-2">
                                            <span className="font-bold text-xs text-emerald-400 select-none font-mono">Q.</span>
                                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.question}</h4>
                                        </div>
                                        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 text-[11px] text-neutral-900 dark:text-neutral-100/75 leading-relaxed">
                                            {item.answer}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {analysisTab === 'quiz' && (
                            <div dir={contentDir} className="space-y-4 animate-fadeIn">
                                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="flex items-center space-x-1.5">
                                        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 font-mono">{isFarsi ? "آزمون ارزیابی دانش" : "Knowledge Retention Quiz"}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-900 dark:text-neutral-100 bg-blue-500 px-2.5 py-0.5 rounded-full font-mono">
                                        {isFarsi ? "امتیاز:" : "Score:"} {Object.keys(quizSubmitted).filter(idx => quizSelectedAnswers[Number(idx)] === analysis.quiz[Number(idx)].correctAnswerIndex).length} / {analysis.quiz.length}
                                    </span>
                                </div>

                                {analysis.quiz.map((q, idx) => {
                                    const selectedOption = quizSelectedAnswers[idx];
                                    const isSubmitted = quizSubmitted[idx];
                                    const isCorrect = selectedOption === q.correctAnswerIndex;

                                    return (
                                        <div key={idx} className="bg-neutral-100/20 dark:bg-neutral-800/20 border border-neutral-300 dark:border-neutral-700/15 p-3.5 rounded-xl space-y-3">
                                            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-relaxed">
                                                <span className="text-[10px] font-bold text-blue-500 font-mono mr-1.5 uppercase">Q{idx + 1}.</span>
                                                {q.question}
                                            </p>
                                            
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {q.options.map((opt, optIdx) => {
                                                    const isOptSelected = selectedOption === optIdx;
                                                    const isOptCorrect = optIdx === q.correctAnswerIndex;
                                                    
                                                    let optStyle = "bg-neutral-50 dark:bg-neutral-900/30 border-neutral-300 dark:border-neutral-700/20 text-neutral-900 dark:text-neutral-100/75 hover:bg-neutral-200 dark:bg-neutral-700/10";
                                                    if (isOptSelected) {
                                                        if (isSubmitted) {
                                                            optStyle = isCorrect ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-red-500/20 border-red-500/50 text-red-300";
                                                        } else {
                                                            optStyle = "bg-blue-500/15 border-blue-500 text-blue-500 font-semibold";
                                                        }
                                                    } else if (isSubmitted && isOptCorrect) {
                                                        optStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                                                    }

                                                    return (
                                                        <button
                                                            key={optIdx}
                                                            type="button"
                                                            disabled={isSubmitted}
                                                            onClick={() => {
                                                                setQuizSelectedAnswers(prev => ({ ...prev, [idx]: optIdx }));
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-[11px] rounded-lg border transition-all ${optStyle}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {!isSubmitted && selectedOption !== undefined && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setQuizSubmitted(prev => ({ ...prev, [idx]: true }));
                                                    }}
                                                    className="w-full py-1.5 bg-blue-500 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors shadow-sm"
                                                >
                                                    {isFarsi ? "ثبت پاسخ" : "Submit Answer"}
                                                </button>
                                            )}

                                            {isSubmitted && (
                                                <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                                                    {isCorrect ? (
                                                        <span className="text-emerald-400">{isFarsi ? "✓ عالی، صحیح است!" : "✓ Excellent, correct!"}</span>
                                                    ) : (
                                                        <span className="text-red-400">{isFarsi ? `✗ نادرست. پاسخ صحیح: ${q.options[q.correctAnswerIndex]}` : `✗ Incorrect. Fact: ${q.options[q.correctAnswerIndex]}`}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Citations Overlay Modal window */}
            {modalContent !== null && (
                <div 
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs" 
                    onClick={closeModal} 
                    role="dialog" 
                    aria-modal="true"
                    aria-labelledby="source-modal-title"
                >
                    <div className="bg-white dark:bg-neutral-800 shadow-2xl w-full max-w-lg rounded-xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-neutral-300 dark:border-neutral-700/20 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/20">
                            <h3 id="source-modal-title" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono">{isFarsi ? "منشأ استناد" : "Fact Citation Origin"}</h3>
                            <button
                                onClick={() => copySourceToClipboard(modalContent || '')}
                                className="flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider bg-neutral-200 dark:bg-neutral-700/30 hover:bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 py-1 px-2.5 rounded transition-all"
                            >
                                {copiedSource ? (
                                    <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">{isFarsi ? "کپی شد!" : "Copied!"}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        <span>{isFarsi ? "کپی متن" : "Copy text"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto px-5 py-4 text-xs text-neutral-900 dark:text-neutral-100/80 leading-relaxed scrollbar-thin">
                            <div dir={contentDir === 'rtl' ? 'rtl' : 'auto'} dangerouslySetInnerHTML={renderMarkdown(modalContent || '')} />
                        </div>
                        <div className="p-4 border-t border-neutral-300 dark:border-neutral-700/20 flex justify-end bg-neutral-50 dark:bg-neutral-900/25">
                            <button onClick={closeModal} className="px-5 py-1.5 rounded-full bg-blue-500 hover:bg-blue-500 font-bold text-xs uppercase tracking-wider text-white transition-colors">
                                {isFarsi ? "بستن" : "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
