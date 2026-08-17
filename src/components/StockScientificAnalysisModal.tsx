import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  BarChart2,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Calendar,
  Building2,
  Zap,
  Percent,
  Check,
  AlertOctagon,
  HelpCircle,
  Printer,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  Lock,
  ArrowRight,
  TrendingDown as BearishIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  ComposedChart
} from 'recharts';
import { StockItem, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { apiService } from '../services/api.js';
import {
  runScientificAnalysis,
  QuantitativeAnalysisResult,
  QuantitativeConfig,
  DEFAULT_CONFIG
} from '../utils/quantitativeEngine.js';

interface StockScientificAnalysisModalProps {
  stock: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onUpdateAlerts: (symbol: string, upperAlert: number | null, lowerAlert: number | null, alertsEnabled: boolean) => void;
}

type TabType = 'DECISION' | 'CHARTS' | 'VOLUME' | 'FUNDAMENTALS' | 'DILUTION' | 'BACKTEST' | 'FACTORS' | 'ALERTS';

export const StockScientificAnalysisModal: React.FC<StockScientificAnalysisModalProps> = ({
  stock,
  isOpen,
  onClose,
  lang,
  onUpdateAlerts,
}) => {
  const t = getTranslation(lang);

  const [activeTab, setActiveTab] = useState<TabType>('DECISION');
  const [selectedRange, setSelectedRange] = useState<string>('1D');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fullData, setFullData] = useState<any>(null);
  const [userWeights, setUserWeights] = useState<QuantitativeConfig['weights']>(DEFAULT_CONFIG.weights);
  const [showCustomWeights, setShowCustomWeights] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(true);

  // Alert Inputs
  const [upperVal, setUpperVal] = useState<string>('');
  const [lowerVal, setLowerVal] = useState<string>('');
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load Deep Data on Open or Stock Change
  useEffect(() => {
    if (stock && isOpen) {
      setUpperVal(stock.upperAlert !== null ? stock.upperAlert.toString() : '');
      setLowerVal(stock.lowerAlert !== null ? stock.lowerAlert.toString() : '');
      setAlertsEnabled(stock.alertsEnabled);
      loadAnalysisData(stock.symbol);
    }
  }, [stock?.symbol, isOpen]);

  const loadAnalysisData = async (symbol: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.fetchFullAnalysis(symbol);
      setFullData(data);
    } catch (err) {
      console.error('Failed to load full analysis data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Real-Time Scientific Quantitative Analysis Engine
  const analysis: QuantitativeAnalysisResult | null = useMemo(() => {
    if (!stock) return null;
    
    // Merge live quote into fullData if available
    const mergedData = fullData ? { ...fullData } : {
      symbol: stock.symbol,
      quote: {
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        open: stock.open,
        previousClose: stock.previousClose,
        high: stock.dayHigh,
        low: stock.dayLow,
        volume: stock.volume,
        fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh || stock.price,
        fiftyTwoWeekLow: stock.fiftyTwoWeekLow || stock.price,
        marketState: stock.marketState || 'REGULAR',
        timestamp: stock.lastUpdated || Date.now(),
      },
      charts: {},
    };

    if (mergedData.quote && stock.price > 0) {
      mergedData.quote.price = stock.price;
      mergedData.quote.change = stock.change;
      mergedData.quote.changePercent = stock.changePercent;
      mergedData.quote.volume = stock.volume || mergedData.quote.volume;
    }

    return runScientificAnalysis(mergedData, { weights: userWeights });
  }, [stock, fullData, userWeights]);

  if (!isOpen || !stock || !analysis) return null;

  const isAr = lang === 'ar';
  const isPositive = analysis.change >= 0;

  const handleSaveAlerts = () => {
    const u = upperVal.trim() ? parseFloat(upperVal) : null;
    const l = lowerVal.trim() ? parseFloat(lowerVal) : null;
    onUpdateAlerts(
      stock.symbol,
      isNaN(u as any) ? null : u,
      isNaN(l as any) ? null : l,
      alertsEnabled
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Active chart series based on selectedRange
  const activeChartSeries = fullData?.charts?.[selectedRange] || [];

  // Decision Badging Helper
  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'BUY_CANDIDATE':
        return {
          title: isAr ? 'مرشح للشراء' : 'BUY CANDIDATE',
          subtitle: isAr ? 'توافق كمي وصعودي قوي' : 'Strong Multi-Factor Alignment',
          bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
          solidBg: 'bg-emerald-600 text-white',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />,
        };
      case 'WAIT':
        return {
          title: isAr ? 'انتظار وتأكيد' : 'WAIT / CONFIRM',
          subtitle: isAr ? 'بانتظار تصحيح أو تأكيد السيولة' : 'Awaiting Pullback or Volume Surge',
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
          solidBg: 'bg-amber-500 text-black',
          icon: <Clock className="w-8 h-8 text-amber-400 shrink-0" />,
        };
      case 'STOP_BUYING':
      default:
        return {
          title: isAr ? 'توقف عن الشراء / تجنب' : 'STOP BUYING / AVOID',
          subtitle: isAr ? 'مخاطر مرتفعة أو غياب الشروط' : 'High Risk Profile or Buy Blockers',
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          solidBg: 'bg-rose-600 text-white',
          icon: <AlertOctagon className="w-8 h-8 text-rose-400 shrink-0" />,
        };
    }
  };

  const decisionBadge = getDecisionBadge(analysis.decision);

  const formatNumber = (num?: number, prefix = '$', decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(decimals)}M`;
    return `${prefix}${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2.5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans"
    >
      <div className={`bg-[#0a0d13] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl w-full flex flex-col overflow-hidden animate-slide-in font-sans transition-all duration-200 ${
        isMaximized ? 'max-w-[99vw] h-[97vh]' : 'max-w-6xl max-h-[92vh]'
      }`}>
        
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#11151e] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wider">
                  {analysis.symbol}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {fullData?.exchange || stock.exchange || 'US Market'}
                </span>
                <span className="text-xs text-slate-400 hidden md:inline">
                  • {fullData?.sector || stock.sector || 'General Market'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                {fullData?.companyName || stock.companyName || analysis.symbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Live Price Block */}
            <div className="text-right rtl:text-left">
              <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-center gap-1.5 justify-end">
                <span>${analysis.price.toFixed(2)}</span>
              </div>
              <div className={`text-xs font-mono font-bold flex items-center justify-end gap-1.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>{isPositive ? '+' : ''}${analysis.change.toFixed(2)}</span>
                <span>({isPositive ? '+' : ''}{analysis.changePercent.toFixed(2)}%)</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 rtl:border-l-0 rtl:border-r rtl:pr-2">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? (isAr ? 'استعادة الحجم العادي' : 'Restore Size') : (isAr ? 'تكبير ملء الشاشة' : 'Maximize Fullscreen')}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => loadAnalysisData(analysis.symbol)}
                title={isAr ? 'تحديث البيانات فوراً' : 'Refresh Realtime Data'}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                onClick={handlePrint}
                title={isAr ? 'طباعة التقرير الاستشاري' : 'Print Advisory Report'}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-3 sm:px-6 bg-[#0d1017] border-b border-slate-800/90 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'DECISION', label: isAr ? 'القرار والاستشارة' : 'Advisory Decision', icon: <Target className="w-4 h-4" /> },
            { id: 'CHARTS', label: isAr ? 'الشارت والمؤشرات' : 'Technicals & Charts', icon: <BarChart2 className="w-4 h-4" /> },
            { id: 'VOLUME', label: isAr ? 'الحجم والسرعة RVOL' : 'Volume & RVOL', icon: <Activity className="w-4 h-4" /> },
            { id: 'FUNDAMENTALS', label: isAr ? 'التحليل المالي والجودة' : 'Financial Quality', icon: <Building2 className="w-4 h-4" /> },
            { id: 'DILUTION', label: isAr ? 'مخاطر التخفيف والتقسيم' : 'Dilution & Splits', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'BACKTEST', label: isAr ? 'اختبار الإشارة تاريخياً' : 'Historical Backtest', icon: <Zap className="w-4 h-4" /> },
            { id: 'FACTORS', label: isAr ? 'تفكيك القرار والأوزان' : 'Factor Breakdown', icon: <Sliders className="w-4 h-4" /> },
            { id: 'ALERTS', label: isAr ? 'التنبيهات والتنفيذ' : 'Alerts & Execution', icon: <Target className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body: 1 Column on Mobile, 2 Columns on Large Screens */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#0a0d13]">

          {/* ===================== TAB 1: EXECUTIVE DECISION & ADVISORY ===================== */}
          {activeTab === 'DECISION' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1 (Left): Decision, 4 Core Gauges & Executive Summary */}
              <div className="space-y-5">
                
                {/* Decision Banner */}
                <div className={`p-4 sm:p-5 rounded-2xl border ${decisionBadge.bg} shadow-lg relative overflow-hidden`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-2xl bg-black/40 border border-slate-700/50">
                        {decisionBadge.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-xl sm:text-2xl font-black tracking-wide font-sans text-white">
                            {decisionBadge.title}
                          </h2>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-black/50 border border-slate-700">
                            {analysis.decision}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium">
                          {isAr ? analysis.decisionReasonAr : analysis.decisionReason}
                        </p>
                        <p className="text-xs text-emerald-400 font-semibold pt-1">
                          👉 {isAr ? analysis.decisionActionPromptAr : analysis.decisionActionPrompt}
                        </p>
                      </div>
                    </div>

                    {/* Dual Horizon Badges */}
                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-xl border border-slate-800 text-center">
                      <div className="border-r border-slate-800 rtl:border-r-0 rtl:border-l pr-2 rtl:pr-0 rtl:pl-2">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">
                          {isAr ? 'مضاربة قصيرة الأجل' : 'Short-Term Trading'}
                        </span>
                        <span className={`text-xs font-bold ${
                          analysis.shortTermTradingDecision === 'BUY_CANDIDATE' ? 'text-emerald-400' : (analysis.shortTermTradingDecision === 'WAIT' ? 'text-amber-400' : 'text-rose-400')
                        }`}>
                          {analysis.shortTermTradingDecision}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">
                          {isAr ? 'استثمار طويل الأجل' : 'Long-Term Investment'}
                        </span>
                        <span className={`text-xs font-bold ${
                          analysis.longTermInvestmentDecision === 'BUY_CANDIDATE' ? 'text-emerald-400' : (analysis.longTermInvestmentDecision === 'WAIT' ? 'text-amber-400' : 'text-rose-400')
                        }`}>
                          {analysis.longTermInvestmentDecision}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Core Quantitative Score Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Investment Score */}
                  <div className="bg-[#11151e] border border-slate-800 p-3.5 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="truncate">{isAr ? 'درجة الاستثمار' : 'Investment Score'}</span>
                      <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {analysis.investmentScore}
                      </span>
                      <span className="text-[11px] text-slate-500">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                        style={{ width: `${analysis.investmentScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      {analysis.investmentScore >= 75 ? (isAr ? 'توافق ممتاز' : 'Optimal') : (analysis.investmentScore >= 55 ? (isAr ? 'توافق متوسط' : 'Moderate') : (isAr ? 'توافق ضعيف' : 'Poor'))}
                    </span>
                  </div>

                  {/* Momentum Score */}
                  <div className="bg-[#11151e] border border-slate-800 p-3.5 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="truncate">{isAr ? 'درجة الزخم' : 'Momentum'}</span>
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-cyan-400">
                        {analysis.momentumScore}
                      </span>
                      <span className="text-[11px] text-slate-500">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all"
                        style={{ width: `${analysis.momentumScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      {isAr ? `السرعة: ${analysis.velocity.priceVelocity}%/س` : `Velocity: ${analysis.velocity.priceVelocity}%/h`}
                    </span>
                  </div>

                  {/* Risk Score */}
                  <div className="bg-[#11151e] border border-slate-800 p-3.5 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="truncate">{isAr ? 'درجة المخاطر' : 'Risk Score'}</span>
                      <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${analysis.riskScore > 65 ? 'text-rose-400' : (analysis.riskScore > 40 ? 'text-amber-400' : 'text-emerald-400')}`} />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black font-mono ${analysis.riskScore > 65 ? 'text-rose-400' : (analysis.riskScore > 40 ? 'text-amber-400' : 'text-emerald-400')}`}>
                        {analysis.riskScore}
                      </span>
                      <span className="text-[11px] text-slate-500">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${analysis.riskScore > 65 ? 'bg-rose-500' : (analysis.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                        style={{ width: `${analysis.riskScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      {analysis.riskScore <= 45 ? (isAr ? 'مخاطر منخفضة' : 'Low Risk') : (analysis.riskScore <= 65 ? (isAr ? 'مخاطر متوسطة' : 'Moderate') : (isAr ? 'مخاطر عالية' : 'High Risk'))}
                    </span>
                  </div>

                  {/* Confidence Score */}
                  <div className="bg-[#11151e] border border-slate-800 p-3.5 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="truncate">{isAr ? 'درجة الثقة' : 'Confidence'}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-purple-400">
                        {analysis.confidenceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all"
                        style={{ width: `${analysis.confidenceScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      {isAr ? `جودة البيانات: ${analysis.dataQualityScore}%` : `Data Quality: ${analysis.dataQualityScore}%`}
                    </span>
                  </div>
                </div>

                {/* Executive Summary Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#131822] to-[#0f131a] border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'الخلاصة الاستشارية الشاملة' : 'Executive Advisory Synthesis'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {analysis.summaryArabic.headline}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysis.summaryArabic.body}
                  </p>
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800/80 text-slate-300">
                      <strong className="text-emerald-400 block mb-0.5">{isAr ? 'التوجيه السعري:' : 'Entry Guidance:'}</strong>
                      {analysis.summaryArabic.entryGuidance}
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800/80 text-slate-300">
                      <strong className="text-rose-400 block mb-0.5">{isAr ? 'الحماية والوقف:' : 'Stop Guidance:'}</strong>
                      {analysis.summaryArabic.stopGuidance}
                    </div>
                  </div>
                </div>

              </div>

              {/* Column 2 (Right): Execution Blueprint & Buy Blockers / Supporting Criteria */}
              <div className="space-y-5">
                
                {/* Trade Execution Blueprint Card */}
                <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {isAr ? 'خطة التنفيذ وإدارة الصفقة العلمية' : 'Trade Execution Blueprint'}
                      </h3>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800/90 font-mono text-slate-300">
                      {isAr ? 'العائد/المخاطرة' : 'R:R'}: <strong className={analysis.tradeSetup.isRiskRewardAcceptable ? 'text-emerald-400' : 'text-amber-400'}>1 : {analysis.tradeSetup.riskRewardRatio}</strong>
                    </span>
                  </div>

                  {/* Do Not Chase Banner */}
                  {analysis.tradeSetup.isDoNotChase && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <strong className="font-bold">{isAr ? 'تحذير: لا تطارد السهم!' : 'DO NOT CHASE!'}</strong>{' '}
                        {isAr
                          ? `السعر متوسع بنسبة ${analysis.tradeSetup.distanceFromIdealEntryPercent}% أعلى منطقة الدخول الآمنة.`
                          : `Price is extended ${analysis.tradeSetup.distanceFromIdealEntryPercent}% above ideal entry.`}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    {/* Preferred Entry */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {isAr ? 'منطقة الدخول المثالية' : 'Preferred Entry Zone'}
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                        ${analysis.tradeSetup.preferredEntryMin} – ${analysis.tradeSetup.preferredEntryMax}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        VWAP: ${analysis.technicals.vwap}
                      </span>
                    </div>

                    {/* Stop Loss */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {isAr ? 'وقف الخسارة العلمي' : 'Scientific Stop Loss'}
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-rose-400">
                        ${analysis.tradeSetup.stopLoss}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1 truncate">
                        {isAr ? analysis.tradeSetup.stopLossReasonAr : analysis.tradeSetup.stopLossReason}
                      </span>
                    </div>

                    {/* Target 1 */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {isAr ? 'الهدف الأول (T1)' : 'Target 1 (Primary)'}
                      </span>
                      <div className="text-base sm:text-lg font-bold font-mono text-cyan-400">
                        ${analysis.tradeSetup.target1}
                      </div>
                      <span className="text-[10px] text-emerald-400 block mt-1">
                        +{(((analysis.tradeSetup.target1 - analysis.price) / analysis.price) * 100).toFixed(1)}% {isAr ? 'عائد متوقع' : 'gain'}
                      </span>
                    </div>

                    {/* Target 2 & 3 */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        {isAr ? 'الأهداف الممتدة (T2 / T3)' : 'Extended (T2 / T3)'}
                      </span>
                      <div className="text-xs sm:text-sm font-bold font-mono text-slate-200 mt-1">
                        T2: <span className="text-cyan-400">${analysis.tradeSetup.target2}</span> | T3: <span className="text-indigo-400">${analysis.tradeSetup.target3}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        {isAr ? 'امتدادات ATR والمقاومات' : 'ATR & Res expansions'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buy Blockers Panel */}
                <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>{isAr ? 'موانع الشراء والمخاطر الحرجة' : 'Active Buy Blockers'}</span>
                  </div>
                  {analysis.buyBlockers.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{isAr ? 'لا توجد موانع شراء حاسمة - الشروط آمنة' : 'No Critical Buy Blockers Active'}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {analysis.buyBlockers.map((b, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{isAr ? b.textAr : b.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Supporting Positive Drivers */}
                <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'أهم محركات القرار الإيجابية' : 'Key Positive Drivers'}</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.reasons.map((r, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                          r.type === 'pro'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        }`}
                      >
                        {r.type === 'pro' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <span>{isAr ? r.textAr : r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ===================== TAB 2: TECHNICALS & CHARTS ===================== */}
          {activeTab === 'CHARTS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Interactive Chart + Volume Sub-chart */}
              <div className="space-y-4">
                {/* Timeframes bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#11151e] p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1">
                    {['1D', '5D', '1M', '3M', '6M', '1Y'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition ${
                          selectedRange === range
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    VWAP: ${analysis.technicals.vwap}
                  </span>
                </div>

                {/* Main Interactive Chart */}
                <div className="bg-[#11151e] p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                    <span className="font-bold text-slate-200">
                      {isAr ? `الرسم البياني ومستويات التداول (${selectedRange})` : `Price Action & Levels (${selectedRange})`}
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
                      <span className="text-emerald-400">VWAP</span>
                      <span className="text-rose-400">Stop: ${analysis.tradeSetup.stopLoss}</span>
                      <span className="text-purple-400">T1: ${analysis.tradeSetup.target1}</span>
                    </div>
                  </div>

                  <div className="h-72 sm:h-80 w-full">
                    {activeChartSeries.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={activeChartSeries} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                          <defs>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={30} />
                          <YAxis domain={['auto', 'auto']} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} orientation="right" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                          />
                          <ReferenceLine y={analysis.technicals.vwap} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'VWAP', fill: '#10b981', fontSize: 10 }} />
                          <ReferenceLine y={analysis.tradeSetup.stopLoss} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Stop', fill: '#f43f5e', fontSize: 10 }} />
                          <ReferenceLine y={analysis.tradeSetup.target1} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'T1', fill: '#a855f7', fontSize: 10 }} />
                          <Area type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#priceGrad)" name="Close" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        {isAr ? 'جاري تحميل الشارت...' : 'Loading Chart Data...'}
                      </div>
                    )}
                  </div>

                  {/* Volume Sub-Chart */}
                  {activeChartSeries.length > 0 && activeChartSeries[0]?.volume !== undefined && (
                    <div className="pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{isAr ? 'تدفق السيولة والحجم' : 'Volume Flow'}</span>
                        <span className="font-mono text-cyan-400">RVOL: {analysis.volumeDynamics.rvol}x</span>
                      </div>
                      <div className="h-20 sm:h-24 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={activeChartSeries} margin={{ top: 0, right: 5, left: 5, bottom: 0 }}>
                            <XAxis dataKey="date" hide />
                            <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} orientation="right" />
                            <Tooltip contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                            <Bar dataKey="volume" fill="#0284c7" opacity={0.7} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Indicators Grid & Pivots */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#11151e] border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">EMA 9 / 20 / 50</span>
                    <div className="text-xs font-mono font-bold text-slate-200 truncate">
                      ${analysis.technicals.ema9} / ${analysis.technicals.ema20} / ${analysis.technicals.ema50}
                    </div>
                    <span className="text-[10px] text-emerald-400 block mt-1 truncate">
                      {analysis.trend.emaAlignment ? (isAr ? 'ترتيب صاعد' : 'Bullish') : (isAr ? 'ترتيب مختلط' : 'Mixed')}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#11151e] border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">RSI (14) & ATR (14)</span>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      RSI: <strong className={analysis.technicals.rsi14 > 70 ? 'text-amber-400' : 'text-cyan-400'}>{analysis.technicals.rsi14}</strong> | ATR: ${analysis.technicals.atr14}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      ADX Trend: {analysis.technicals.adx14.adx}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#11151e] border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">MACD (12, 26, 9)</span>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      Hist: <span className={analysis.technicals.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{analysis.technicals.macd.histogram}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      {analysis.technicals.macd.state}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#11151e] border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">Bollinger Bands (20, 2)</span>
                    <div className="text-xs font-mono font-bold text-slate-200 truncate">
                      U: ${analysis.technicals.bollingerBands.upper} | L: ${analysis.technicals.bollingerBands.lower}
                    </div>
                    <span className="text-[10px] text-cyan-400 block mt-1 truncate">
                      BW: {analysis.technicals.bollingerBands.bandwidth}%
                    </span>
                  </div>
                </div>

                {/* Support & Resistance Table */}
                <div className="p-4 bg-[#11151e] border border-slate-800 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-200 block">
                    {isAr ? 'مستويات الدعم والمقاومة اللحظية' : 'Key Support & Resistance Levels'}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">{isAr ? 'أقرب مقاومة (R1)' : 'Nearest Res (R1)'}</span>
                      <span className="text-amber-400 font-bold text-sm">${analysis.levels.nearestResistance}</span>
                    </div>
                    <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">{isAr ? 'أقرب دعم (S1)' : 'Nearest Support (S1)'}</span>
                      <span className="text-emerald-400 font-bold text-sm">${analysis.levels.nearestSupport}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 3: VOLUME & VELOCITY ===================== */}
          {activeTab === 'VOLUME' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: RVOL Executive Gauge */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-mono block">
                    {isAr ? 'حجم التداول النسبي (Relative Volume)' : 'Relative Volume (RVOL)'}
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-black font-mono text-cyan-400">
                      {analysis.volumeDynamics.rvol}x
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {analysis.volumeDynamics.rvolClass}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">
                    {analysis.volumeDynamics.rvolDescriptionAr}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Weak (&lt;1x)</span>
                    <span>Normal (1-1.5x)</span>
                    <span>Elevated (1.5-2x)</span>
                    <span>Strong (2-4x)</span>
                    <span>Surge (&gt;4x)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-slate-600" style={{ width: '20%' }} />
                    <div className="h-full bg-blue-600" style={{ width: '20%' }} />
                    <div className="h-full bg-emerald-500" style={{ width: '20%' }} />
                    <div className="h-full bg-cyan-400" style={{ width: '20%' }} />
                    <div className="h-full bg-purple-500" style={{ width: '20%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono pt-2">
                  <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">{isAr ? 'الحجم الحالي' : 'Current Volume'}</span>
                    <span className="font-bold text-slate-200">{formatNumber(analysis.volumeDynamics.currentVolume, '', 0)}</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">{isAr ? 'متوسط 20 يوم' : 'Avg Vol (20D)'}</span>
                    <span className="font-bold text-slate-200">{formatNumber(analysis.volumeDynamics.avgVolume20D, '', 0)}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Dollar Volume, Velocity & Density */}
              <div className="space-y-3.5">
                <div className="p-4 bg-[#11151e] border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">{isAr ? 'القيمة النقدية المتداولة' : 'Dollar Volume ($)'}</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {formatNumber(analysis.volumeDynamics.dollarVolume)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {isAr ? 'حجم السيولة الإجمالية المنفذة اليوم' : 'Total capital traded today'}
                  </span>
                </div>

                <div className="p-4 bg-[#11151e] border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">{isAr ? 'سرعة السعر (Price Velocity)' : 'Price Velocity'}</span>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {analysis.velocity.priceVelocity}% <span className="text-xs text-slate-500">/ hr</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {isAr ? `التسارع: ${analysis.velocity.priceAcceleration}` : `Acceleration: ${analysis.velocity.priceAcceleration}`}
                  </span>
                </div>

                <div className="p-4 bg-[#11151e] border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400">{isAr ? 'كثافة التنفيذ في الدقيقة' : 'Volume per Minute'}</span>
                  <div className="text-xl font-bold font-mono text-purple-400">
                    {formatNumber(analysis.volumeDynamics.volumePerMinute, '', 0)} <span className="text-xs text-slate-500">sh/min</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {isAr ? 'معدل الصفقات اللحظي التقديري' : 'Estimated trade frequency'}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 4: FUNDAMENTAL QUALITY ===================== */}
          {activeTab === 'FUNDAMENTALS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Financial Quality Score & Revenues */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-mono block">
                    {isAr ? 'درجة جودة القوائم المالية' : 'Fundamental Quality Score'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-emerald-400">
                      {analysis.financialQualityScore}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {analysis.financialQualityScore >= 70
                      ? (isAr ? 'شركة مستقرة مالياً وتتمتع بتدفقات نقدية وهوامش ربحية قوية' : 'Strong fundamentals and cash generation')
                      : (analysis.financialQualityScore >= 45
                          ? (isAr ? 'أداء مالي متوسط أو متقلب' : 'Moderate operational results')
                          : (isAr ? 'شركة ذات خسائر تشغيلية أو ضغوط تمويلية' : 'Strained cash flow or operating losses'))}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الإيرادات' : 'Revenue'}</span>
                    <span className="text-sm font-bold text-slate-200">{formatNumber(fullData?.financials?.revenue)}</span>
                    <span className={`text-[10px] block mt-1 ${(fullData?.financials?.revenueGrowth ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fullData?.financials?.revenueGrowth !== undefined ? `Growth: ${fullData.financials.revenueGrowth}%` : '-'}
                    </span>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'صافي الدخل' : 'Net Income'}</span>
                    <span className={`text-sm font-bold ${(fullData?.financials?.netIncome ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatNumber(fullData?.financials?.netIncome)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      EPS: {fullData?.financials?.eps !== undefined ? `$${fullData.financials.eps}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 2: Cash Flow, Debt & Liquidity Ratios */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-200 block">
                  {isAr ? 'التدفقات النقدية والملاءة المالية' : 'Cash Flow & Balance Sheet Solvency'}
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'التدفق النقدي الحر' : 'Free Cash Flow'}</span>
                    <span className={`text-sm font-bold ${(fullData?.financials?.freeCashflow ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatNumber(fullData?.financials?.freeCashflow)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Cash: {formatNumber(fullData?.financials?.totalCash)}
                    </span>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'السيولة والديون' : 'Current & Debt'}</span>
                    <span className="text-sm font-bold text-slate-200">
                      CR: {fullData?.financials?.currentRatio ?? 'N/A'} | D/E: {fullData?.financials?.debtToEquity ?? 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Debt: {formatNumber(fullData?.financials?.totalDebt)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 5: DILUTION & REVERSE SPLITS ===================== */}
          {activeTab === 'DILUTION' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Dilution Risk */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                    <ShieldAlert className="w-5 h-5" />
                    <span>{isAr ? 'مخاطر التخفيف (Dilution)' : 'Dilution & Offering Risk'}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    analysis.dilutionAndSplits.dilutionRisk === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' : (
                      analysis.dilutionAndSplits.dilutionRisk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    )
                  }`}>
                    {analysis.dilutionAndSplits.dilutionRisk} RISK
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {analysis.dilutionAndSplits.dilutionRisk === 'CRITICAL' || analysis.dilutionAndSplits.dilutionRisk === 'HIGH'
                    ? (isAr ? 'تنبيه: الشركة تعاني من حرق سيولة سريع أو أسهم حرة منخفضة (Micro Float)، مما يرفع احتمال طرح أسهم جديدة.' : 'Warning: High probability of secondary equity offerings or dilution.')
                    : (isAr ? 'هيكل الأسهم متوازن ومستقر، ولا توجد مؤشرات تخفيف حادة في الوقت الحالي.' : 'Capital structure is stable with low immediate risk of shareholder dilution.')}
                </p>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'الأسهم القائمة' : 'Shares Out'}</span>
                    <span className="text-slate-200 font-bold">{formatNumber(analysis.dilutionAndSplits.sharesOutstanding, '', 0)}</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'الأسهم الحرة (Float)' : 'Float Shares'}</span>
                    <span className="text-slate-200 font-bold">{formatNumber(analysis.dilutionAndSplits.floatShares, '', 0)}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Reverse Splits & Order Book */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{isAr ? 'مخاطر التقسيم العكسي' : 'Reverse Split & Compliance'}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Risk: <strong className={analysis.dilutionAndSplits.reverseSplitRiskScore > 50 ? 'text-rose-400' : 'text-emerald-400'}>{analysis.dilutionAndSplits.reverseSplitRiskScore}/100</strong>
                  </span>
                </div>

                {analysis.dilutionAndSplits.minimumListingWarning && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                    ⚠️ {isAr ? 'السعر أقل من $1.00 - يواجه السهم خطر متطلبات الامتثال لدى البورصة.' : 'Price is below $1.00 minimum listing rule threshold.'}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'آخر تقسيم' : 'Last Split'}</span>
                    <span className="text-slate-200 font-bold">{analysis.dilutionAndSplits.lastSplit || (isAr ? 'لا يوجد' : 'None')}</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'كفاءة السبريد' : 'Bid/Ask Spread'}</span>
                    <span className="text-emerald-400 font-bold">{analysis.orderBook.ratingAr} ({analysis.orderBook.spreadPercent ?? 0}%)</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 6: BACKTEST & PROBABILITIES ===================== */}
          {activeTab === 'BACKTEST' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Historical Setup Backtest */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span>{isAr ? 'اختبار الإشارة تاريخياً على السهم' : 'Historical Signal Test'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {isAr
                      ? `محاكاة كمية لـ ${analysis.backtest.similarHistoricalSetups} شمعة تاريخية سابقة طابقت نفس المعايير.`
                      : `Simulated over ${analysis.backtest.similarHistoricalSetups} matching historical setups.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'نسبة النجاح' : 'Win Rate'}</span>
                    <span className="text-xl font-bold text-emerald-400">{analysis.backtest.successRate}%</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'متوسط الربح' : 'Avg Gain'}</span>
                    <span className="text-xl font-bold text-cyan-400">+{analysis.backtest.averageGainPercent}%</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'متوسط الخسارة' : 'Avg Loss'}</span>
                    <span className="text-xl font-bold text-rose-400">-{analysis.backtest.averageLossPercent}%</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">{isAr ? 'الصفقات الرابحة/الخاسرة' : 'Wins / Losses'}</span>
                    <span className="text-xl font-bold text-slate-200">{analysis.backtest.successfulSetups} / {analysis.backtest.failedSetups}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Expected Value & Directional Distribution */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">{isAr ? 'القيمة الرياضية المتوقعة (Expected Value)' : 'Expected Value (EV)'}</span>
                  <span className={`text-xl font-black font-mono ${analysis.backtest.isExpectedValuePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {analysis.backtest.expectedValuePercent >= 0 ? '+' : ''}{analysis.backtest.expectedValuePercent}%
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs text-slate-400 uppercase font-mono block">
                    {isAr ? 'توزيع الاحتمالات للحركة القادمة' : 'Directional Probability Distribution'}
                  </span>
                  
                  <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${analysis.probabilities.bullishPercent}%` }} />
                    <div className="h-full bg-slate-600" style={{ width: `${analysis.probabilities.neutralPercent}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${analysis.probabilities.bearishPercent}%` }} />
                  </div>

                  <div className="flex justify-between text-xs font-mono pt-1">
                    <span className="text-emerald-400">Bullish: {analysis.probabilities.bullishPercent}%</span>
                    <span className="text-slate-400">Neutral: {analysis.probabilities.neutralPercent}%</span>
                    <span className="text-rose-400">Bearish: {analysis.probabilities.bearishPercent}%</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 7: FACTORS & WEIGHTS ===================== */}
          {activeTab === 'FACTORS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Factor Scoring Table */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isAr ? 'جدول تفكيك درجات القرار' : 'Factor Scoring Table'}
                  </h3>
                  <button
                    onClick={() => setShowCustomWeights(!showCustomWeights)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showCustomWeights ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'تعديل الأوزان' : 'Weights')}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left rtl:text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2 px-2">{isAr ? 'العامل' : 'Factor'}</th>
                        <th className="py-2 px-2">{isAr ? 'الدرجة' : 'Score'}</th>
                        <th className="py-2 px-2">{isAr ? 'الوزن' : 'Weight'}</th>
                        <th className="py-2 px-2">{isAr ? 'المساهمة' : 'Contrib'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {analysis.factors.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-2 font-semibold text-slate-200">
                            {isAr ? f.factorAr : f.factor}
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold">
                            <span className={f.score >= 70 ? 'text-emerald-400' : (f.score >= 45 ? 'text-amber-400' : 'text-rose-400')}>
                              {f.score}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-400">
                            {f.weight}%
                          </td>
                          <td className="py-2.5 px-2 font-mono text-cyan-400 font-bold">
                            +{f.contribution}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column 2: Weights Customizer */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isAr ? 'تخصيص أوزان الحساب الرياضي' : 'Custom Weight Adjustments'}
                </h3>
                <div className="space-y-3 text-xs">
                  {Object.entries(userWeights).map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span className="capitalize">{k}</span>
                        <span className="font-mono text-emerald-400 font-bold">{v}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={v}
                        onChange={(e) => {
                          const newW = { ...userWeights, [k]: parseInt(e.target.value, 10) };
                          setUserWeights(newW);
                        }}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ===================== TAB 8: ALERTS & EXECUTION ===================== */}
          {activeTab === 'ALERTS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              
              {/* Column 1: Alert Threshold Inputs */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    <span>{isAr ? 'تنبيهات الأسعار ومستويات التنفيذ' : 'Price Alert Thresholds'}</span>
                  </h3>
                  {savedSuccess && (
                    <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {isAr ? 'تم الحفظ' : 'Saved'}
                    </span>
                  )}
                </div>

                <div className="space-y-3.5">
                  {/* Upper Alert Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 flex items-center justify-between">
                      <span>{isAr ? 'التنبيه العلوي (مقاومة / هدف $)' : 'Upper Alert Threshold ($)'}</span>
                      <button
                        type="button"
                        onClick={() => setUpperVal(analysis.tradeSetup.target1.toString())}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        {isAr ? 'تطبيق Target 1' : 'Apply Target 1'}
                      </button>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={upperVal}
                      onChange={(e) => setUpperVal(e.target.value)}
                      placeholder={analysis.tradeSetup.target1.toString()}
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Lower Alert Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 flex items-center justify-between">
                      <span>{isAr ? 'التنبيه السفلي (دعم / وقف خسارة $)' : 'Lower Alert Threshold ($)'}</span>
                      <button
                        type="button"
                        onClick={() => setLowerVal(analysis.tradeSetup.stopLoss.toString())}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        {isAr ? 'تطبيق Stop Loss' : 'Apply Stop Loss'}
                      </button>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={lowerVal}
                      onChange={(e) => setLowerVal(e.target.value)}
                      placeholder={analysis.tradeSetup.stopLoss.toString()}
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>{isAr ? 'تفعيل نظام التنبيهات الفورية' : 'Enable Real-Time Alerts'}</span>
                  </label>

                  <button
                    onClick={handleSaveAlerts}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition"
                  >
                    {isAr ? 'حفظ التنبيهات' : 'Save Alerts'}
                  </button>
                </div>
              </div>

              {/* Column 2: Execution Status Summary */}
              <div className="bg-[#11151e] border border-slate-800 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-200 block">
                  {isAr ? 'إرشادات التنفيذ والانضباط' : 'Execution Discipline & Guidelines'}
                </span>
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                    <strong className="text-emerald-400 block mb-1">{isAr ? 'الانضباط السعري:' : 'Price Discipline:'}</strong>
                    {isAr
                      ? 'الالتزام التام بنطاق الدخول ووقف الخسارة العلمي يحميك من تقلبات السوق المفاجئة وفخاخ السيولة الوهمية.'
                      : 'Strict adherence to entry zones and stop losses prevents drawdown during sudden reversals.'}
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                    <strong className="text-cyan-400 block mb-1">{isAr ? 'التنبيهات اللحظية:' : 'Live Notifications:'}</strong>
                    {isAr
                      ? 'يرسل النظام إشعارات صوتية ومرئية فورية فور اختراق السعر لأي من المستويات المحددة.'
                      : 'The system triggers visual and audio notifications the exact second prices cross your levels.'}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
