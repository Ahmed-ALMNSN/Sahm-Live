import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../types.js';

export interface ChartControlToolbarProps {
  subIndicator?: 'volume' | 'rsi' | 'macd' | 'mfi' | 'none';
  onSubIndicatorChange?: (ind: 'volume' | 'rsi' | 'macd' | 'mfi' | 'none') => void;
  showBollinger?: boolean;
  onToggleBollinger?: () => void;
  showEma20?: boolean;
  onToggleEma20?: () => void;
  showVwap?: boolean;
  onToggleVwap?: () => void;
  chartType?: 'candlestick' | 'area' | 'line' | 'bars' | 'heikinAshi';
  onChartTypeChange?: (type: 'candlestick' | 'area' | 'line' | 'bars' | 'heikinAshi') => void;
  selectedTimeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  lang?: Language;
  className?: string;
}

export const ChartControlToolbar: React.FC<ChartControlToolbarProps> = ({
  subIndicator = 'volume',
  onSubIndicatorChange,
  showBollinger = false,
  onToggleBollinger,
  showEma20 = true,
  onToggleEma20,
  showVwap = true,
  onToggleVwap,
  chartType = 'candlestick',
  onChartTypeChange,
  selectedTimeframe = '1D',
  onTimeframeChange,
  lang = 'ar',
  className = '',
}) => {
  const isAr = lang === 'ar';

  const timeframes = ['1Y', '1M', '5D', '1D', '1h', '30m', '15m', '5m', '2m', '1m'];

  return (
    <div
      id="exact-match-chart-control-toolbar"
      dir="ltr"
      className={`flex flex-wrap items-center gap-2.5 p-2 bg-white/95 dark:bg-[#0d121c]/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm ${className}`}
    >
      {/* 1. Vol / Sub-indicator Dropdown with Chevron */}
      <div className="relative inline-flex items-center">
        <select
          id="toolbar-sub-indicator-select"
          value={subIndicator}
          onChange={(e) => onSubIndicatorChange?.(e.target.value as any)}
          aria-label="Sub indicator"
          className="appearance-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold pl-7 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 transition cursor-pointer shadow-sm outline-none"
        >
          <option value="volume">Vol</option>
          <option value="rsi">RSI</option>
          <option value="macd">MACD</option>
          <option value="mfi">MFI</option>
          <option value="none">{isAr ? 'إخفاء' : 'None'}</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-2 pointer-events-none" />
      </div>

      {/* 2. Technical Indicator Pills: BB, EMA20, VWAP */}
      <div className="flex items-center gap-1.5">
        {/* BB (Bollinger Bands) */}
        <button
          type="button"
          id="toolbar-toggle-bb"
          onClick={onToggleBollinger}
          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
            showBollinger
              ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-sm'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          BB
        </button>

        {/* EMA20 */}
        <button
          type="button"
          id="toolbar-toggle-ema20"
          onClick={onToggleEma20}
          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
            showEma20
              ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 shadow-sm'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          EMA20
        </button>

        {/* VWAP */}
        <button
          type="button"
          id="toolbar-toggle-vwap"
          onClick={onToggleVwap}
          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
            showVwap
              ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          VWAP
        </button>
      </div>

      {/* 3. Chart Type Segmented Control: [ HA | خط | مساحي | شموع ] */}
      <div className="flex items-center bg-[#F1F4F9] dark:bg-[#111622] rounded-xl p-1 border border-slate-200/90 dark:border-slate-800 gap-0.5 shadow-inner">
        {/* HA */}
        <button
          type="button"
          id="toolbar-chart-type-ha"
          onClick={() => onChartTypeChange?.('heikinAshi')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
            chartType === 'heikinAshi'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          HA
        </button>

        {/* خط (Line) */}
        <button
          type="button"
          id="toolbar-chart-type-line"
          onClick={() => onChartTypeChange?.('line')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
            chartType === 'line'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          {isAr ? 'خط' : 'Line'}
        </button>

        {/* مساحي (Area) */}
        <button
          type="button"
          id="toolbar-chart-type-area"
          onClick={() => onChartTypeChange?.('area')}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
            chartType === 'area'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          {isAr ? 'مساحي' : 'Area'}
        </button>

        {/* شموع (Candles) */}
        <button
          type="button"
          id="toolbar-chart-type-candlestick"
          onClick={() => onChartTypeChange?.('candlestick')}
          className={`px-3.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
            chartType === 'candlestick'
              ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm font-black'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          {isAr ? 'شموع' : 'Candles'}
        </button>
      </div>

      {/* 4. Timeframe Selector: [ 1Y | 1M | 5D | 1D | 1h | 30m | 15m | 5m | 2m | 1m ] */}
      <div className="flex items-center bg-[#F1F4F9] dark:bg-[#111622] rounded-xl p-1 border border-slate-200/90 dark:border-slate-800 gap-0.5 shadow-inner">
        {timeframes.map((tf) => {
          const isActive = selectedTimeframe?.toUpperCase() === tf.toUpperCase();
          return (
            <button
              key={tf}
              type="button"
              id={`toolbar-tf-${tf}`}
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
                isActive
                  ? 'bg-[#008CA6] hover:bg-[#007D94] text-white shadow-sm font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/40'
              }`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
};
