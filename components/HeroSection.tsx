/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, Sun, Moon, Languages } from 'lucide-react';

import { User } from 'firebase/auth';

interface HeroSectionProps {
    onEnterLabs: () => void;
    onOpenDashboard?: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    user: User | null;
    isAuthLoading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    uiLanguage?: 'english' | 'persian';
    toggleUiLanguage?: () => void;
}

// Custom Typewriter Hook as requested
export function useTypewriter(text: string, speed = 38, startDelay = 600) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        let index = 0;
        let intervalId: NodeJS.Timeout;
        setDisplayed('');
        setDone(false);
        
        const timeoutId = setTimeout(() => {
            intervalId = setInterval(() => {
                if (index < text.length) {
                    setDisplayed(text.substring(0, index + 1));
                    index++;
                } else {
                    setDone(true);
                    clearInterval(intervalId);
                }
            }, speed);
        }, startDelay);

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [text, speed, startDelay]);

    return { displayed, done };
}

const HeroSection: React.FC<HeroSectionProps> = ({ onEnterLabs, onOpenDashboard, theme, toggleTheme, user, isAuthLoading, loginWithGoogle, logout, uiLanguage = 'english', toggleUiLanguage }) => {
    const isFarsi = uiLanguage === 'persian';
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const prevXRef = useRef<number | null>(null);

    // Desktop Mouse Scrubbing Hook
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (window.innerWidth < 1024) return; // ignore on mobile/tablet
            const video = videoRef.current;
            if (!video || !video.duration) return;

            if (prevXRef.current === null) {
                prevXRef.current = e.clientX;
                return;
            }

            const delta = e.clientX - prevXRef.current;
            prevXRef.current = e.clientX;

            // Update target scrub time based on (delta / window.innerWidth) * 0.8 * video.duration
            const deltaPct = delta / window.innerWidth;
            const timeChange = deltaPct * 0.8 * video.duration;
            let targetTime = video.currentTime + timeChange;

            // Clamp targetTime between 0 and duration
            if (targetTime < 0) targetTime = 0;
            if (targetTime > video.duration) targetTime = video.duration;

            video.currentTime = targetTime;
        };

        const handleSeeked = () => {
            // Native seek tracking is handled smoothly via this listener
        };

        window.addEventListener('mousemove', handleMouseMove);
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener('seeked', handleSeeked);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (videoElement) {
                videoElement.removeEventListener('seeked', handleSeeked);
            }
        };
    }, []);

    // Mobile Autoplay Hook
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (window.innerWidth < 1024) {
            video.autoplay = true;
            video.loop = true;
            video.play().catch(() => {});
        }
    }, []);

    // Typewriter effect setup
    const typewriterText = isFarsi ? "به صورت هوشمند اسناد\nخود را تحلیل کنید." : "intelligently analyze\nyour documents.";
    const { displayed, done } = useTypewriter(typewriterText, 38, 600);

    const availableServices = [isFarsi ? "تحلیل اسناد" : "Document Analysis"];

    const [termsAgreed, setTermsAgreed] = useState(true);
    const [showTermsError, setShowTermsError] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const toggleService = (service: string) => {
        setSelectedServices(prev => 
            prev.includes(service)
                ? prev.filter(s => s !== service)
                : [...prev, service]
        );
    };

    const handleLoginClick = () => {
        if (!termsAgreed) {
            setShowTermsError(true);
            return;
        }
        setShowTermsError(false);
        loginWithGoogle();
    };

    return (
        <div className="relative w-full min-h-screen flex flex-col font-sans text-neutral-900 dark:text-white antialiased overflow-hidden selection:bg-[#EAECE9] selection:text-[#1C2E1E] dark:selection:bg-[#1C2E1E] dark:selection:text-[#EAECE9]">
            {/* Background Video Component - Fixed at the very back */}
            <div className="fixed inset-0 -z-10 pointer-events-none bg-white/50 dark:bg-neutral-900/50">
                <div className="absolute inset-0 z-10 bg-white/85 dark:bg-neutral-900/90 transition-colors duration-300" />
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    preload="auto"
                    loop
                    controls={false}
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4"
                    className="w-full h-full object-cover object-[75%_center] xs:object-[70%_center] md:object-[65%_center] lg:object-[80%_center]"
                />
            </div>

            {/* Interactive Navbar */}
            <header className="relative z-50 px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center w-full max-w-7xl mx-auto">
                {/* Logo left */}
                <div className="flex items-center gap-3">
                    <span 
                        onClick={() => window.location.href = '/'}
                        className="text-[21px] sm:text-[26px] tracking-tight text-black dark:text-white font-medium select-none cursor-pointer hover:opacity-85 transition-opacity"
                    >
                        Nahanjoo
                    </span>
                </div>

                {/* Right side Desktop CTA */}
                <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
                    {/* Language toggle */}
                    {toggleUiLanguage && (
                        <button
                            onClick={toggleUiLanguage}
                            className="p-2.5 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-full flex items-center justify-center shadow-sm"
                            title={isFarsi ? 'Switch to English' : 'تغییر به فارسی'}
                        >
                            <span className="text-xs font-bold font-mono tracking-wider">{isFarsi ? 'EN' : 'FA'}</span>
                        </button>
                    )}
                    {/* Dark Mode toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-full flex items-center justify-center shadow-sm"
                        title={theme === 'dark' ? (isFarsi ? 'تغییر به حالت روشن' : 'Switch to light mode') : (isFarsi ? 'تغییر به حالت تاریک' : 'Switch to dark mode')}
                    >
                        {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-yellow-500" /> : <Moon className="w-[18px] h-[18px] text-slate-600" />}
                    </button>
                    {!isAuthLoading && user ? (
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <span className="text-sm font-medium text-black dark:text-white px-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onOpenDashboard}>{user.displayName}</span>
                            {onOpenDashboard && (
                                <button
                                    onClick={onOpenDashboard}
                                    className="text-sm font-semibold text-black dark:text-white px-3 py-1.5 bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors border border-black/10 dark:border-white/10 ml-2 rtl:ml-0 rtl:mr-2"
                                >
                                    {isFarsi ? 'داشبورد' : 'Dashboard'}
                                </button>
                            )}
                            <button 
                                onClick={logout}
                                className="text-base text-black dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity outline-none"
                            >
                                {isFarsi ? 'خروج' : 'Sign Out'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleLoginClick}
                            className="flex items-center space-x-2 text-base font-semibold text-black dark:text-white px-4 py-2 bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors border border-black/10 dark:border-white/10"
                        >
                            <span>{isFarsi ? 'ورود با گوگل' : 'Sign in with Google'}</span>
                        </button>
                    )}
                </div>

                {/* Mobile Theme Toggle & Auth */}
                <div className="flex items-center space-x-3 rtl:space-x-reverse md:hidden">
                    {/* Language toggle */}
                    {toggleUiLanguage && (
                        <button
                            onClick={toggleUiLanguage}
                            className="p-2 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-full flex items-center justify-center shadow-sm"
                            title={isFarsi ? 'Switch to English' : 'تغییر به فارسی'}
                        >
                            <span className="text-xs font-bold font-mono tracking-wider">{isFarsi ? 'EN' : 'FA'}</span>
                        </button>
                    )}
                    <button
                        onClick={toggleTheme}
                        className="p-2 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-full flex items-center justify-center shadow-sm"
                        title={theme === 'dark' ? (isFarsi ? 'تغییر به حالت روشن' : 'Switch to light') : (isFarsi ? 'تغییر به حالت تاریک' : 'Switch to dark')}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    </button>
                    {!isAuthLoading && user ? (
                        <>
                            {onOpenDashboard && (
                                <button
                                    onClick={onOpenDashboard}
                                    className="text-xs font-semibold text-black dark:text-white px-3 py-1.5 bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors border border-black/10 dark:border-white/10"
                                >
                                    {isFarsi ? 'داشبورد' : 'Dashboard'}
                                </button>
                            )}
                            <button 
                                onClick={logout}
                                className="text-sm text-black dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity outline-none ml-2 rtl:mr-2 rtl:ml-0"
                            >
                                {isFarsi ? 'خروج' : 'Sign Out'}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleLoginClick}
                            className="flex items-center space-x-2 text-sm font-semibold text-black dark:text-white px-3 py-1.5 bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors border border-black/10 dark:border-white/10"
                        >
                            <span>{isFarsi ? 'ورود' : 'Sign in'}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Content Layout Container (Relative z-10 overlaying background video) */}
            <main id="spade-hero" className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-6 py-12 pb-8 lg:pb-12 text-black dark:text-white">
                {/* Header Group Container */}
                <div className="mt-8 lg:mt-0 max-w-4xl">
                        {/* Typewriter headline drop-in wrapper */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full"
                        >
                            <h1 className="text-5xl md:text-6xl lg:text-[76px] font-normal tracking-tight text-black dark:text-white leading-[1.08] mb-8 select-none w-full whitespace-pre-wrap min-h-[2.2em]">
                                {displayed}
                                {!done && (
                                    <span className="inline-block w-[2px] h-[1.1em] bg-black dark:bg-white align-middle ml-[2px] animate-blink" />
                                )}
                            </h1>
                        </motion.div>

                        {/* Secondary description text */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <p className="text-lg md:text-xl text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium mb-14 max-w-2xl drop-shadow-sm">
                                {isFarsi ? (
                                    <>اسناد خود را بارگذاری کنید تا نهان‌جو بینش‌های مهم را استخراج کند،<br /> نمایه‌های جستجو ایجاد کند و به شما اجازه دهد با فایل‌های خود گفتگو کنید.</>
                                ) : (
                                    <>Upload your documents and Nahanjoo will extract insights, <br /> generate search indexes, and let you chat directly with your files.</>
                                )}
                            </p>
                        </motion.div>

                        {/* Interactive multi-select service pills */}
                        <div className="w-full max-w-xl">
                            <h2 className="text-2xl font-semibold tracking-tight mb-2 text-black dark:text-white drop-shadow-sm">
                                {isFarsi ? 'آماده تحلیل هستید؟' : 'Ready to analyze?'}
                            </h2>
                            <p className="opacity-90 text-neutral-700 dark:text-neutral-300 font-medium mb-8 text-sm">
                                {isFarsi ? 'برای ادامه کلیک کنید' : 'Click below to proceed'}
                            </p>

                            <div className="flex flex-wrap gap-3 mb-8">
                                {availableServices.map((service) => {
                                    const isSelected = selectedServices.includes(service);

                                    return (
                                        <motion.button
                                            key={service}
                                            onClick={() => toggleService(service)}
                                            className={`flex items-center px-6 py-3 rounded-full text-base font-medium transition-all duration-200 outline-none select-none border whitespace-nowrap cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-[#1C2E1E] dark:bg-emerald-800 text-white border-[#1C2E1E] dark:border-emerald-800 shadow-md shadow-emerald-950/5 transform scale-[1.02]' 
                                                    : 'bg-white dark:bg-neutral-900 text-[#1C2E1E] dark:text-white border-[#F1F3F1] dark:border-neutral-700 hover:bg-[#F1F3F1]/55 dark:hover:bg-neutral-800'
                                            }`}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ y: 1 }}
                                        >
                                            {service}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.span
                                                        initial={{ opacity: 0, scale: 0.5, width: 0 }}
                                                        animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                                        exit={{ opacity: 0, scale: 0.5, width: 0 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                        className="flex items-center justify-center overflow-hidden"
                                                    >
                                                        <Check className={`w-4 h-4 flex-shrink-0 ${isFarsi ? 'mr-2' : 'ml-2'}`} />
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Contingent Feedback Status Banner */}
                            <AnimatePresence mode="wait">
                                {selectedServices.length > 0 && (
                                    <motion.div
                                        key="active"
                                        initial={{ opacity: 0, height: 0, y: 15 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -15 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-[#FAFBF9] dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm w-full">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-[#738273] dark:text-[#A0ABA0] uppercase tracking-wider mb-1.5">{isFarsi ? 'حالت' : 'Mode'}</p>
                                                <p className="text-base font-medium text-black dark:text-white">
                                                    <span className="text-[#1C2E1E] dark:text-emerald-400 font-bold">{selectedServices.join(', ')}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={user ? onEnterLabs : handleLoginClick}
                                                className="flex items-center px-5 py-3 bg-[#1C2E1E] text-white hover:bg-neutral-800 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:translate-x-1 duration-200 self-stretch sm:self-center justify-center"
                                            >
                                                <span className={`text-[#A2B89D] ${isFarsi ? 'ml-2' : 'mr-2'}`}>{user ? (isFarsi ? "شروع کنیم" : "Let's Go") : (isFarsi ? "ورود برای تحلیل" : "Sign in to Analyze")}</span>
                                                <ArrowRight className={`w-4 h-4 text-[#FAFBF9] ${isFarsi ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* Terms of Service Section */}
                        {!user && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                className="mt-8 max-w-xl"
                            >
                                <label className="flex items-start gap-3 cursor-pointer group select-none">
                                    <div className="relative flex items-center pt-0.5">
                                        <input 
                                            type="checkbox" 
                                            checked={termsAgreed}
                                            onChange={(e) => {
                                                setTermsAgreed(e.target.checked);
                                                if (e.target.checked) setShowTermsError(false);
                                            }}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 border-2 rounded shrink-0 transition-colors border-neutral-400 dark:border-neutral-500 peer-checked:bg-[#1C2E1E] dark:peer-checked:bg-emerald-600 peer-checked:border-[#1C2E1E] dark:peer-checked:border-emerald-600 flex items-center justify-center">
                                            {termsAgreed && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed pt-0.5">
                                        {isFarsi ? (
                                            <>
                                                با ورود به سیستم، من با{' '}
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowTermsModal(true);
                                                    }} 
                                                    className="font-bold underline underline-offset-2 text-[#1C2E1E] dark:text-emerald-400 hover:text-black dark:hover:text-emerald-300 transition-colors mx-1"
                                                >
                                                    شرایط خدمات
                                                </button>
                                                موافقت می‌کنم.
                                            </>
                                        ) : (
                                            <>
                                                By proceeding with sign in, I agree to the{' '}
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowTermsModal(true);
                                                    }} 
                                                    className="font-bold underline underline-offset-2 text-[#1C2E1E] dark:text-emerald-400 hover:text-black dark:hover:text-emerald-300 transition-colors mr-1"
                                                >
                                                    Terms of Service
                                                </button>.
                                            </>
                                        )}
                                    </div>
                                </label>
                                <AnimatePresence>
                                    {showTermsError && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-2 text-sm font-bold text-red-600 dark:text-red-400"
                                        >
                                            {isFarsi ? 'شما باید پیش از ورود قوانین و مقررات را بپذیرید.' : 'You must agree to the Terms of Service before signing in.'}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                    </div>
                </main>

                {/* Terms of Service Modal */}
                <AnimatePresence>
                    {showTermsModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setShowTermsModal(false)} dir={isFarsi ? 'rtl' : 'ltr'}>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                            >
                                <h3 className="text-2xl font-bold mb-4 text-black dark:text-white">
                                    {isFarsi ? 'شرایط خدمات و سلب مسئولیت قانونی' : 'Terms of Service & Legal Disclaimer'}
                                </h3>
                                <div className="space-y-4 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed mb-8 font-medium">
                                    {isFarsi ? (
                                        <>
                                            <p><strong>۱. پذیرش شرایط</strong><br/>
                                            با دسترسی و استفاده از نه‌هان‌جو ("وب‌سایت"، "خدمات")، شما تصدیق می‌کنید که این شرایط خدمات را خوانده، درک کرده و با آن موافقت کرده‌اید.</p>

                                            <p><strong>۲. سلب مسئولیت از ضمانت؛ "همان‌طور که هست"</strong><br/>
                                            این خدمات بر اساس "همان‌طور که هست" و "در صورت موجود بودن" ارائه می‌شود. توسعه‌دهندگان، مالکان و وابستگان وب‌سایت هیچ‌گونه نمایندگی یا ضمانتی از هیچ نوع، چه صریح و چه ضمنی، در مورد عملکرد خدمات، یا اطلاعات، محتوا یا مطالب گنجانده شده در آن ارائه نمی‌دهند. شما صراحتاً موافقت می‌کنید که استفاده شما از این خدمات، تنها به ریسک و مسئولیت خود شما بستگی دارد.</p>

                                            <p><strong>۳. محدودیت مسئولیت</strong><br/>
                                            تحت هیچ شرایطی، وب‌سایت در قبال هیچ‌گونه خسارت مستقیم، غیرمستقیم، تصادفی، تبعی یا تنبیهی ناشی از دسترسی، استفاده یا ناتوانی در استفاده از خدمات، به هیچ وجه پاسخگو نخواهد بود. <strong>این وب‌سایت از هر نظر از خود سلب مسئولیت می‌کند، و تمام مسئولیت‌ها متوجه شخص کاربر است.</strong></p>

                                            <p><strong>۴. تحلیل اسناد و خروجی‌های هوش مصنوعی</strong><br/>
                                            تحلیل اسناد توسط هوش مصنوعی و گزارش‌های تولید شده شامل هیچ‌گونه خدمات و مشاوره‌ی حرفه‌ای، قانونی یا پزشکی نیستند. دقت پاسخ‌های تولید شده توسط هوش مصنوعی تضمین نمی‌شود. هرگونه اتکا به مواد ارائه‌شده، کاملاً بر عهده خود کاربر است.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p><strong>1. Acceptance of Terms</strong><br/>
                                            By accessing and using Nahanjoo ("the Website", "Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>

                                            <p><strong>2. Disclaimer of Warranties; "As Is"</strong><br/>
                                            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The website developers, owners, and affiliates make no representations or warranties of any kind, express or implied, as to the operation of their services, or the information, content, or materials included therein. You expressly agree that your use of the Service is at your sole risk.</p>

                                            <p><strong>3. Limitation of Liability</strong><br/>
                                            Under no circumstances shall the website be liable in any way for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, use of, or inability to use the Service. <strong>The website is not responsible in any way, and all responsibility is entirely upon the user.</strong></p>

                                            <p><strong>4. Document Analysis & AI Outputs</strong><br/>
                                            The AI-powered document analysis and generated reports do not constitute professional, legal, or medical advice. The accuracy of the AI-generated responses is not guaranteed. Any reliance on the material provided is at your own risk.</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setShowTermsModal(false)}
                                        className="px-6 py-2.5 bg-[#1C2E1E] dark:bg-emerald-800 text-white font-bold text-sm rounded-full hover:bg-black dark:hover:bg-emerald-700 transition-colors"
                                    >
                                        {isFarsi ? 'متوجه شدم' : 'I Understand'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
        </div>
    );
};

export default HeroSection;
