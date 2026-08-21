import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Tv, 
  Monitor, 
  Smartphone, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Check,
  X,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Language, ScreenWidthMode, ScreenDensityMode, SidebarMode } from '../types.js';

interface ScreenSizeControllerProps {
  lang: Language;
  widthMode: ScreenWidthMode;
  densityMode: ScreenDensityMode;
  sidebarMode?: SidebarMode;
  onChangeWidthMode: (mode: ScreenWidthMode) => void;
  onChangeDensityMode: (mode: ScreenDensityMode) => void;
  onChangeSidebarMode?: (mode: SidebarMode) => void;
}

export const ScreenSizeController: React.FC<ScreenSizeControllerProps> = ({
  lang,
  widthMode,
  densityMode,
  sidebarMode = 'normal',
  onChangeWidthMode,
  onChangeDensityMode,
  onChangeSidebarMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAr = lang === 'ar';

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request denied or not supported:', err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        id="btn-screen-size-settings"
        onClick={() => setIsOpen(!isOpen)}
        title={isAr ? 'ضبط وتخصيص حجم وعرض الشاشة' : 'Adjust Screen Size & Viewport'}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
          isOpen
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-sm'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#0a0b0d] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="hidden xl:inline text-xs font-mono">
          {widthMode === 'fluid' ? (isAr ? '100% شاشة كاملة' : '100% Fluid') : widthMode === 'wide' ? (isAr ? 'عرض عريض' : 'Wide') : (isAr ? 'عرض قياسي' : 'Standard')}
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute top-full mt-2 end-0 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-4 font-sans text-slate-800 dark:text-slate-100 animate-slide-in"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {isAr ? 'ضبط مقاسات وحجم الشاشة' : 'Screen & Display Settings'}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Screen Width Fit */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              {isAr ? 'عرض مساحة العمل (Layout Width):' : 'Workspace Layout Width:'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeWidthMode('fluid')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  widthMode === 'fluid'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Maximize2 className="w-4 h-4 mb-1" />
                <span>{isAr ? 'ملء 100%' : '100% Fluid'}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeWidthMode('wide')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  widthMode === 'wide'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-4 h-4 mb-1" />
                <span>{isAr ? 'عريض (1920)' : 'Wide (1920)'}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeWidthMode('standard')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  widthMode === 'standard'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span>{isAr ? 'قياسي (1440)' : 'Standard'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Density / Zoom Scale */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              {isAr ? 'كثافة وحجم العناصر والخطوط (Density):' : 'Display Scale & Density:'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeDensityMode('compact')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  densityMode === 'compact'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ZoomOut className="w-4 h-4 mb-1" />
                <span>{isAr ? 'مكثف (90%)' : 'Compact'}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeDensityMode('normal')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  densityMode === 'normal'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 mb-1" />
                <span>{isAr ? 'افتراضي' : 'Default'}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeDensityMode('comfortable')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                  densityMode === 'comfortable'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ZoomIn className="w-4 h-4 mb-1" />
                <span>{isAr ? 'مريح (110%)' : 'Comfortable'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Sidebar Mode (Compact / Normal) */}
          {onChangeSidebarMode && (
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                {isAr ? 'عرض القوائم الجانبية (Sidebars):' : 'Sidebar & Drawers Display:'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeSidebarMode('normal')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    sidebarMode === 'normal'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <PanelRightOpen className="w-4 h-4" />
                  <span>{isAr ? 'عادي (440px)' : 'Normal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSidebarMode('compact')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    sidebarMode === 'compact'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <PanelRightClose className="w-4 h-4" />
                  <span>{isAr ? 'مدمج (320px)' : 'Compact'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Native Fullscreen Toggle Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-xs"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'إنهاء وضع ملء الشاشة' : 'Exit Fullscreen'}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'تفعيل ملء الشاشة الكاملة (F11)' : 'Toggle Fullscreen Mode'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
