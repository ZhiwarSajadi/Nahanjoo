/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import Spinner from './Spinner';
import { Sun, Moon, ArrowLeft, CloudUpload, FileText, UserCircle } from 'lucide-react';
import TrashIcon from './icons/TrashIcon';
import { User } from 'firebase/auth';

interface WelcomeScreenProps {
    onUpload: () => Promise<void>;
    apiKeyError: string | null;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    language: string;
    setLanguage: React.Dispatch<React.SetStateAction<string>>;
    onBack?: () => void;
    uiLanguage?: 'english' | 'persian';
    toggleUiLanguage?: () => void;
    onOpenDashboard?: () => void;
    user?: User | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onUpload, apiKeyError, files, setFiles, theme, toggleTheme, language, setLanguage, onBack, uiLanguage = 'english', toggleUiLanguage, onOpenDashboard, user }) => {
    const isFarsi = uiLanguage === 'persian';
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, [setFiles]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleConfirmUpload = async () => {
        try {
            await onUpload();
        } catch (error) {
            // Error is handled by the parent component, but we catch it here
            // to prevent an "uncaught promise rejection" warning in the console.
            console.error("Upload process failed:", error);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 relative ${isFarsi ? 'flex-row-reverse text-right' : ''}`}>
            <div className={`absolute top-4 ${isFarsi ? 'right-4' : 'left-4'} z-20`}>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-500 flex items-center justify-center"
                        title={isFarsi ? "بازگشت به خانه" : "Back to home"}
                    >
                        <ArrowLeft className={`w-5 h-5 ${isFarsi ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
            <div className={`absolute top-4 ${isFarsi ? 'left-4' : 'right-4'} z-20 flex gap-2`}>
                {user && onOpenDashboard && (
                    <button
                        onClick={onOpenDashboard}
                        className="p-3 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-500 flex items-center justify-center gap-2"
                        title={isFarsi ? 'داشبورد' : 'Dashboard'}
                    >
                        <UserCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold hidden sm:inline">{isFarsi ? 'داشبورد' : 'Dashboard'}</span>
                    </button>
                )}
                {toggleUiLanguage && (
                    <button
                        onClick={toggleUiLanguage}
                        className="p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-500 flex items-center justify-center"
                        title={isFarsi ? 'Switch to English' : 'تغییر به فارسی'}
                    >
                        <span className="text-xs font-bold font-mono tracking-wider">{isFarsi ? 'EN' : 'FA'}</span>
                    </button>
                )}
                <button
                    onClick={toggleTheme}
                    className="p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    title={theme === 'dark' ? (isFarsi ? 'تغییر به حالت روشن' : 'Switch to light mode') : (isFarsi ? 'تغییر به حالت تاریک' : 'Switch to dark mode')}
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>
            </div>
            <div className="w-full max-w-3xl text-center">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">{isFarsi ? 'با سند خود گفتگو کنید' : 'Chat With Your Document'}</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                    {isFarsi ? 'پشتیبانی شده توسط' : 'Powered by'} <strong className="font-semibold text-neutral-900 dark:text-neutral-100">FileSearch</strong>. {isFarsi ? 'یک سند آپلود کنید تا نهان‌جو را در حال کار ببینید.' : 'Upload a document to see Nahanjoo RAG in action.'}
                </p>

                <div className="w-full max-w-xl mx-auto mb-8">
                     {apiKeyError && <p className="text-red-500 text-sm mt-2">{apiKeyError}</p>}
                </div>

                <div 
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 mb-6 group overflow-hidden ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]' : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500/50'}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center relative z-10">
                        <motion.div
                            animate={{ 
                                y: isDragging ? -10 : 0,
                                scale: isDragging ? 1.1 : 1
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors'}`}
                        >
                            <CloudUpload className="w-10 h-10" />
                        </motion.div>
                        
                        <p className="mt-2 text-lg font-medium text-neutral-700 dark:text-neutral-200">
                            {isDragging ? (isFarsi ? "فایل‌های خود را اینجا رها کنید!" : "Drop your files here!") : (isFarsi ? "اسناد خود را اینجا رها کنید" : "Drag & drop your documents")}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                            {isFarsi ? 'پشتیبانی از فرمت‌های PDF, .txt, .md' : 'Supports PDF, .txt, .md'}
                        </p>
                        
                        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md"/>
                         <label 
                            htmlFor="file-upload" 
                            className="cursor-pointer px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-semibold shadow-sm hover:translate-y-[-1px] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-neutral-500 active:translate-y-[1px]" 
                            title={isFarsi ? "انتخاب فایل از دستگاه شما" : "Select files from your device"}
                            tabIndex={0}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    (document.getElementById('file-upload') as HTMLInputElement)?.click();
                                }
                            }}
                         >
                            {isFarsi ? 'مرور فایل‌ها' : 'Browse Files'}
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="w-full max-w-xl mx-auto mb-6 text-left rtl:text-right">
                        <h4 className="font-semibold mb-2">{isFarsi ? `فایل‌های انتخاب شده (${files.length}):` : `Selected Files (${files.length}):`}</h4>
                        <ul className={`max-h-36 overflow-y-auto space-y-2 ${isFarsi ? 'pl-2' : 'pr-2'}`}>
                            {files.map((file, index) => (
                                <motion.li 
                                    initial={{ opacity: 0, x: isFarsi ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    key={`${file.name}-${index}`} 
                                    className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg flex justify-between items-center group shadow-sm hover:shadow transition-shadow"
                                >
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse overflow-hidden">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-md shrink-0">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="truncate font-medium flex-1 text-left rtl:text-right" title={file.name} dir="ltr">{file.name}</span>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 ml-4 rtl:ml-0 rtl:mr-4">
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-700/50 px-2 py-1 rounded-md" dir="ltr">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </span>
                                        <button 
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-3 rtl:ml-0 rtl:mr-3 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none"
                                            aria-label={isFarsi ? `حذف ${file.name}` : `Remove ${file.name}`}
                                            title={isFarsi ? "حذف این فایل" : "Remove this file"}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="w-full max-w-xl mx-auto mb-6 text-left rtl:text-right">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">{isFarsi ? 'زبان نتایج تحلیل' : 'Analysis Results Language'}</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-md p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                    >
                        <option value="English">English</option>
                        <option value="Persian/Farsi">Persian/Farsi</option>
                    </select>
                </div>
                
                <div className="w-full max-w-xl mx-auto">
                    {files.length > 0 && (
                        <button 
                            onClick={handleConfirmUpload}
                            className="w-full px-6 py-3 rounded-md bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold transition-colors disabled:bg-neutral-800/50 disabled:cursor-not-allowed"
                            title={isFarsi ? "شروع گفتگو با فایل‌های انتخاب شده" : "Start chat session with the selected files"}
                        >
                            {isFarsi ? 'آپلود و تحلیل' : 'Upload and Analyze'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
