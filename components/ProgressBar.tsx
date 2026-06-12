/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'motion/react';
import { Database, Cpu, Sparkles, FileSearch, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  total: number;
  message: string;
  fileName?: string;
  language?: string;
  uiLanguage?: 'english' | 'persian';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, total, message, fileName, language, uiLanguage = 'english' }) => {
  const MathRoundPct = total > 0 ? (progress / total) * 100 : 0;
  const percentage = MathRoundPct;
  const isFarsi = uiLanguage === 'persian';

  const getTranslatedMessage = (msg: string) => {
    if (!isFarsi) return msg;
    if (msg === "Creating document index...") return "در حال ایجاد پایگاه داده برداری...";
    if (msg === "Generating embeddings...") return "در حال ایجاد تعبیه‌های برداری...";
    if (msg === "Generating suggestions...") return "در حال تولید پیشنهادات...";
    if (msg === "Analyzing document & generating insights...") return "در حال تحلیل سند و استخراج بینش‌ها...";
    if (msg === "All set!") return "آماده شد!";
    return msg;
  };

  const getIcon = (msg: string) => {
    switch (msg) {
        case "Creating document index...":
            return (
                <motion.div
                    animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="flex items-center justify-center w-24 h-24 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-8"
                >
                    <Database className="w-12 h-12" />
                </motion.div>
            );
        case "Generating embeddings...":
            return (
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="flex items-center justify-center w-24 h-24 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 mb-8"
                >
                    <Cpu className="w-12 h-12" />
                </motion.div>
            );
        case "Generating suggestions...":
            return (
                <motion.div
                    animate={{ rotate: 180, scale: [0.9, 1.2, 0.9] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="flex items-center justify-center w-24 h-24 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 mb-8"
                >
                    <Sparkles className="w-12 h-12" />
                </motion.div>
            );
        case "Analyzing document & generating insights...":
            return (
                <motion.div
                    animate={{ x: [-5, 5, -5], y: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="flex items-center justify-center w-24 h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 mb-8"
                >
                    <FileSearch className="w-12 h-12" />
                </motion.div>
            );
        case "All set!":
            return (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-8"
                >
                    <CheckCircle2 className="w-16 h-16" />
                </motion.div>
            );
        default:
            return (
                <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center justify-center w-24 h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-8"
                >
                    <Database className="w-12 h-12" />
                </motion.div>
            );
    }
  };

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full p-4 text-center"
    >
        {getIcon(message)}
        
        <motion.h2 
            key={message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-2xl font-bold mb-2 text-neutral-800 dark:text-neutral-100 ${isFarsi ? 'font-mono' : ''}`}
            dir={isFarsi ? "rtl" : "ltr"}
        >
            {getTranslatedMessage(message)}
        </motion.h2>

        {fileName && (
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-8 h-6 truncate max-w-full px-4" title={fileName}>
                {fileName}
            </p>
        )}

        <div className="w-full max-w-md bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner relative">
            <motion.div
                className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ 
                    backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                    backgroundSize: '1rem 1rem'
                }}
            />
        </div>
        
        <div className="mt-4 flex items-center justify-between w-full max-w-md px-2">
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                {isFarsi ? 'پیشرفت' : 'Progress'}
            </span>
            <span className="text-xs font-mono font-bold text-blue-500">
                {Math.round(percentage)}%
            </span>
        </div>
    </motion.div>
  );
};

export default ProgressBar;