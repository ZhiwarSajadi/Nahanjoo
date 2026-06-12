import React from 'react';
import { motion } from 'motion/react';

interface GlobalFooterProps {
    uiLanguage?: 'english' | 'persian';
}

const GlobalFooter: React.FC<GlobalFooterProps> = ({ uiLanguage = 'english' }) => {
    const isFarsi = uiLanguage === 'persian';
    return (
        <motion.footer 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="w-full py-4 px-6 text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 select-none bg-transparent relative z-40 mt-auto"
        >
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 opacity-80 hover:opacity-100 transition-opacity ${isFarsi ? 'flex-row-reverse' : ''}`}>
                <span>{isFarsi ? 'پشتیبانی شده توسط ' : 'Powered by '}<strong className="text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide">Google Gemini & Google AI Studio</strong></span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
                <span>
                    {isFarsi ? 'توسعه یافته توسط ' : 'Made by '}
                    <a 
                        href="https://github.com/ZhiwarSajadi" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 dark:text-emerald-400 hover:text-blue-500 dark:hover:text-emerald-300 underline underline-offset-4 decoration-2 transition-colors cursor-pointer ml-1 rtl:mr-1"
                    >
                        Zhiwar Sajadi
                    </a>
                </span>
            </div>
        </motion.footer>
    );
};

export default GlobalFooter;
