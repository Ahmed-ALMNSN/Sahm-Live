import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Printer, 
  FileDown, 
  RefreshCw, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Share2
} from 'lucide-react';
import { ProfessionalReportData } from '../utils/reportEngine.js';
import { exportElementToPdf, printHtmlElement } from '../utils/pdfExport.js';
import { PDFReportTemplate } from '../components/PDFReportTemplate.js';
import { Language, Theme } from '../types.js';

interface StockReportPageProps {
  report: ProfessionalReportData;
  lang: Language;
  theme: Theme;
  onBack: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleLanguage?: () => void;
  onToggleTheme?: () => void;
}

export const StockReportPage: React.FC<StockReportPageProps> = ({
  report,
  lang,
  theme,
  onBack,
  onRefresh,
  isRefreshing = false,
  onToggleLanguage,
  onToggleTheme,
}) => {
  const isAr = lang === 'ar';
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const handlePrint = async () => {
    if (isPrinting) return;
    try {
      setIsPrinting(true);
      setPrintSuccess(false);
      const symbolSafe = (report.company.symbol || 'STOCK').toUpperCase();
      const res = await printHtmlElement('institutional-report-page-container', {
        title: `${symbolSafe}_Institutional_Report`,
        fileName: `${symbolSafe}_Institutional_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      if (res.success) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      setExportSuccess(false);

      const targetElement = document.getElementById('institutional-report-page-container');
      if (!targetElement) {
        throw new Error('Report container not found');
      }

      const now = new Date();
      const datePart = now.toISOString().split('T')[0];
      const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const symbolSafe = (report.company.symbol || 'STOCK').toUpperCase();
      const fileName = `${symbolSafe}_Institutional_Report_${datePart}_${timePart}.pdf`;

      const success = await exportElementToPdf(targetElement, { fileName });
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-100 dark:bg-[#07080a] text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors selection:bg-emerald-500 selection:text-white"
    >
      {/* ================= STICKY TOP TOOLBAR (HIDDEN IN PRINT) ================= */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Back to Stock Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              title={isAr ? 'العودة إلى صفحة وتحليل السهم' : 'Back to Stock Details'}
            >
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isAr ? 'العودة إلى السهم' : 'Back to Stock'}</span>
            </button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 rtl:border-l-0 rtl:border-r rtl:pr-2">
              <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                {report.company.symbol}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                {report.company.name}
              </span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                ${report.market.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Switcher */}
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                <span className="font-mono">{isAr ? 'EN' : 'عربي'}</span>
              </button>
            )}

            {/* Refresh Report Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={isAr ? 'تحديث بيانات التقرير' : 'Refresh Report Data'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
                <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            )}

            {/* Print Report Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              title={isAr ? 'طباعة التقرير مباشرة (A4)' : 'Print Report (A4)'}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50 ${
                printSuccess
                  ? 'bg-emerald-700'
                  : isPrinting
                  ? 'bg-slate-700 opacity-80 cursor-wait'
                  : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'
              }`}
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPrinting ? (isAr ? 'جاري التجهيز...' : 'Preparing...') : (isAr ? 'طباعة التقرير' : 'Print Report')}</span>
            </button>

            {/* Save Report (PDF) Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              title={isAr ? 'حفظ التقرير كملف PDF عالي الدقة' : 'Save Report as High-Resolution PDF'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition cursor-pointer ${
                exportSuccess
                  ? 'bg-emerald-600 text-white'
                  : isExportingPdf
                  ? 'bg-blue-600 text-white opacity-90 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
              }`}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري حفظ التقرير...' : 'Saving Report...'}</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'تم حفظ التقرير بنجاح!' : 'Report Saved!'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>{isAr ? 'حفظ التقرير (PDF)' : 'Save Report (PDF)'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ================= REPORT DOCUMENT CONTAINER ================= */}
      <main className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 pt-6 sm:pt-8">
        
        {/* Document Sheet Frame (Institutional Paper Style) */}
        <div
          id="institutional-report-page-container"
          className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-5 sm:p-8 md:p-10 transition-all print:p-0 print:border-none print:shadow-none print:rounded-none"
        >
          <PDFReportTemplate
            report={report}
            lang={lang}
            containerId="institutional-report-inner-content"
          />
        </div>

        {/* Bottom Actions for Mobile / Long Scroll */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 shadow-sm no-print">
          <div className="text-xs text-slate-500 flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'تقرير استثماري كمي مدقق بواسطة Sahm Quant Engine' : 'Audited Quantitative Research Dossier'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{isAr ? 'حفظ التقرير (PDF)' : 'Save Report (PDF)'}</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};
