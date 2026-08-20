import React from 'react';
import { Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Language } from '../types.js';

interface ReportLoadingOverlayProps {
  isOpen: boolean;
  stepText: string;
  stageIndex?: number;
  totalStages?: number;
  isComplete?: boolean;
  lang: Language;
}

export const ReportLoadingOverlay: React.FC<ReportLoadingOverlayProps> = ({
  isOpen,
  stepText,
  stageIndex = 1,
  totalStages = 10,
  isComplete = false,
  lang,
}) => {
  if (!isOpen) return null;
  const isAr = lang === 'ar';
  const progressPercent = isComplete ? 100 : Math.min(95, Math.round((stageIndex / totalStages) * 100));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-slate-900/95 text-white rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 animate-scale-up">
        <div className="flex justify-center">
          {isComplete ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center">
              <Loader2 className="w-9 h-9 animate-spin text-blue-400" />
            </div>
          )}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 mb-2">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'محرك التقرير المؤسسي' : 'Institutional Report Engine'}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-white">
            {isAr ? 'جاري إعداد التقرير المالي الشامل' : 'Generating Institutional Research'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-2 min-h-[22px] transition-all">
            {stepText}
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete ? 'w-full bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{isAr ? `المرحلة ${stageIndex} من ${totalStages}` : `Stage ${stageIndex} of ${totalStages}`}</span>
            <span>{isComplete ? (isAr ? 'اكتمل التحليل' : 'Complete') : (isAr ? 'معالجة كمية...' : 'Processing...')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
