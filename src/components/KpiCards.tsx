import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  BellRing, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Language, StockItem } from '../types.js';
import { getTranslation } from '../i18n/index.js';

interface KpiCardsProps {
  stocks: StockItem[];
  triggeredCountToday: number;
  lastUpdatedTime: number | null;
  refreshInterval: number;
  lang: Language;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  stocks,
  triggeredCountToday,
  lastUpdatedTime,
  refreshInterval,
  lang,
}) => {
  const t = getTranslation(lang);

  const totalStocks = stocks.length;
  const risingStocks = stocks.filter(s => s.changePercent > 0).length;
  const fallingStocks = stocks.filter(s => s.changePercent < 0).length;
  const activeAlertsCount = stocks.filter(
    s => s.alertsEnabled && (s.upperAlert !== null || s.lowerAlert !== null)
  ).length;

  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--:--';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mb-4 sm:mb-6">
      
      {/* 1. Monitored Stocks */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.monitored}</span>
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
            {totalStocks}
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-sans">
            {totalStocks === 1 ? (lang === 'ar' ? 'سهم' : 'Stock') : (lang === 'ar' ? 'أسهم' : 'Stocks')}
          </span>
        </div>
      </div>

      {/* 2. Rising Stocks */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between text-emerald-400 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.rising}</span>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {risingStocks}
          </span>
          <span className="text-[11px] sm:text-xs text-emerald-400 font-mono font-semibold">
            {totalStocks > 0 ? `${((risingStocks / totalStocks) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* 3. Falling Stocks */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-rose-500/40">
        <div className="flex items-center justify-between text-rose-400 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.falling}</span>
          <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
            {fallingStocks}
          </span>
          <span className="text-[11px] sm:text-xs text-rose-400 font-mono font-semibold">
            {totalStocks > 0 ? `${((fallingStocks / totalStocks) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* 4. Active Alerts */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-amber-500/40">
        <div className="flex items-center justify-between text-amber-400 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.alertsActive}</span>
          <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
            {activeAlertsCount}
          </span>
          <span className="text-[11px] sm:text-xs text-amber-400/90 font-sans font-semibold">
            {t.table.active}
          </span>
        </div>
      </div>

      {/* 5. Alerts Triggered */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-teal-500/40">
        <div className="flex items-center justify-between text-teal-300 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.alertsTriggered}</span>
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-teal-300">
            {triggeredCountToday}
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-sans">
            {lang === 'ar' ? 'حدث اليوم' : 'Events'}
          </span>
        </div>
      </div>

      {/* 6. Last Update */}
      <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-slate-800 flex flex-col justify-between shadow-sm transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 mb-1 sm:mb-1.5">
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider font-sans truncate">{t.kpi.lastUpdate}</span>
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 shrink-0" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg sm:text-xl font-bold font-mono text-slate-100">
            {formatTime(lastUpdatedTime)}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-sans mt-0.5">
            {t.kpi.autoRefresh}: <span className="font-mono text-emerald-400">{refreshInterval / 1000}s</span>
          </span>
        </div>
      </div>

    </div>
  );
};
