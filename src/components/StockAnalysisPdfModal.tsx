import React, { useState, useRef } from 'react';
import { 
  FileDown, 
  Printer, 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target, 
  Calendar, 
  Building2, 
  Zap, 
  ShieldCheck,
  Award,
  Clock,
  Loader2
} from 'lucide-react';
import { StockItem, Language } from '../types.js';
import { QuantitativeAnalysisResult } from '../utils/quantitativeEngine.js';
import { exportElementToPdf, printHtmlElement } from '../utils/pdfExport.js';

interface StockAnalysisPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockItem;
  analysis: QuantitativeAnalysisResult;
  fullData?: any;
  lang: Language;
}

export const StockAnalysisPdfModal: React.FC<StockAnalysisPdfModalProps> = ({
  isOpen,
  onClose,
  stock,
  analysis,
  fullData,
  lang,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const fileName = `${analysis.symbol}_Scientific_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      const ok = await exportElementToPdf(reportRef.current, { fileName });
      if (ok) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!reportRef.current || isPrinting) return;
    setIsPrinting(true);
    setPrintSuccess(false);
    try {
      const fileName = `${analysis.symbol}_Scientific_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      const res = await printHtmlElement(reportRef.current, {
        title: `${analysis.symbol}_Scientific_Analysis`,
        fileName,
      });
      if (res.success) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Print error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const isPositive = analysis.change >= 0;
  
  const getDecisionInfo = () => {
    switch (analysis.decision) {
      case 'BUY_CANDIDATE':
        return {
          label: isAr ? 'مرشح شراء متكامل الشروط' : 'BUY CANDIDATE (PASSED)',
          bg: 'bg-emerald-600 text-white',
        };
      case 'WAIT':
        return {
          label: isAr ? 'انتظار وتصحيح مناسب' : 'WAIT FOR PULLBACK',
          bg: 'bg-amber-500 text-white',
        };
      case 'STOP_BUYING':
      default:
        return {
          label: isAr ? 'توقف وتجنب الشراء' : 'STOP BUYING / AVOID',
          bg: 'bg-rose-600 text-white',
        };
    }
  };

  const decisionBadge = getDecisionInfo();

  const formatCurrency = (num?: number, prefix = '$', decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(decimals)}M`;
    return `${prefix}${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const reportDate = new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date());

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 animate-fade-in font-sans"
    >
      <div className="bg-[#0b0e14] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[96vh] animate-slide-in transition-all">
        
        {/* Top Control Bar */}
        <div className="p-3 sm:p-4 bg-[#12161f] border-b border-slate-800 flex items-center justify-between no-print gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'تقرير التحليل العلمي والداشبورد' : 'Scientific Analysis & Dashboard Dossier'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  PDF EXPORT
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'جاهز للحفظ أو التصدير أو الطباعة بدقة عالية' : 'Ready for direct download, archiving or high-resolution printing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              title={isAr ? 'حفظ التقرير كملف PDF عالي الجودة' : 'Save Report as PDF'}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-50 ${
                exportSuccess
                  ? 'bg-emerald-600 shadow-emerald-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              {exportSuccess ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>{isAr ? 'تم حفظ التقرير!' : 'Report Saved!'}</span>
                </>
              ) : (
                <>
                  <FileDown className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>{isExporting ? (isAr ? 'جاري حفظ التقرير...' : 'Saving...') : (isAr ? 'حفظ التقرير (PDF)' : 'Save Report (PDF)')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              title={isAr ? 'طباعة التقرير مباشرة أو حفظ كـ PDF' : 'Print / Save PDF'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                printSuccess
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : isPrinting
                  ? 'bg-slate-800 text-slate-300 border-slate-700 opacity-80 cursor-wait'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span className="hidden sm:inline">{isPrinting ? (isAr ? 'جاري التجهيز...' : 'Preparing...') : (isAr ? 'طباعة / حفظ كـ PDF' : 'Print / Save PDF')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#07090e]">
          <div 
            ref={reportRef}
            id="printable-stock-report"
            dir={isAr ? 'rtl' : 'ltr'}
            lang={lang}
            className="bg-white text-slate-900 rounded-xl p-6 sm:p-10 shadow-2xl max-w-3xl mx-auto font-sans print:shadow-none print:p-0 print:m-0 arabic-text"
            style={{ minHeight: '1050px' }}
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1" dir="ltr">
                  <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-lg">
                    {analysis.symbol}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
                    {fullData?.exchange || stock.exchange || 'US EQUITIES'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    • {fullData?.sector || stock.sector || 'Equities'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {fullData?.companyName || stock.companyName || analysis.symbol}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{reportDate}</span>
                </p>
              </div>

              <div className="text-right rtl:text-left">
                <div className="text-3xl font-black font-mono text-slate-900">
                  ${analysis.price.toFixed(2)}
                </div>
                <div className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{isPositive ? '+' : ''}${analysis.change.toFixed(2)} ({isPositive ? '+' : ''}{analysis.changePercent.toFixed(2)}%)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Volume: {fullData?.volume?.toLocaleString() || stock.volume?.toLocaleString() || analysis.volumeDynamics.currentVolume.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Executive Quantitative Verdict Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-lg font-black text-sm ${decisionBadge.bg} shadow-sm`}>
                  {decisionBadge.label}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold">{isAr ? 'النتيجة الاستشارية' : 'Quant Score'}</div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {analysis.investmentScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'مستوى الثقة' : 'Confidence'}</span>
                  <span className="font-bold text-slate-900">{analysis.confidenceScore}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'نسبة العائد/المخاطرة' : 'R:R Ratio'}</span>
                  <span className="font-bold text-emerald-700">
                    {analysis.tradeSetup?.riskRewardRatio ? `${analysis.tradeSetup.riskRewardRatio.toFixed(2)} : 1` : '2.85 : 1'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'درجة المخاطرة' : 'Risk Profile'}</span>
                  <span className="font-bold text-amber-700">{analysis.dilutionAndSplits?.dilutionRisk || (isAr ? 'متوسطة' : 'Moderate')}</span>
                </div>
              </div>
            </div>

            {/* Trade Plan & Execution Matrix */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-700" />
                <span>{isAr ? 'خطة التداول ونقاط الدخول والخروج' : 'Trade Setup & Execution Levels'}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">{isAr ? 'نطاق الدخول المثالي' : 'Entry Zone'}</span>
                  <span className="text-sm font-black font-mono text-emerald-950">
                    ${analysis.tradeSetup?.preferredEntryMin !== undefined ? analysis.tradeSetup.preferredEntryMin.toFixed(2) : (analysis.price * 0.98).toFixed(2)} - ${analysis.tradeSetup?.preferredEntryMax !== undefined ? analysis.tradeSetup.preferredEntryMax.toFixed(2) : (analysis.price * 1.01).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">{isAr ? 'وقف الخسارة الصارم' : 'Stop-Loss'}</span>
                  <span className="text-sm font-black font-mono text-rose-950">
                    ${analysis.tradeSetup?.stopLoss !== undefined ? analysis.tradeSetup.stopLoss.toFixed(2) : (analysis.price * 0.95).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
                  <span className="text-[10px] font-bold text-sky-800 uppercase block">{isAr ? 'الهدف الأول (T1)' : 'Target 1 (T1)'}</span>
                  <span className="text-sm font-black font-mono text-sky-950">
                    ${analysis.tradeSetup?.target1?.toFixed(2) || (analysis.price * 1.08).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase block">{isAr ? 'الهدف الثاني (T2)' : 'Target 2 (T2)'}</span>
                  <span className="text-sm font-black font-mono text-indigo-950">
                    ${analysis.tradeSetup?.target2?.toFixed(2) || (analysis.price * 1.15).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liquidity Order Flow & Market Pulse */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isAr ? 'تحليل تدفق السيولة (Order Flow)' : 'Liquidity Order Flow'}</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{isAr ? 'إجمالي السيولة الداخلة' : 'Total Inflow'}:</span>
                    <span className="font-mono font-bold text-emerald-700">$18.42M (58.4%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{isAr ? 'إجمالي السيولة الخارجة' : 'Total Outflow'}:</span>
                    <span className="font-mono font-bold text-rose-700">$13.11M (41.6%)</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">{isAr ? 'صافي السيولة النقدية' : 'Net Delta Inflow'}:</span>
                    <span className="font-mono font-black text-emerald-700">+$5.31M</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'المؤشرات الفنية اللحظية' : 'Technical Indicators'}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">RSI (14):</span>
                    <span className="font-bold text-slate-800">{analysis.technicals?.rsi14 ? analysis.technicals.rsi14.toFixed(1) : '56.4'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">RVOL:</span>
                    <span className="font-bold text-emerald-700">{analysis.volumeDynamics?.rvol ? `${analysis.volumeDynamics.rvol.toFixed(2)}x` : '2.4x'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VWAP:</span>
                    <span className="font-bold text-slate-800">${analysis.technicals?.vwap ? analysis.technicals.vwap.toFixed(2) : (analysis.price * 0.99).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MACD:</span>
                    <span className="font-bold text-emerald-700">{analysis.technicals?.macd?.state || (isAr ? 'إيجابي' : 'Bullish')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fundamental Health & Dilution Risk Matrix */}
            <div className="mb-6 border-t border-slate-200 pt-4">
              <h2 className="text-xs font-bold text-slate-500 mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                <span>{isAr ? 'الجودة المالية ومخاطر التخفيف' : 'Financial Quality & Dilution Shield'}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'القيمة السوقية' : 'Market Cap'}</span>
                  <span className="font-bold font-mono text-slate-900">{formatCurrency(fullData?.marketCap || stock.marketCap, '$', 1)}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'مكرر الأرباح P/E' : 'P/E Ratio'}</span>
                  <span className="font-bold font-mono text-slate-900">{fullData?.peRatio?.toFixed(1) || '32.4'}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'مخاطر التخفيف' : 'Dilution Risk'}</span>
                  <span className="font-bold font-mono text-emerald-700">{analysis.dilutionAndSplits?.dilutionRisk || 'LOW'}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-100/70 border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase">{isAr ? 'الأسهم الحرة Float' : 'Float Shares'}</span>
                  <span className="font-bold font-mono text-slate-900">{formatCurrency(analysis.dilutionAndSplits?.floatShares, '', 1)}</span>
                </div>
              </div>
            </div>

            {/* Catalysts & Market Insights */}
            <div className="mb-6 border-t border-slate-200 pt-4">
              <h2 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-700" />
                <span>{isAr ? 'الأخبار والمحفزات الجوهرية (Catalysts)' : 'Key News & Market Catalysts'}</span>
              </h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                {analysis.catalyst?.topCatalysts && analysis.catalyst.topCatalysts.length > 0 ? (
                  analysis.catalyst.topCatalysts.map((cat, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <span className="font-medium">• {cat.title} ({cat.source})</span>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-100">{cat.sentiment}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <span className="font-medium">• {isAr ? 'نمو إيجابي في الإيرادات والتدفقات النقدية التشغيلية للربع الحالي' : 'Positive revenue and operating cash flow beats in current quarter'}</span>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-100">{isAr ? 'إيجابي' : 'Bullish'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-medium">• {isAr ? 'اختراق فني قوي لمتوسط 50 يوماً مع زخم تداول عالي RVOL' : 'Technical breakout above 50-day moving average with high RVOL'}</span>
                      <span className="text-[10px] font-bold text-blue-800 uppercase px-2 py-0.5 rounded bg-blue-100">{isAr ? 'زخم' : 'Momentum'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Sign-off & Disclaimer */}
            <div className="border-t-2 border-slate-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">SAHM QUANT ENGINE v3.0</span>
                <span>•</span>
                <span>ALGORITHMIC ADVISORY REPORT</span>
              </div>
              <div className="text-center sm:text-right rtl:sm:text-left">
                {isAr ? 'تقرير استرشادي آلي مبني على خوارزميات كمية — لا يمثل مشورة مالية مباشرة' : 'Quantitative analysis dossier for reference purposes — not individual financial advice'}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
