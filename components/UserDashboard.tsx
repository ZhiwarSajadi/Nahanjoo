import React, { useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { getUserActivityLogs, UserActivityLog } from '../services/activityService';
import Spinner from './Spinner';
import { LogOut, ArrowLeft, History, LogIn, FileText, Calendar, Eye, X, Download, ChevronDown, FileJson } from 'lucide-react';

interface UserDashboardProps {
  user: User;
  onBack: () => void;
  uiLanguage: 'english' | 'persian';
  logout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onBack, uiLanguage, logout }) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await getUserActivityLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
            setIsExportOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.addEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatChristianDate = (date: Date) => {
    return new Intl.DateTimeFormat(uiLanguage === 'persian' ? 'fa-IR' : 'en-US', {
      calendar: 'gregory',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  };

  const formatSolarDate = (date: Date) => {
    return new Intl.DateTimeFormat(uiLanguage === 'persian' ? 'fa-IR' : 'en-US', {
      calendar: 'persian',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  };

  const isFarsi = uiLanguage === 'persian';

  const getAnalysisTxt = (analysis: any) => {
        let text = `=== Analysis Report ===\n\n`;
        text += (isFarsi ? "خلاصه:\n" : "SUMMARY:\n") + (analysis.summary || '') + "\n\n";
        if (analysis.insights?.length > 0) {
            text += (isFarsi ? "ستون‌های کلیدی بینش:\n" : "INSIGHTS:\n") + analysis.insights.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n') + "\n\n";
        }
        if (analysis.keyTerms?.length > 0) {
            text += (isFarsi ? "واژه‌نامه:\n" : "KEY TERMS:\n") + analysis.keyTerms.map((k: any) => `- ${k.term}: ${k.definition}`).join('\n') + "\n\n";
        }
        if (analysis.faqs?.length > 0) {
             text += (isFarsi ? "پرسش و پاسخ:\n" : "FAQS:\n") + analysis.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') + "\n\n";
        }
        if (analysis.quiz?.length > 0) {
            text += (isFarsi ? "آزمون:\n" : "QUIZ:\n") + analysis.quiz.map((q: any, idx: number) => `Q${idx + 1}: ${q.question}\nOptions: ${q.options.join(', ')}\nAnswer: Option ${q.correctAnswerIndex + 1}`).join('\n\n') + "\n\n";
        }
        return text;
    };

    const getAnalysisHtml = (analysis: any) => {
        let html = `<h2>Analysis Report</h2>`;
        html += `<h3>${isFarsi ? "خلاصه" : "SUMMARY"}</h3><p>${analysis.summary || ''}</p>`;
        if (analysis.insights?.length > 0) {
            html += `<h3>${isFarsi ? "ستون‌های کلیدی بینش" : "INSIGHTS"}</h3><ol>${analysis.insights.map((i: string) => `<li>${i}</li>`).join('')}</ol>`;
        }
        if (analysis.keyTerms?.length > 0) {
            html += `<h3>${isFarsi ? "واژه‌نامه" : "KEY TERMS"}</h3><ul>${analysis.keyTerms.map((k: any) => `<li><strong>${k.term}:</strong> ${k.definition}</li>`).join('')}</ul>`;
        }
        if (analysis.faqs?.length > 0) {
             html += `<h3>${isFarsi ? "پرسش و پاسخ" : "FAQS"}</h3><ul>${analysis.faqs.map((f: any) => `<li><strong>Q:</strong> ${f.question}<br/><strong>A:</strong> ${f.answer}</li>`).join('')}</ul>`;
        }
        if (analysis.quiz?.length > 0) {
             html += `<h3>${isFarsi ? "آزمون" : "QUIZ"}</h3><ul>${analysis.quiz.map((q: any, idx: number) => `<li><strong>Q${idx + 1}:</strong> ${q.question}<br/>Options: ${q.options.join(', ')}<br/>Answer: Option ${q.correctAnswerIndex + 1}</li>`).join('')}</ul>`;
        }
        html += `<hr/><br/>`;
        return html;
    };

    const exportToTxt = () => {
        if (!selectedAnalysis) return;
        const history = selectedAnalysis.history || [];
        const content = getAnalysisTxt(selectedAnalysis) + "=== Conversational Chat ===\n\n" + history.map((msg: any) => {
            const role = msg.role === 'user' ? 'User' : 'AI';
            const partsText = msg.parts.map((p: any) => p.text).join('\n');
            return `${role}:\n${partsText}\n\n----------------------------------------\n`;
        }).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analysis_export_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToWord = () => {
        if (!selectedAnalysis) return;
        const history = selectedAnalysis.history || [];
        const hasRtl = history.some((msg: any) => /[\u0600-\u06FF]/.test(msg.parts[0]?.text || ''));
        const content = history.map((msg: any) => {
            const role = msg.role === 'user' ? 'User' : 'AI';
            const partsText = msg.parts.map((p: any) => p.text).join('<br/>').replace(/\n/g, '<br/>');
            return `<p style="font-weight: bold; margin-top: 1em; color: #4b5563;">${role}:</p><p style="margin-left: 1em;">${partsText}</p>`;
        }).join('');
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Export</title></head>
            <body dir="${hasRtl ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; font-size: 14px;">
                <h1 style="font-size: 20px;">Analysis & Chat History Option</h1>
                ${getAnalysisHtml(selectedAnalysis)}
                <h2>Conversational Chat</h2>
                ${content}
            </body></html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analysis_export_${Date.now()}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToPdf = () => {
        if (!selectedAnalysis) return;
        const history = selectedAnalysis.history || [];
        const hasRtl = history.some((msg: any) => /[\u0600-\u06FF]/.test(msg.parts[0]?.text || ''));
        let htmlContent = history.map((msg: any) => {
            const role = msg.role === 'user' ? 'User' : 'AI';
            return `<div style="margin-bottom: 20px;">
                        <strong style="color: #4b5563;">${role}</strong>
                        <div style="margin-top: 5px;">${msg.parts.map((p: any) => p.text.replace(/\n/g, '<br/>')).join('<br/>')}</div>
                    </div>`;
        }).join('');
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Chat History</title>
                        <style>
                            body { font-family: sans-serif; line-height: 1.5; padding: 20px; color: #111; direction: ${hasRtl ? 'rtl' : 'ltr'}; }
                            h1 { border-bottom: 1px solid #ccc; padding-bottom: 10px; font-size: 20px; }
                        </style>
                    </head>
                    <body>
                        <h1>Analysis & Chat History Option</h1>
                        ${getAnalysisHtml(selectedAnalysis)}
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
        if (!selectedAnalysis) return;
        const dataStr = JSON.stringify(selectedAnalysis, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

  return (
    <div className={`flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 ${isFarsi ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className={`px-6 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10 shadow-sm`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={isFarsi ? 'بازگشت' : 'Back'}
          >
            <ArrowLeft className={`w-5 h-5 ${isFarsi ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-xl font-bold">{isFarsi ? 'داشبورد کاربر' : 'User Dashboard'}</h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 mr-4">
                {user.photoURL && (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700" referrerPolicy="no-referrer" />
                )}
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.displayName || user.email}</span>
                </div>
            </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-full transition-colors font-medium border border-red-200 dark:border-red-900/30"
          >
            <LogOut className={`w-4 h-4 ${isFarsi ? 'rotate-180' : ''}`} />
            {isFarsi ? 'خروج' : 'Sign Out'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 md:p-8">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <LogIn className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-0.5">{isFarsi ? 'تعداد ورودها' : 'Total Logins'}</p>
                    <p className="text-2xl font-bold">{logs.filter(l => l.eventType === 'LOGIN').length}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-0.5">{isFarsi ? 'تعداد تحلیل‌ها' : 'Total Analyses'}</p>
                    <p className="text-2xl font-bold">{logs.filter(l => l.eventType === 'ANALYSIS').length}</p>
                </div>
            </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700/50 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              {isFarsi ? 'تاریخچه فعالیت‌ها' : 'Activity History'}
            </h2>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
                <Spinner />
                <p className="mt-4">{isFarsi ? 'در حال بارگذاری فعالیت‌ها...' : 'Loading activities...'}</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 m-6 rounded-xl border border-red-200 dark:border-red-900/20">
                {error}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <p>{isFarsi ? 'هیچ فعالیتی یافت نشد.' : 'No activities found.'}</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="border-b border-neutral-200 dark:border-neutral-700/50 p-6 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    {isFarsi ? 'رکوردهای تحلیل' : 'Analysis Records'}
                  </h3>
                  {logs.filter(l => l.eventType === 'ANALYSIS').length === 0 ? (
                    <p className="text-neutral-500 text-sm">{isFarsi ? 'رکوردی یافت نشد.' : 'No records found.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/50 bg-white dark:bg-neutral-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-sm border-b border-neutral-200 dark:border-neutral-700/50">
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'جزئیات' : 'Details'}</th>
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'تاریخ میلادی' : 'Christian Date'}</th>
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'تاریخ شمسی' : 'Solar Date'}</th>
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {logs.filter(l => l.eventType === 'ANALYSIS').map((log) => (
                            <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">
                                {log.details || '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                                {formatChristianDate(log.timestamp)}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                                <span className="flex items-center gap-1.5" dir={isFarsi ? 'rtl' : 'ltr'}>
                                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                                  {formatSolarDate(log.timestamp)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {log.analysisData && (
                                  <button onClick={() => setSelectedAnalysis(log.analysisData)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title={isFarsi ? 'مشاهده کامل' : 'View Full Content'}>
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white dark:bg-neutral-800/80">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-blue-500" />
                    {isFarsi ? 'رکوردهای ورود' : 'Login Records'}
                  </h3>
                  {logs.filter(l => l.eventType === 'LOGIN').length === 0 ? (
                    <p className="text-neutral-500 text-sm">{isFarsi ? 'رکوردی یافت نشد.' : 'No records found.'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/50 bg-white dark:bg-neutral-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-sm border-b border-neutral-200 dark:border-neutral-700/50">
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'جزئیات' : 'Details'}</th>
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'تاریخ میلادی' : 'Christian Date'}</th>
                            <th className={`font-medium py-3 px-4 ${isFarsi ? 'text-right' : 'text-left'}`}>{isFarsi ? 'تاریخ شمسی' : 'Solar Date'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {logs.filter(l => l.eventType === 'LOGIN').map((log) => (
                            <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">
                                {log.details || '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                                {formatChristianDate(log.timestamp)}
                              </td>
                              <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                                <span className="flex items-center gap-1.5" dir={isFarsi ? 'rtl' : 'ltr'}>
                                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                                  {formatSolarDate(log.timestamp)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Analysis Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 ${isFarsi ? 'rtl' : 'ltr'}`}>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                {isFarsi ? 'محتوای کامل تحلیل' : 'Full Analysis Content'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative text-left" ref={exportDropdownRef}>
                    <button
                        onClick={() => setIsExportOpen(!isExportOpen)}
                        className="flex items-center px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/20 rounded-md transition-all text-sm font-semibold shadow-sm"
                    >
                        <Download className="w-4 h-4 text-blue-500" />
                        <span className={`hidden md:inline ${isFarsi ? 'mr-1.5' : 'ml-1.5'}`}>{isFarsi ? 'خروجی' : 'Export'}</span>
                        <ChevronDown className={`w-3 h-3 opacity-70 ${isFarsi ? 'mr-1' : 'ml-1'}`} />
                    </button>
                    {isExportOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="py-1 rtl:text-right">
                                <button
                                    onClick={() => {
                                        exportToTxt();
                                        setIsExportOpen(false);
                                    }}
                                    className="w-full text-left rtl:text-right px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                >
                                    <FileText className={`w-4 h-4 text-blue-500 shrink-0 ${isFarsi ? 'ml-2' : 'mr-2'}`} />
                                    {isFarsi ? "خروجی متن (TXT)" : "Export as TXT"}
                                </button>
                                <button
                                    onClick={() => {
                                        exportToPdf();
                                        setIsExportOpen(false);
                                    }}
                                    className="w-full text-left rtl:text-right px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                >
                                    <FileText className={`w-4 h-4 text-red-500 shrink-0 ${isFarsi ? 'ml-2' : 'mr-2'}`} />
                                    {isFarsi ? "خروجی پی‌دی‌اف (PDF)" : "Export as PDF"}
                                </button>
                                <button
                                    onClick={() => {
                                        exportToWord();
                                        setIsExportOpen(false);
                                    }}
                                    className="w-full text-left rtl:text-right px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                >
                                    <FileText className={`w-4 h-4 text-blue-700 shrink-0 ${isFarsi ? 'ml-2' : 'mr-2'}`} />
                                    {isFarsi ? "خروجی ورد (Word)" : "Export as Word"}
                                </button>
                                <button
                                    onClick={() => {
                                        exportToJson();
                                        setIsExportOpen(false);
                                    }}
                                    className="w-full text-left rtl:text-right px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 transition-colors flex items-center rtl:flex-row-reverse"
                                >
                                    <FileJson className={`w-4 h-4 text-emerald-500 shrink-0 ${isFarsi ? 'ml-2' : 'mr-2'}`} />
                                    {isFarsi ? "خروجی داده (JSON)" : "Export as JSON"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={() => setSelectedAnalysis(null)} className="p-1.5 hover:bg-neutral-100 dark:bg-neutral-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto w-full">
               <div className="space-y-6">
                 <div>
                   <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-2">{isFarsi ? 'خلاصه:' : 'Summary:'}</h4>
                   <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">{selectedAnalysis.summary || (isFarsi ? 'خلاصه‌ای موجود نیست' : 'No summary available')}</p>
                 </div>
                 {selectedAnalysis.insights && selectedAnalysis.insights.length > 0 && (
                 <div>
                   <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-2">{isFarsi ? 'بینش‌ها:' : 'Insights:'}</h4>
                   <ul className="list-disc pl-5 rtl:pr-5 space-y-1 text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                     {selectedAnalysis.insights.map((insight: string, i: number) => (
                       <li key={i}>{insight}</li>
                     ))}
                   </ul>
                 </div>
                 )}
                 {selectedAnalysis.keyTerms && selectedAnalysis.keyTerms.length > 0 && (
                 <div>
                   <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-2">{isFarsi ? 'واژه‌نامه:' : 'Key Terms:'}</h4>
                   <ul className="space-y-2 text-sm leading-relaxed">
                     {selectedAnalysis.keyTerms.map((termInfo: any, i: number) => (
                       <li key={i} className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                         <span className="font-bold text-neutral-800 dark:text-neutral-200">{termInfo.term}:</span> <span className="text-neutral-600 dark:text-neutral-400">{termInfo.definition}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
                 )}
                 {selectedAnalysis.history && selectedAnalysis.history.length > 0 && (
                 <div>
                   <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                     <History className="w-4 h-4" />
                     {isFarsi ? 'تاریخچه چت:' : 'Chat History:'}
                   </h4>
                   <div className="space-y-4">
                     {selectedAnalysis.history.map((msg: any, i: number) => (
                       <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                         <div className={`p-4 rounded-2xl max-w-[85%] text-sm ${
                           msg.role === 'user' 
                           ? 'bg-blue-600 text-white rounded-br-sm' 
                           : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-sm border border-neutral-200 dark:border-neutral-700/50'
                         }`}>
                           <p className="whitespace-pre-wrap flex gap-1"><strong className="sr-only">{msg.role === 'user' ? 'User:' : 'AI:'}</strong> {msg.parts.map((p:any) => p.text).join('')}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
