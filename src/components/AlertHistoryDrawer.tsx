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
  AlertTriangle 
} from 'lucide-react';
import { AlertHistoryItem, Language } from '../types.js';
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
}) => {
  const t = getTranslation(lang);

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

      {/* Slide-in Panel */}
      <div 
        className="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 w-full max-w-md bg-[#0f1115] border-l rtl:border-l-0 rtl:border-r border-slate-800 shadow-2xl flex flex-col z-50 transition-transform duration-300 animate-slide-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 id="alert-drawer-title" className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                {t.alerts.historyTitle}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {history.length} {lang === 'ar' ? 'تنبيه مسجل' : 'records'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-alert-history"
            onClick={onClose}
            aria-label={t.actions.cancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Chime & Notifications Test Banner */}
        <div className="p-3 bg-[#11141a] border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'اختبار نغمة التنبيه الصوتية:' : 'Test Audio Chime:'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleTestChime('UPPER')}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-1 ${
                  testedChime === 'UPPER'
                    ? 'bg-emerald-500 text-black border-emerald-400 scale-95'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                <span>▲ {lang === 'ar' ? 'صعود' : 'Upper'}</span>
              </button>
              <button
                onClick={() => handleTestChime('LOWER')}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-1 ${
                  testedChime === 'LOWER'
                    ? 'bg-rose-500 text-white border-rose-400 scale-95'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                }`}
              >
                <span>▼ {lang === 'ar' ? 'هبوط' : 'Lower'}</span>
              </button>
            </div>
          </div>

          {/* Browser Notification Status Indicator */}
          {onRequestNotifications && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1">
                <Bell className="w-3 h-3 text-slate-400" />
                <span>{lang === 'ar' ? 'إشعارات المتصفح:' : 'Browser Alerts:'}</span>
              </span>
              <button
                onClick={onRequestNotifications}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all border ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
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
        <div className="p-3 border-b border-slate-800 space-y-2 bg-[#161b22]/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={t.actions.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 rtl:pl-2.5 rtl:pr-8 py-1.5 rounded-lg text-xs font-mono bg-[#0a0b0d] border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 font-mono">
              {(['ALL', 'UPPER', 'LOWER'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    filterType === type
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#0a0b0d] text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {type === 'ALL' ? t.filters.all : type === 'UPPER' ? t.alerts.typeUpper : t.alerts.typeLower}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                id="btn-clear-alert-history"
                onClick={onClearHistory}
                className="text-[11px] font-bold font-mono uppercase text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.alerts.clearHistory}</span>
              </button>
            )}
          </div>
        </div>

        {/* History Records List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-500 text-xs font-mono">
              <Clock className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
              <p>{t.alerts.noHistory}</p>
              <span className="text-[10px] text-slate-600 mt-1 max-w-[220px]">
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
                  className="p-3 rounded-lg bg-[#161b22] border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 font-mono group"
                >
                  <div 
                    onClick={() => {
                      onSelectStock(item.symbol);
                      onClose();
                    }}
                    className="cursor-pointer flex-1"
                    title={lang === 'ar' ? 'اضغط لعرض تفاصيل السهم' : 'Click to view stock details'}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {item.symbol}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isUpper 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}>
                        {isUpper ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isUpper ? t.alerts.typeUpper : t.alerts.typeLower}</span>
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span>{t.alerts.triggeredPrice}: <b className={isUpper ? 'text-emerald-400' : 'text-rose-400'}>${item.triggeredPrice.toFixed(2)}</b></span>
                      <span className="text-slate-600">•</span>
                      <span>{t.alerts.targetPrice}: ${item.targetPrice.toFixed(2)}</span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDateTime(item.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteHistoryItem(item.id)}
                    title={lang === 'ar' ? 'حذف هذا السجل' : 'Delete this record'}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
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
