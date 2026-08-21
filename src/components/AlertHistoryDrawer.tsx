import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Search, 
  BellRing, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Volume2, 
  Bell, 
  CheckCircle2, 
  AlertTriangle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { AlertHistoryItem, Language, SidebarMode } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { alertEngine } from '../utils/alertEngine.js';

interface AlertHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  history: AlertHistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onSelectStock: (symbol: string) => void;
  notificationPermission?: NotificationPermission;
  onRequestNotifications?: () => void;
  sidebarMode?: SidebarMode;
  onToggleSidebarMode?: () => void;
}

export const AlertHistoryDrawer: React.FC<AlertHistoryDrawerProps> = ({
  isOpen,
  onClose,
  lang,
  history,
  onDeleteHistoryItem,
  onClearHistory,
  onSelectStock,
  notificationPermission = 'default',
  onRequestNotifications,
  sidebarMode = 'normal',
  onToggleSidebarMode,
}) => {
  const t = getTranslation(lang);
  const isCompact = sidebarMode === 'compact';

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UPPER' | 'LOWER'>('ALL');
  const [testedChime, setTestedChime] = useState<'UPPER' | 'LOWER' | null>(null);

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = 
        item.symbol.toLowerCase().includes(search.toLowerCase()) ||
        (item.companyName && item.companyName.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'ALL' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [history, search, filterType]);

  const handleTestChime = (type: 'UPPER' | 'LOWER') => {
    alertEngine.playAlertChime(type);
    setTestedChime(type);
    setTimeout(() => setTestedChime(null), 1200);
  };

  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Clickable Dimmed Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* Slide-in Panel with Compact Mode Support */}
      <div 
        className={`drawer-panel fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 bg-white dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50 transition-all duration-300 animate-slide-in ${
          isCompact ? 'drawer-compact w-full max-w-[320px]' : 'w-full max-w-md'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-drawer-title"
      >
        {/* Drawer Header */}
        <div className={`drawer-header border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#161b22] transition-colors duration-200 ${
          isCompact ? 'p-2.5 sm:p-3' : 'p-4'
        }`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 ${
              isCompact ? 'p-1.5' : 'p-2'
            }`}>
              <BellRing className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="alert-drawer-title" className={`font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono truncate ${
                isCompact ? 'text-xs' : 'text-sm'
              }`}>
                {t.alerts.historyTitle}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {history.length} {lang === 'ar' ? 'تنبيه مسجل' : 'records'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleSidebarMode && (
              <button
                type="button"
                onClick={onToggleSidebarMode}
                title={isCompact 
                  ? (lang === 'ar' ? 'تكبير عرض القائمة' : 'Expand Sidebar') 
                  : (lang === 'ar' ? 'الوضع المدمج للقائمة' : 'Compact Sidebar')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              id="btn-close-alert-history"
              onClick={onClose}
              aria-label={t.actions.cancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
            >
              <X className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          </div>
        </div>

        {/* Audio Chime & Notifications Test Banner */}
        <div className={`bg-slate-100 dark:bg-[#11141a] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 ${
          isCompact ? 'p-2 space-y-1.5 text-[10px]' : 'p-3 space-y-2.5 text-[11px]'
        }`}>
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'نغمة التنبيه:' : 'Chime:'}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleTestChime('UPPER')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-0.5 ${
                  testedChime === 'UPPER'
                    ? 'bg-emerald-500 text-white border-emerald-400 scale-95'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                <span>▲ {lang === 'ar' ? 'صعود' : 'Up'}</span>
              </button>
              <button
                onClick={() => handleTestChime('LOWER')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-0.5 ${
                  testedChime === 'LOWER'
                    ? 'bg-rose-500 text-white border-rose-400 scale-95'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                }`}
              >
                <span>▼ {lang === 'ar' ? 'هبوط' : 'Down'}</span>
              </button>
            </div>
          </div>

          {/* Browser Notification Status Indicator */}
          {onRequestNotifications && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80 gap-1 flex-wrap">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
                <Bell className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{lang === 'ar' ? 'الإشعارات:' : 'Alerts:'}</span>
              </span>
              <button
                onClick={onRequestNotifications}
                className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold font-mono transition-all border shrink-0 ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
                }`}
              >
                {notificationPermission === 'granted' 
                  ? (lang === 'ar' ? 'مفعلة ✓' : 'Enabled ✓')
                  : notificationPermission === 'denied'
                  ? (lang === 'ar' ? 'محظورة' : 'Blocked')
                  : (lang === 'ar' ? 'تفعيل الآن' : 'Enable Now')}
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className={`border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161b22]/40 transition-colors duration-200 ${
          isCompact ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
        }`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-2 rtl:left-auto rtl:right-2 text-slate-400" />
            <input
              type="text"
              placeholder={t.actions.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="drawer-search w-full pl-7 pr-2 rtl:pl-2 rtl:pr-7 py-1 rounded-lg text-xs font-mono bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
            <div className="flex items-center gap-1 font-mono shrink-0">
              {(['ALL', 'UPPER', 'LOWER'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`drawer-badge rounded font-bold uppercase transition-all ${
                    isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
                  } ${
                    filterType === type
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#0a0b0d] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {type === 'ALL' ? t.filters.all : type === 'UPPER' ? (isCompact ? '▲' : t.alerts.typeUpper) : (isCompact ? '▼' : t.alerts.typeLower)}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                id="btn-clear-alert-history"
                onClick={onClearHistory}
                className="text-[10px] font-bold font-mono uppercase text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>{t.alerts.clearHistory}</span>
              </button>
            )}
          </div>
        </div>

        {/* History Records List */}
        <div className={`overflow-y-auto flex-1 bg-white dark:bg-[#0f1115] ${
          isCompact ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
        }`}>
          {filteredHistory.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-500 text-xs font-mono p-4">
              <Clock className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
              <p>{t.alerts.noHistory}</p>
              <span className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 max-w-[200px]">
                {lang === 'ar' 
                  ? 'ستظهر هنا التنبيهات تلقائياً عند وصول سعر أي سهم للحد الأعلى أو الأدنى'
                  : 'Alerts will appear here when stock prices reach upper or lower thresholds'}
              </span>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isUpper = item.type === 'UPPER';
              return (
                <div
                  key={item.id}
                  className={`drawer-item rounded-lg bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2 font-mono group ${
                    isCompact ? 'p-2 text-xs' : 'p-3 text-xs'
                  }`}
                >
                  <div 
                    onClick={() => {
                      onSelectStock(item.symbol);
                      onClose();
                    }}
                    className="cursor-pointer flex-1 min-w-0"
                    title={lang === 'ar' ? 'اضغط لعرض تفاصيل السهم' : 'Click to view stock details'}
                  >
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                        {item.symbol}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold uppercase border shrink-0 ${
                        isUpper 
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      }`}>
                        {isUpper ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                        <span>{isUpper ? t.alerts.typeUpper : t.alerts.typeLower}</span>
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="shrink-0">{t.alerts.triggeredPrice}: <b className={isUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>${item.triggeredPrice.toFixed(2)}</b></span>
                      <span className="text-slate-400 dark:text-slate-600 shrink-0">•</span>
                      <span className="shrink-0">{t.alerts.targetPrice}: ${item.targetPrice.toFixed(2)}</span>
                    </div>

                    <div className="text-[9px] sm:text-[10px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{formatDateTime(item.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteHistoryItem(item.id)}
                    title={lang === 'ar' ? 'حذف هذا السجل' : 'Delete this record'}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

