import React from 'react';
import { AlertNotification, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { BellRing, ArrowUpRight, ArrowDownRight, X, ExternalLink } from 'lucide-react';

interface AlertNotificationBannerProps {
  notifications: AlertNotification[];
  onDismiss: (id: string) => void;
  onSelectStock: (symbol: string) => void;
  lang: Language;
}

export const AlertNotificationBanner: React.FC<AlertNotificationBannerProps> = ({
  notifications,
  onDismiss,
  onSelectStock,
  lang,
}) => {
  const t = getTranslation(lang);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 rtl:right-auto rtl:left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-sans">
      {notifications.map((alert) => {
        const isUpper = alert.type === 'UPPER';
        const borderColor = isUpper ? 'border-l-emerald-500 rtl:border-r-emerald-500' : 'border-l-rose-500 rtl:border-r-rose-500';

        return (
          <div
            key={alert.id}
            id={`alert-toast-${alert.id}`}
            className={`pointer-events-auto p-3.5 rounded-lg shadow-2xl bg-white dark:bg-[#0f1115] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 border-l-4 rtl:border-l-0 rtl:border-r-4 ${borderColor} transition-all duration-300 animate-slide-in font-mono`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${isUpper ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                  {isUpper ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.alerts.notificationTitle}
                  </h4>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{alert.symbol}</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {isUpper ? t.alerts.typeUpper : t.alerts.typeLower}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 text-xs space-y-0.5 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.alerts.currentPrice}</span>
                <span className={`font-bold ${isUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  ${alert.triggeredPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>{t.alerts.targetLimit}</span>
                <span>${alert.targetPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onSelectStock(alert.symbol);
                  onDismiss(alert.id);
                }}
                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{t.alerts.viewStock}</span>
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
};
