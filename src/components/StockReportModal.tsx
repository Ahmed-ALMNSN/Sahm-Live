import React, { useMemo, useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Calendar, 
  Activity, 
  FileText,
  CheckCircle2,
  ShieldCheck,
  FileDown
} from 'lucide-react';
import { StockItem, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { BowArrowIcon } from './BowArrowIcon.js';
import { exportElementToPdf } from '../utils/pdfExport.js';

interface StockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockItem[];
  lang: Language;
}

export const StockReportModal: React.FC<StockReportModalProps> = ({
  isOpen,
  onClose,
  stocks,
  lang,
}) => {
  const t = getTranslation(lang);
  const [isExporting, setIsExporting] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const reportDate = useMemo(() => {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());
  }, [lang]);

  // Executive Statistics Calculations
  const stats = useMemo(() => {
    const total = stocks.length;
    const gainers = stocks.filter(s => s.changePercent > 0);
    const losers = stocks.filter(s => s.changePercent < 0);
    const unchanged = stocks.filter(s => s.changePercent === 0);
    
    const sumChange = stocks.reduce((acc, s) => acc + (s.changePercent || 0), 0);
    const avgChange = total > 0 ? sumChange / total : 0;
    
    const activeAlerts = stocks.filter(s => s.alertsEnabled && (s.upperAlert !== null || s.lowerAlert !== null)).length;
    const triggeredUpper = stocks.filter(s => s.upperCrossedState).length;
    const triggeredLower = stocks.filter(s => s.lowerCrossedState).length;

    // Group by Sector
    const sectorsMap: Record<string, { count: number; sumChange: number; stocks: StockItem[] }> = {};
    for (const stock of stocks) {
      const sec = stock.sector?.trim() || (lang === 'ar' ? 'قطاع عام' : 'General');
      if (!sectorsMap[sec]) {
        sectorsMap[sec] = { count: 0, sumChange: 0, stocks: [] };
      }
      sectorsMap[sec].count++;
      sectorsMap[sec].sumChange += stock.changePercent || 0;
      sectorsMap[sec].stocks.push(stock);
    }

    const sectors = Object.entries(sectorsMap).map(([sector, data]) => ({
      sector,
      count: data.count,
      avgChange: data.sumChange / data.count,
      stocks: data.stocks,
    })).sort((a, b) => b.count - a.count);

    return {
      total,
      gainersCount: gainers.length,
      losersCount: losers.length,
      unchangedCount: unchanged.length,
      avgChange,
      activeAlerts,
      triggeredUpper,
      triggeredLower,
      sectors,
    };
  }, [stocks, lang]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!printableAreaRef.current) return;
    setIsExporting(true);
    try {
      const fileName = `Sahm_Market_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportElementToPdf(printableAreaRef.current, { fileName });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-fade-in font-sans"
    >
      <div className="bg-white dark:bg-[#0f1115] text-slate-800 dark:text-slate-100 print-container rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-slide-in transition-colors duration-200">
        
        {/* Header Actions (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-sans">
                {t.report.modalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
                {t.report.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-export-pdf-action"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-md active:scale-95 transition-all flex items-center gap-2 font-sans cursor-pointer disabled:opacity-50"
            >
              <FileDown className={`w-4 h-4 text-emerald-400 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? (lang === 'ar' ? 'جاري التحميل...' : 'Exporting...') : (lang === 'ar' ? 'تحميل PDF' : 'Download PDF')}</span>
            </button>

            <button
              id="btn-print-action"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 font-sans cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t.report.btnPrint}</span>
            </button>

            <button
              id="btn-close-report"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content Body */}
        <div ref={printableAreaRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-[#0a0b0d] print:bg-white print:text-black">
          
          {/* Executive Report Brand Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 print:bg-slate-100 border border-slate-300 dark:border-slate-700 print:border-slate-300 flex items-center justify-center p-1.5 shrink-0">
                <BowArrowIcon className="w-full h-full text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5" dir="ltr">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white print:text-slate-900 font-mono" style={{ direction: 'ltr' }}>
                    <span className="text-emerald-600 dark:text-emerald-400 print:text-emerald-600 font-extrabold">JM</span><span className="font-bold">Apps</span> <span className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-500 font-sans font-normal">LIVE MONITOR</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans">
                  {lang === 'ar' ? 'تقرير التقييم والمراقبة الفنية اللحظية للأسهم وحركة الأسعار' : 'Institutional Live Stock Valuation & Technical Alert Portfolio Report'}
                </p>
              </div>
            </div>

            <div className="text-left rtl:text-right sm:text-right rtl:sm:text-left text-xs sm:text-sm text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans space-y-1">
              <div className="flex items-center sm:justify-end gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 print:text-slate-700" />
                <span className="font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">{reportDate}</span>
              </div>
              <div className="flex items-center sm:justify-end gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-slate-800 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Pro Engine v3</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 print:text-emerald-700 border border-emerald-500/20 font-bold">
                  <Activity className="w-3 h-3" />
                  <span>LIVE FEED</span>
                </span>
              </div>
            </div>
          </div>

          {/* Executive Summary Metric Cards */}
          <div>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-slate-800 mb-3 flex items-center gap-2 font-sans">
              <span>{t.report.executiveSummary}</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Stocks */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans">{t.report.totalStocks}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white print:text-slate-900 font-mono mt-1">
                  {stats.total}
                </div>
                <div className="text-[11px] text-slate-500 font-sans mt-1">
                  {stats.sectors.length} {lang === 'ar' ? 'قطاعات مسجلة' : 'sectors'}
                </div>
              </div>

              {/* Advancing / Gainers */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 shadow-2xs">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-sans flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t.report.gainersCount}
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-mono mt-1">
                  {stats.gainersCount}
                </div>
                <div className="text-[11px] text-slate-500 font-sans mt-1">
                  {stats.total > 0 ? ((stats.gainersCount / stats.total) * 100).toFixed(0) : 0}% {lang === 'ar' ? 'من المحفظة' : 'of list'}
                </div>
              </div>

              {/* Declining / Losers */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 shadow-2xs">
                <span className="text-xs text-rose-600 dark:text-rose-400 print:text-rose-700 font-sans flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {t.report.losersCount}
                </span>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 print:text-rose-700 font-mono mt-1">
                  {stats.losersCount}
                </div>
                <div className="text-[11px] text-slate-500 font-sans mt-1">
                  {stats.total > 0 ? ((stats.losersCount / stats.total) * 100).toFixed(0) : 0}% {lang === 'ar' ? 'من المحفظة' : 'of list'}
                </div>
              </div>

              {/* Average Daily Performance */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans">{t.report.avgChange}</span>
                <div className={`text-2xl font-bold font-mono mt-1 ${
                  stats.avgChange >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700' 
                    : 'text-rose-600 dark:text-rose-400 print:text-rose-700'
                }`}>
                  {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                </div>
                <div className="text-[11px] text-slate-500 font-sans mt-1">
                  {stats.activeAlerts} {t.report.activeAlertsCount}
                </div>
              </div>
            </div>
          </div>

          {/* Sector Breakdown Section */}
          <div>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-slate-800 mb-3 flex items-center gap-2 font-sans">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 print:text-slate-700" />
              <span>{t.report.sectorBreakdown}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.sectors.map((sec) => (
                <div 
                  key={sec.sector}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#161b22] print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 print:text-slate-900 font-sans truncate">
                      {sec.sector}
                    </span>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      sec.avgChange >= 0 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 print:text-emerald-700' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 print:text-rose-700'
                    }`}>
                      {sec.avgChange >= 0 ? '+' : ''}{sec.avgChange.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans">
                    <span>{sec.count} {t.report.stockCount}</span>
                    <span className="font-mono text-slate-500">
                      {sec.stocks.map(s => s.symbol).slice(0, 3).join(', ')}{sec.stocks.length > 3 ? '...' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Stock Valuation & Alert Limits Table */}
          <div>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-slate-800 mb-3 flex items-center gap-2 font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 print:text-slate-700" />
              <span>{t.report.fullStockTable}</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 shadow-2xs">
              <table className="w-full text-left rtl:text-right border-collapse text-sm">
                <thead className="bg-slate-100 dark:bg-[#161b22] print:bg-slate-100 text-xs font-bold text-slate-600 dark:text-slate-400 print:text-slate-700 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="py-3 px-3.5">{t.report.symbol}</th>
                    <th className="py-3 px-3.5">{t.report.name}</th>
                    <th className="py-3 px-3.5">{t.report.sector}</th>
                    <th className="py-3 px-3.5 font-mono">{t.report.price}</th>
                    <th className="py-3 px-3.5 font-mono">{t.report.changePercent}</th>
                    <th className="py-3 px-3.5 font-mono">{t.report.dayRange}</th>
                    <th className="py-3 px-3.5 font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700">{t.report.upperAlert}</th>
                    <th className="py-3 px-3.5 font-mono text-rose-600 dark:text-rose-400 print:text-rose-700">{t.report.lowerAlert}</th>
                    <th className="py-3 px-3.5 text-center">{t.report.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-200 bg-white dark:bg-[#0f1115] print:bg-white text-xs sm:text-sm">
                  {stocks.map((stock) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <tr key={stock.symbol} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 print:hover:bg-transparent">
                        <td className="py-2.5 px-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400 print:text-slate-900">
                          {stock.symbol}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-slate-300 print:text-slate-800 font-sans max-w-[160px] truncate">
                          {stock.companyName || stock.symbol}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans">
                          {stock.sector || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-white print:text-slate-900">
                          ${stock.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono">
                          <span className={`font-bold ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700' : 'text-rose-600 dark:text-rose-400 print:text-rose-700'
                          }`}>
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                          {stock.dayHigh > 0 ? `$${stock.dayHigh.toFixed(2)} / $${stock.dayLow.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-semibold">
                          {stock.upperAlert !== null ? `$${stock.upperAlert.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-rose-600 dark:text-rose-400 print:text-rose-700 font-semibold">
                          {stock.lowerAlert !== null ? `$${stock.lowerAlert.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans">
                          {stock.upperCrossedState ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white">
                              تجاوز الحد ↗
                            </span>
                          ) : stock.lowerCrossedState ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500 text-white">
                              كسر الحد ↘
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 print:text-slate-600">
                              طبيعي
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance & Executive Disclaimer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-sans space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">{t.report.disclaimerTitle}</p>
            <p>{t.report.disclaimerText}</p>
          </div>

        </div>

        {/* Footer (Hidden on Print) */}
        <div className="p-4 bg-slate-50 dark:bg-[#161b22] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print transition-colors duration-200">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {stocks.length} {lang === 'ar' ? 'سهم تم تضمينه في التقرير' : 'stocks included in report'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-sans"
            >
              {t.report.btnClose}
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 font-sans"
            >
              <Printer className="w-4 h-4" />
              <span>{t.report.btnPrint}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
