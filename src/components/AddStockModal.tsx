import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Language, StockItem } from '../types.js';
import { getTranslation } from '../i18n/index.js';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  existingSymbols: string[];
  onAddStock: (symbol: string, upperAlert: number | null, lowerAlert: number | null) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  lang,
  existingSymbols,
  onAddStock,
}) => {
  const t = getTranslation(lang);

  const [symbol, setSymbol] = useState('');
  const [upperAlert, setUpperAlert] = useState('');
  const [lowerAlert, setLowerAlert] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSym = symbol.trim().toUpperCase();

    if (!cleanSym || !/^[A-Z0-9.\-=]{1,10}$/.test(cleanSym)) {
      setError(t.addModal.invalidSymbol);
      return;
    }

    if (existingSymbols.map(s => s.toUpperCase()).includes(cleanSym)) {
      setError(t.addModal.alreadyExists);
      return;
    }

    const upperVal = upperAlert.trim() ? parseFloat(upperAlert) : null;
    const lowerVal = lowerAlert.trim() ? parseFloat(lowerAlert) : null;

    onAddStock(
      cleanSym,
      isNaN(upperVal as any) ? null : upperVal,
      isNaN(lowerVal as any) ? null : lowerVal
    );

    setSymbol('');
    setUpperAlert('');
    setLowerAlert('');
    setError(null);
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-white dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-slide-in transition-colors duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#161b22] transition-colors duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              {t.addModal.title}
            </h2>
          </div>

          <button
            id="btn-close-add-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white dark:bg-[#0f1115]">
          
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Symbol Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 font-mono">
              {t.addModal.tickerLabel} <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-add-ticker"
              type="text"
              required
              autoFocus
              placeholder={t.addModal.tickerPlaceholder}
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setError(null);
              }}
              className="w-full px-3 py-2 rounded text-xs font-mono font-bold tracking-wider bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
            />
          </div>

          {/* Upper Alert */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 font-mono flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.addModal.upperAlertLabel}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">$</span>
              <input
                id="input-add-upper-alert"
                type="number"
                step="0.01"
                min="0"
                placeholder="235.00"
                value={upperAlert}
                onChange={(e) => setUpperAlert(e.target.value)}
                className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2 rounded text-xs font-mono bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Lower Alert */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1 font-mono flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{t.addModal.lowerAlertLabel}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">$</span>
              <input
                id="input-add-lower-alert"
                type="number"
                step="0.01"
                min="0"
                placeholder="210.00"
                value={lowerAlert}
                onChange={(e) => setLowerAlert(e.target.value)}
                className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2 rounded text-xs font-mono bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              id="btn-submit-add-stock"
              className="px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xs transition-all"
            >
              {t.addModal.addBtn}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
