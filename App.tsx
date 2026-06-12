/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './firebaseSetup';
import { AppStatus, ChatMessage, DocumentAnalysis } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import ChatInterface from './components/ChatInterface';
import HeroSection from './components/HeroSection';
import GlobalFooter from './components/GlobalFooter';
import UserDashboard from './components/UserDashboard';
import { logActivity, updateActivityLogAnalysisData } from './services/activityService';
import { Analytics } from '@vercel/analytics/react';

// DO: Define the AIStudio interface to resolve a type conflict where `window.aistudio` was being redeclared with an anonymous type.
// FIX: Moved the AIStudio interface definition inside the `declare global` block to resolve a TypeScript type conflict.
declare global {
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

const App: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const [uiLanguage, setUiLanguage] = useState<'english' | 'persian'>(() => {
        const saved = localStorage.getItem('uiLanguage');
        if (saved === 'english' || saved === 'persian') return saved;
        return 'english';
    });

    useEffect(() => {
        localStorage.setItem('uiLanguage', uiLanguage);
        if (uiLanguage === 'persian') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }, [uiLanguage]);

    const toggleUiLanguage = () => {
        setUiLanguage(prev => prev === 'english' ? 'persian' : 'english');
    };

    const [currentView, setCurrentView] = useState<'hero' | 'rag' | 'dashboard'>('hero');

    const [status, setStatus] = useState<AppStatus>(AppStatus.Initializing);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, message?: string, fileName?: string } | null>(null);
    const [activeRagStoreName, setActiveRagStoreName] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
    const [documentName, setDocumentName] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [analysisLanguage, setAnalysisLanguage] = useState<string>('English');
    const [currentAnalysisLogId, setCurrentAnalysisLogId] = useState<string | null>(null);
    const ragStoreNameRef = useRef(activeRagStoreName);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLoginWithGoogle = async () => {
        try {
            await loginWithGoogle();
            await logActivity('LOGIN', 'Signed in with Google');
        } catch (error: any) {
            if (error.code === 'auth/popup-blocked') {
                alert('Sign-in popup was blocked. Please open this app in a new tab (using the button in the top right) to sign in, or allow popups in your browser.');
            } else if (
                error.code === 'auth/popup-closed-by-user' || 
                error.code === 'auth/cancelled-popup-request' ||
                error.code === 'auth/network-request-failed' ||
                error.message?.includes('INTERNAL ASSERTION FAILED') ||
                error.message?.includes('Pending promise was never set')
            ) {
                // Ignore common unproblematic errors or user cancellations
                console.warn('Sign in was cancelled or interrupted:', error.code || error.message);
            } else {
                console.error('Login error:', error);
                alert(`Error signing in: ${error.message}`);
            }
        }
    };

    useEffect(() => {
        ragStoreNameRef.current = activeRagStoreName;
    }, [activeRagStoreName]);
    
    useEffect(() => {
        const handleUnload = () => {
            if (ragStoreNameRef.current) {
                geminiService.deleteRagStore(ragStoreNameRef.current)
                    .catch(err => console.error("Error deleting RAG store on unload:", err));
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);


    const handleError = (message: string, err: any) => {
        console.error(message, err);
        setError(`${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`);
        setStatus(AppStatus.Error);
    };

    const clearError = () => {
        setError(null);
        setStatus(AppStatus.Welcome);
    }

    useEffect(() => {
        setStatus(AppStatus.Welcome);
    }, []);

    const handleUploadAndStartChat = async () => {
        if (!user) {
            setApiKeyError("Please log in first.");
            throw new Error("User required.");
        }
        if (files.length === 0) return;
        
        setApiKeyError(null);

        try {
            geminiService.initialize();
        } catch (err) {
            handleError("Initialization failed. Please select a valid API Key.", err);
            throw err;
        }
        
        setStatus(AppStatus.Uploading);
        const totalSteps = files.length + 3;
        setUploadProgress({ current: 0, total: totalSteps, message: "Creating document index..." });

        try {
            const storeName = `chat-session-${Date.now()}`;
            const ragStoreName = await geminiService.createRagStore(storeName);
            
            setUploadProgress({ current: 1, total: totalSteps, message: "Generating embeddings..." });

            for (let i = 0; i < files.length; i++) {
                setUploadProgress(prev => ({ 
                    ...(prev!),
                    current: i + 1,
                    message: "Generating embeddings...",
                    fileName: `(${i + 1}/${files.length}) ${files[i].name}`
                }));
                await geminiService.uploadToRagStore(ragStoreName, files[i]);
            }
            
            setUploadProgress({ current: files.length + 1, total: totalSteps, message: "Generating suggestions...", fileName: "" });
            const questions = await geminiService.generateExampleQuestions(ragStoreName, analysisLanguage);
            setExampleQuestions(questions);

            setUploadProgress({ current: files.length + 2, total: totalSteps, message: "Analyzing document & generating insights...", fileName: "" });
            const analysis = await geminiService.generateDocumentAnalysis(ragStoreName, analysisLanguage);
            setDocumentAnalysis(analysis);

            setUploadProgress({ current: totalSteps, total: totalSteps, message: "All set!", fileName: "" });
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay to show "All set!"

            let docName = '';
            if (files.length === 1) {
                docName = files[0].name;
            } else if (files.length === 2) {
                docName = `${files[0].name} & ${files[1].name}`;
            } else {
                docName = `${files.length} documents`;
            }
            setDocumentName(docName);
            
            const initialAnalysis = { ...analysis, history: [] };
            const logId = await logActivity('ANALYSIS', `Analyzed: ${docName}`, initialAnalysis);
            setCurrentAnalysisLogId(logId);

            setActiveRagStoreName(ragStoreName);
            setChatHistory([]);
            setStatus(AppStatus.Chatting);
            setFiles([]); // Clear files on success
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            if (errorMessage.includes('api key not valid') || errorMessage.includes('requested entity was not found')) {
                setApiKeyError("The selected API key is invalid. Please select a different one and try again.");
                setStatus(AppStatus.Welcome);
            } else {
                handleError("Failed to start chat session", err);
            }
            throw err;
        } finally {
            setUploadProgress(null);
        }
    };

    const handleEndChat = () => {
        if (activeRagStoreName) {
            geminiService.deleteRagStore(activeRagStoreName).catch(err => {
                console.error("Failed to delete RAG store in background", err);
            });
        }
        setActiveRagStoreName(null);
        setChatHistory([]);
        setExampleQuestions([]);
        setDocumentName('');
        setFiles([]);
        setDocumentAnalysis(null);
        setCurrentAnalysisLogId(null);
        setStatus(AppStatus.Welcome);
    };

    const handleSendMessage = async (message: string) => {
        if (!activeRagStoreName) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        
        setChatHistory(prev => {
            const newHistory = [...prev, userMessage];
            // Save chat history
            if (currentAnalysisLogId && documentAnalysis) {
                updateActivityLogAnalysisData(currentAnalysisLogId, { ...documentAnalysis, history: newHistory }).catch(e => console.error("Failed to update log", e));
            }
            return newHistory;
        });

        setIsQueryLoading(true);

        try {
            const result = await geminiService.fileSearch(activeRagStoreName, message);
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: result.text }],
                groundingChunks: result.groundingChunks
            };
            
            setChatHistory(prev => {
                const newHistory = [...prev, modelMessage];
                // Save chat history
                if (currentAnalysisLogId && documentAnalysis) {
                    updateActivityLogAnalysisData(currentAnalysisLogId, { ...documentAnalysis, history: newHistory }).catch(e => console.error("Failed to update log", e));
                }
                return newHistory;
            });
        } catch (err: any) {
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: `An error occurred: ${err.message}` }]
            };
            setChatHistory(prev => {
                const newHistory = [...prev, errorMessage];
                // Save chat history
                if (currentAnalysisLogId && documentAnalysis) {
                    updateActivityLogAnalysisData(currentAnalysisLogId, { ...documentAnalysis, history: newHistory }).catch(e => console.error("Failed to update log", e));
                }
                return newHistory;
            });
            console.error("Failed to get response", err);
        } finally {
            setIsQueryLoading(false);
        }
    };
    
    const renderContent = () => {
        switch(status) {
            case AppStatus.Initializing:
                return (
                    <div className={`flex-1 flex items-center justify-center ${uiLanguage === 'persian' ? 'rtl flex-row-reverse' : ''}`}>
                        <Spinner /> <span className={`text-xl ${uiLanguage === 'persian' ? 'mr-4' : 'ml-4'}`}>{uiLanguage === 'persian' ? 'در حال راه‌اندازی...' : 'Initializing...'}</span>
                    </div>
                );
            case AppStatus.Welcome:
                  return <WelcomeScreen onUpload={handleUploadAndStartChat} apiKeyError={apiKeyError} files={files} setFiles={setFiles} theme={theme} toggleTheme={toggleTheme} language={analysisLanguage} setLanguage={setAnalysisLanguage} onBack={() => setCurrentView('hero')} uiLanguage={uiLanguage} toggleUiLanguage={toggleUiLanguage} onOpenDashboard={() => setCurrentView('dashboard')} user={user} />;
            case AppStatus.Uploading:
                return <ProgressBar 
                    progress={uploadProgress?.current || 0} 
                    total={uploadProgress?.total || 1} 
                    message={uploadProgress?.message || "Preparing your chat..."} 
                    fileName={uploadProgress?.fileName}
                    language={analysisLanguage}
                    uiLanguage={uiLanguage}
                />;
            case AppStatus.Chatting:
                return <ChatInterface 
                    documentName={documentName}
                    history={chatHistory}
                    isQueryLoading={isQueryLoading}
                    onSendMessage={handleSendMessage}
                    onNewChat={handleEndChat}
                    onClearHistory={() => setChatHistory([])}
                    exampleQuestions={exampleQuestions}
                    documentAnalysis={documentAnalysis}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onBackToHero={() => setCurrentView('hero')}
                    language={analysisLanguage}
                    uiLanguage={uiLanguage}
                    toggleUiLanguage={toggleUiLanguage}
                    onOpenDashboard={() => setCurrentView('dashboard')}
                    user={user}
                />;
            case AppStatus.Error:
                 return (
                    <div className={`flex-1 flex flex-col items-center justify-center bg-red-900/20 text-red-700 dark:text-red-300 ${uiLanguage === 'persian' ? 'rtl text-right' : ''}`}>
                        <h1 className="text-3xl font-bold mb-4">{uiLanguage === 'persian' ? 'خطای برنامه' : 'Application Error'}</h1>
                        <p className="max-w-md text-center mb-4" dir="ltr">{error}</p>
                        <button onClick={clearError} className="px-4 py-2 rounded-md bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors" title={uiLanguage === 'persian' ? 'بازگشت به صفحه خوش‌آمدگویی' : 'Return to the welcome screen'}>
                           {uiLanguage === 'persian' ? 'تلاش مجدد' : 'Try Again'}
                        </button>
                    </div>
                );
            default:
                 return <WelcomeScreen onUpload={handleUploadAndStartChat} apiKeyError={apiKeyError} files={files} setFiles={setFiles} theme={theme} toggleTheme={toggleTheme} language={analysisLanguage} setLanguage={setAnalysisLanguage} onBack={() => setCurrentView('hero')} uiLanguage={uiLanguage} toggleUiLanguage={toggleUiLanguage} onOpenDashboard={() => setCurrentView('dashboard')} user={user} />;
        }
    }

    return (
        <div className="font-sans antialiased text-neutral-900 dark:text-white h-[100dvh] flex flex-col overflow-hidden">
            <div className="flex-grow flex flex-col overflow-y-auto">
                {currentView === 'hero' ? (
                    <HeroSection 
                        onEnterLabs={() => setCurrentView('rag')}
                        onOpenDashboard={() => setCurrentView('dashboard')}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        user={user}
                        isAuthLoading={isAuthLoading}
                        loginWithGoogle={handleLoginWithGoogle}
                        logout={logout}
                        uiLanguage={uiLanguage}
                        toggleUiLanguage={toggleUiLanguage}
                    />
                ) : currentView === 'dashboard' && user ? (
                    <div className="flex-grow flex flex-col bg-neutral-50 dark:bg-neutral-900 selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-neutral-700 dark:selection:text-neutral-100">
                        <UserDashboard user={user} onBack={() => setCurrentView('hero')} uiLanguage={uiLanguage} logout={() => { logout(); setCurrentView('hero'); }} />
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col bg-neutral-50 dark:bg-neutral-900 bg-opacity-100 text-neutral-900 dark:text-neutral-100 selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-neutral-700 dark:selection:text-neutral-100">
                        {renderContent()}
                    </div>
                )}
            </div>
            <GlobalFooter uiLanguage={uiLanguage} />
            <Analytics />
        </div>
    );
};

export default App;
