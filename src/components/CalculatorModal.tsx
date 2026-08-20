import React from 'react';
import { X, Calculator } from 'lucide-react';
import { TradingCalculator } from './TradingCalculator.js';
import { Language } from '../types.js';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialSymbol?: string;
  initialBuyPrice?: number;
  initialShares?: number;
  initialCurrentPrice?: number;
  watchlistStocks?: import('../types.js').StockItem[];
  onOpenScientificAnalysis?: (symbol: string) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialSymbol,
  initialBuyPrice,
  initialShares = 50,
  initialCurrentPrice,
  watchlistStocks,
  onOpenScientificAnalysis,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {lang === 'ar' ? 'حاسبة التداول واتخاذ القرار' : 'Trading & Brokerage Calculator'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'حساب نقطة التعادل، الأرباح الصافية، والعمولات لكافة المنصات المالية مع قرار الشراء الذكي والتحليل العلمي'
                  : 'Calculate break-even prices, net profits, and actionable buy/wait decisions with scientific reasoning'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <TradingCalculator
            initialSymbol={initialSymbol}
            initialBuyPrice={initialBuyPrice}
            initialShares={initialShares}
            initialCurrentPrice={initialCurrentPrice}
            watchlistStocks={watchlistStocks}
            onOpenScientificAnalysis={onOpenScientificAnalysis}
          />
        </div>
      </div>
    </div>
  );
};
