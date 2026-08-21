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
  Clock,
  Info,
  Save,
  Check,
  Calculator,
  Briefcase
} from 'lucide-react';
import { Language, Theme, ScreenWidthMode, ScreenDensityMode } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { computeLiveMarketStatus, MarketTimeInfo } from '../utils/marketHours.js';
import { BowArrowIcon } from './BowArrowIcon.js';
import { ScreenSizeController } from './ScreenSizeController.js';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  widthMode: ScreenWidthMode;
  densityMode: ScreenDensityMode;
  onChangeWidthMode: (mode: ScreenWidthMode) => void;
  onChangeDensityMode: (mode: ScreenDensityMode) => void;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
  onOpenUpload: () => void;
  onOpenAdd: () => void;
  onOpenHistory: () => void;
  onOpenReport: () => void;
  onOpenCalculator?: () => void;
  onOpenPortfolio?: () => void;
  historyCount: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  onSaveAll: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  widthMode,
  densityMode,
  onChangeWidthMode,
  onChangeDensityMode,
  notificationPermission,
  onRequestNotifications,
  onOpenUpload,
  onOpenAdd,
  onOpenHistory,
  onOpenReport,
  onOpenCalculator,
  onOpenPortfolio,
  historyCount,
  onManualRefresh,
  isRefreshing,
  refreshInterval,
  onChangeRefreshInterval,
  onSaveAll,
  hasUnsavedChanges,
  isSaving,
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
          color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
        };
      case 'PRE':
        return {
          label: lang === 'ar' ? 'قبل الافتتاح' : 'Pre-Market',
          detail: 'Pre-Market',
          color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
      case 'POST':
        return {
          label: lang === 'ar' ? 'بعد الإغلاق' : 'After-Hours',
          detail: 'After-Hours',
          color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
        };
      case 'CLOSED':
      default:
        return {
          label: lang === 'ar' ? 'السوق مغلق' : 'Market Closed',
          detail: marketInfo.stateLabelAr,
          color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
        };
    }
  };

  const marketBadge = getMarketBadge();

  const containerWidthClass = 
    widthMode === 'fluid' 
      ? 'w-full' 
      : widthMode === 'wide' 
        ? 'w-full max-w-[1920px] mx-auto' 
        : 'w-full max-w-[1440px] mx-auto';

  return (
    <header className="sticky top-0 z-30 w-full min-h-[70px] sm:min-h-[76px] py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#0f1115]/95 backdrop-blur-lg text-slate-800 dark:text-slate-200 flex items-center px-3 sm:px-6 lg:px-8 font-sans shadow-xs dark:shadow-md transition-colors duration-200 safe-top">
      <div className={`${containerWidthClass} flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 transition-all duration-200`}>
        
        {/* Logo & Market Badge */}
        <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-5 w-full md:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-emerald-50 dark:bg-linear-to-br dark:from-[#122820] dark:to-[#0a1510] border border-emerald-500/40 rounded-xl flex items-center justify-center p-1.5 shadow-sm dark:shadow-md dark:shadow-emerald-950/40 shrink-0 group hover:border-emerald-500 transition-colors">
              <BowArrowIcon className="w-full h-full text-emerald-600 dark:text-emerald-400 drop-shadow-xs group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center select-none" style={{ direction: 'ltr' }}>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">JM</span>
                  <span className="text-slate-800 dark:text-slate-100 font-bold">Apps</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 shadow-2xs">
                  LIVE
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans hidden sm:inline truncate max-w-[200px] lg:max-w-none">
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
                <div className="absolute top-full mt-2 left-0 rtl:left-auto rtl:right-0 w-72 p-3 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 text-xs font-sans animate-fade-in text-slate-700 dark:text-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{lang === 'ar' ? 'توقيت وول ستريت (نيويورك)' : 'Wall Street Time (ET)'}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{marketInfo.nyTimeFormatted}</span>
                  </div>
                  
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{lang === 'ar' ? marketInfo.stateLabelAr : marketInfo.stateLabelEn}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'ar' ? marketInfo.sessionNoteAr : marketInfo.sessionNoteEn}</p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    <span>{lang === 'ar' ? 'الحدث القادم:' : 'Next Event:'}</span>
                    <span className="font-bold">{lang === 'ar' ? marketInfo.nextEventAr : marketInfo.nextEventEn}</span>
                  </div>

                  <div className="text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                    {lang === 'ar' 
                      ? 'الجلسة: 09:30 - 16:00 ET • الإثنين - الجمعة'
                      : 'Regular: 09:30 - 16:00 ET • Mon - Fri'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Tools & Controls */}
        <div className="flex items-center justify-between md:justify-end flex-wrap gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto mt-1 md:mt-0">
          
          {/* Main Save / Commit Changes to Database Button */}
          <button
            id="btn-save-all-stocks"
            onClick={onSaveAll}
            disabled={isSaving}
            title={hasUnsavedChanges ? t.actions.unsavedChanges : t.actions.saveTooltip}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer relative ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0f1115] shadow-md shadow-emerald-950/40 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            ) : hasUnsavedChanges ? (
              <Save className="w-4 h-4 text-emerald-100" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-semibold">
              {isSaving
                ? t.actions.saving
                : hasUnsavedChanges
                ? t.actions.saveChanges
                : t.actions.saved}
            </span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1" />
            )}
          </button>

          {/* Trading Calculator Button */}
          {onOpenCalculator && (
            <button
              id="btn-open-calculator"
              onClick={onOpenCalculator}
              title={lang === 'ar' ? 'حاسبة التداول والعمولات' : 'Trading Calculator'}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{lang === 'ar' ? 'الحاسبة' : 'Calculator'}</span>
            </button>
          )}

          {/* Portfolio Button */}
          {onOpenPortfolio && (
            <button
              id="btn-open-portfolio"
              onClick={onOpenPortfolio}
              title={lang === 'ar' ? 'المحفظة والمراكز' : 'Portfolio'}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'المحفظة' : 'Portfolio'}</span>
            </button>
          )}

          {/* Print / Generate Stock Report Button */}
          <button
            id="btn-open-report"
            onClick={onOpenReport}
            title={t.actions.printReport}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white transition-all shadow-sm border border-sky-500/30 shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{t.actions.printReport}</span>
          </button>

          {/* Quick Add Stock Button */}
          <button
            id="btn-add-stock"
            onClick={onOpenAdd}
            title={t.actions.addStock}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.actions.addStock}</span>
          </button>

          {/* Quick Upload Button */}
          <button
            id="btn-upload-file"
            onClick={onOpenUpload}
            title={t.actions.uploadFile}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">{t.actions.uploadFile}</span>
          </button>

          {/* Refresh Interval Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0a0b0d] rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs sm:text-sm shrink-0 shadow-xs">
            <button
              id="btn-manual-refresh"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              title={t.actions.refreshNow}
              className="p-1.5 sm:p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <select
              id="select-refresh-interval"
              value={refreshInterval}
              onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-mono text-xs sm:text-sm px-1.5 sm:px-2 py-1 outline-none cursor-pointer"
            >
              <option value={1000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">1s (Ultra)</option>
              <option value={2000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">2s (Fast)</option>
              <option value={3000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">3s</option>
              <option value={5000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">5s</option>
              <option value={10000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">10s</option>
              <option value={30000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">30s</option>
              <option value={60000} className="bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200">60s</option>
            </select>
          </div>

          {/* Alerts & Notifications Center Trigger (Bell Icon) */}
          <button
            id="btn-open-alerts-center"
            onClick={onOpenHistory}
            title={t.nav.alertsHistory}
            className={`relative p-2 sm:p-2.5 rounded-lg border text-xs transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
              historyCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0b0d] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {historyCount > 0 ? (
              <BellRing className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 dark:text-amber-400 animate-pulse" />
            ) : notificationPermission === 'granted' ? (
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 dark:text-emerald-400" />
            ) : notificationPermission === 'denied' ? (
              <BellOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
            ) : (
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-500 dark:text-slate-300" />
            )}

            {/* Unread Alert Count Badge */}
            {historyCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-amber-400 rounded-full font-mono shadow-sm">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>

          {/* Screen Size & Viewport Fit Controller */}
          <ScreenSizeController
            lang={lang}
            widthMode={widthMode}
            densityMode={densityMode}
            onChangeWidthMode={onChangeWidthMode}
            onChangeDensityMode={onChangeDensityMode}
          />

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            title={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0b0d] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            id="btn-toggle-lang"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold font-mono bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0b0d] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all shrink-0 shadow-xs cursor-pointer"
          >
            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
          </button>

        </div>
      </div>
    </header>
  );
};

