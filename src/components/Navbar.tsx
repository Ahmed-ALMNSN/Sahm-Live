import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Bell, 
  BellRing, 
  BellOff, 
  Sun, 
  Moon, 
  Globe, 
  RefreshCw, 
  Upload, 
  PlusCircle, 
  History,
  Activity,
  Printer,
  Database,
  Clock,
  Info
} from 'lucide-react';
import { Language, Theme } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { computeLiveMarketStatus, MarketTimeInfo } from '../utils/marketHours.js';
import { BowArrowIcon } from './BowArrowIcon.js';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
  onOpenUpload: () => void;
  onOpenAdd: () => void;
  onOpenHistory: () => void;
  onOpenReport: () => void;
  historyCount: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  notificationPermission,
  onRequestNotifications,
  onOpenUpload,
  onOpenAdd,
  onOpenHistory,
  onOpenReport,
  historyCount,
  onManualRefresh,
  isRefreshing,
  refreshInterval,
  onChangeRefreshInterval,
}) => {
  const t = getTranslation(lang);

  // Live real-time market status and Wall Street (ET) clock
  const [marketInfo, setMarketInfo] = useState<MarketTimeInfo>(() => computeLiveMarketStatus());
  const [showMarketTooltip, setShowMarketTooltip] = useState(false);

  useEffect(() => {
    // Initial compute
    setMarketInfo(computeLiveMarketStatus());

    // Tick every second to keep live ET clock and transitions accurate
    const timer = setInterval(() => {
      setMarketInfo(computeLiveMarketStatus());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getMarketBadge = () => {
    switch (marketInfo.state) {
      case 'REGULAR':
        return {
          label: lang === 'ar' ? 'السوق مفتوح' : 'Market Open',
          detail: lang === 'ar' ? 'الجلسة الرسمية' : 'Regular Session',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
        };
      case 'PRE':
        return {
          label: lang === 'ar' ? 'قبل الافتتاح' : 'Pre-Market',
          detail: 'Pre-Market',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
      case 'POST':
        return {
          label: lang === 'ar' ? 'بعد الإغلاق' : 'After-Hours',
          detail: 'After-Hours',
          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
        };
      case 'CLOSED':
      default:
        return {
          label: lang === 'ar' ? 'السوق مغلق' : 'Market Closed',
          detail: marketInfo.stateLabelAr,
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
        };
    }
  };

  const marketBadge = getMarketBadge();

  return (
    <header className="sticky top-0 z-30 w-full min-h-[70px] sm:min-h-[76px] py-3 sm:py-4 border-b border-slate-800/90 bg-[#0f1115]/95 backdrop-blur-lg text-slate-200 flex items-center px-4 sm:px-6 lg:px-10 font-sans shadow-md safe-top">
      <div className="w-full max-w-[1680px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        
        {/* Logo & Market + SQLite Badge */}
        <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-5 w-full md:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-linear-to-br from-[#122820] to-[#0a1510] border border-emerald-500/40 rounded-xl flex items-center justify-center p-1.5 shadow-md shadow-emerald-950/40 shrink-0 group hover:border-emerald-400 transition-colors">
              <BowArrowIcon className="w-full h-full text-emerald-400 drop-shadow-sm group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white font-mono flex items-center select-none" style={{ direction: 'ltr' }}>
                  <span className="text-emerald-400 font-extrabold">JM</span>
                  <span className="text-slate-100 font-bold">Apps</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 font-mono tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 shadow-2xs">
                  LIVE
                </span>
              </div>
              <span className="text-xs text-slate-400 font-sans hidden sm:inline truncate max-w-[200px] lg:max-w-none">
                {t.app.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Market State Badge & Tooltip Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMarketTooltip(prev => !prev)}
                onMouseEnter={() => setShowMarketTooltip(true)}
                onMouseLeave={() => setShowMarketTooltip(false)}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-xs transition-all cursor-pointer ${marketBadge.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${marketBadge.dot} animate-pulse`} />
                <span>{marketBadge.label}</span>
                <span className="hidden sm:inline opacity-70 text-[10px] font-mono border-l rtl:border-l-0 rtl:border-r border-current pl-1.5 rtl:pl-0 rtl:pr-1.5">
                  {marketInfo.nyTimeFormatted}
                </span>
              </button>

              {/* Market Schedule Hover Details Popover */}
              {showMarketTooltip && (
                <div className="absolute top-full mt-2 left-0 rtl:left-auto rtl:right-0 w-72 p-3 bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl z-50 text-xs font-sans animate-fade-in text-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'ar' ? 'توقيت وول ستريت (نيويورك)' : 'Wall Street Time (ET)'}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{marketInfo.nyTimeFormatted}</span>
                  </div>
                  
                  <div className="text-[11px] text-slate-300">
                    <p className="font-semibold text-white">{lang === 'ar' ? marketInfo.stateLabelAr : marketInfo.stateLabelEn}</p>
                    <p className="text-slate-400 mt-0.5">{lang === 'ar' ? marketInfo.sessionNoteAr : marketInfo.sessionNoteEn}</p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-amber-400 font-mono">
                    <span>{lang === 'ar' ? 'الحدث القادم:' : 'Next Event:'}</span>
                    <span className="font-bold">{lang === 'ar' ? marketInfo.nextEventAr : marketInfo.nextEventEn}</span>
                  </div>

                  <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-800/60 font-mono">
                    {lang === 'ar' 
                      ? 'الجلسة: 09:30 - 16:00 ET • الإثنين - الجمعة'
                      : 'Regular: 09:30 - 16:00 ET • Mon - Fri'}
                  </div>
                </div>
              )}
            </div>

            {/* SQLite Storage Indicator */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-slate-900/90 border border-slate-700/80 text-slate-300 shadow-xs">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>SQLite Active</span>
            </div>
          </div>
        </div>

        {/* Action Tools & Controls */}
        <div className="flex items-center justify-between md:justify-end flex-wrap gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto mt-1 md:mt-0">
          
          {/* Print / Generate Stock Report Button */}
          <button
            id="btn-open-report"
            onClick={onOpenReport}
            title={t.actions.printReport}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-sky-600/90 hover:bg-sky-500 active:scale-95 text-white transition-all shadow-sm border border-sky-400/30 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{t.actions.printReport}</span>
          </button>

          {/* Quick Add Stock Button */}
          <button
            id="btn-add-stock"
            onClick={onOpenAdd}
            title={t.actions.addStock}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.actions.addStock}</span>
          </button>

          {/* Quick Upload Button */}
          <button
            id="btn-upload-file"
            onClick={onOpenUpload}
            title={t.actions.uploadFile}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition-all shrink-0"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">{t.actions.uploadFile}</span>
          </button>

          {/* Refresh Interval Selector */}
          <div className="flex items-center bg-[#0a0b0d] rounded-lg border border-slate-700 p-0.5 text-xs sm:text-sm shrink-0 shadow-xs">
            <button
              id="btn-manual-refresh"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              title={t.actions.refreshNow}
              className="p-1.5 sm:p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <select
              id="select-refresh-interval"
              value={refreshInterval}
              onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-300 font-mono text-xs sm:text-sm px-1.5 sm:px-2 py-1 outline-none cursor-pointer"
            >
              <option value={3000} className="bg-[#161b22] text-slate-200">3s</option>
              <option value={5000} className="bg-[#161b22] text-slate-200">5s</option>
              <option value={10000} className="bg-[#161b22] text-slate-200">10s</option>
              <option value={30000} className="bg-[#161b22] text-slate-200">30s</option>
              <option value={60000} className="bg-[#161b22] text-slate-200">60s</option>
            </select>
          </div>

          {/* Alerts & Notifications Center Trigger (Bell Icon) */}
          <button
            id="btn-open-alerts-center"
            onClick={onOpenHistory}
            title={t.nav.alertsHistory}
            className={`relative p-2 sm:p-2.5 rounded-lg border text-xs transition-all shrink-0 active:scale-95 shadow-xs ${
              historyCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-[#0a0b0d] hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {historyCount > 0 ? (
              <BellRing className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-pulse" />
            ) : notificationPermission === 'granted' ? (
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" />
            ) : notificationPermission === 'denied' ? (
              <BellOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
            ) : (
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-300" />
            )}

            {/* Unread Alert Count Badge */}
            {historyCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-amber-400 rounded-full font-mono shadow-sm">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            id="btn-toggle-lang"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold font-mono bg-[#0a0b0d] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all shrink-0 shadow-xs"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
          </button>

        </div>
      </div>
    </header>
  );
};

