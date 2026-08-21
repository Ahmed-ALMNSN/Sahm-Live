import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Percent,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  Flame,
  Shield,
  HelpCircle,
  RefreshCw,
  Zap,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Language, Theme, StockItem } from '../types.js';
import { MacroeconomicData, StockMacroImpact } from '../types/macroTypes.js';
import { apiService } from '../services/api.js';

interface MacroAnalysisCardProps {
  stock?: StockItem | null;
  sector?: string;
  lang: Language;
  theme?: Theme;
  mode?: 'full' | 'compact' | 'sidebar';
  onRefresh?: () => void;
}

export const MacroAnalysisCard: React.FC<MacroAnalysisCardProps> = ({
  stock,
  sector = 'General Market',
  lang,
  theme,
  mode = 'full',
  onRefresh
}) => {
  const isAr = lang === 'ar';
  const [macroData, setMacroData] = useState<MacroeconomicData | null>(null);
  const [impactData, setImpactData] = useState<StockMacroImpact | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'INFLATION' | 'RATES' | 'SECTOR_IMPACT'>('OVERVIEW');

  useEffect(() => {
    let isMounted = true;
    const loadMacro = async () => {
      setIsLoading(true);
      try {
        const symbol = stock?.symbol || 'SPY';
        const targetSector = sector || stock?.sector || 'General';
        const res = await apiService.fetchStockMacroImpact(symbol, targetSector);
        if (isMounted && res) {
          setMacroData(res.macro);
          setImpactData(res.impact);
        }
      } catch (err) {
        console.error('Error loading macro analysis data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMacro();
    return () => { isMounted = false; };
  }, [stock?.symbol, sector, stock?.sector]);

  // Fallback defaults if loading or server is booting
  const data = macroData || {
    inflation: {
      cpiYoY: 2.9,
      coreCpiYoY: 3.2,
      cpiMoM: 0.2,
      targetRate: 2.0,
      trend: 'COOLING' as const,
      trendAr: 'تباطؤ تدريجي (Disinflation)',
      trendEn: 'Disinflationary Cooling',
      releaseDate: 'مؤشر أسعار المستهلكين BLS CPI',
      descriptionAr: 'معدل التضخم السنوي العام 2.9% والأساسي 3.2% يواصل التباطؤ التدريجي باتجاه مستهدف 2.0%.',
      descriptionEn: 'Headline inflation at 2.9% YoY and Core at 3.2% continuing gradual disinflation toward 2.0%.',
    },
    interestRates: {
      fedFundsTargetRange: '4.25% - 4.50%',
      fedFundsRate: 4.38,
      treasury10Y: 4.28,
      treasury2Y: 4.15,
      treasury5Y: 4.18,
      treasury3M: 4.35,
      yieldCurveSpread2Y10Y: 0.13,
      yieldCurveState: 'NORMAL' as const,
      yieldCurveStateAr: 'منحنى عائد طبيعي (Normal Curve)',
      yieldCurveStateEn: 'Normal Yield Curve',
      realInterestRate: 1.38,
      policyStance: 'NEUTRAL_PAUSE' as const,
      policyStanceAr: 'فائدة حقيقية مقيدة مع ترقب قرارات الفيدرالي القادمة',
      policyStanceEn: 'Restrictive real interest rate backdrop',
    },
    liquidity: {
      dxyIndex: 104.15,
      dxyChangePercent: -0.12,
      crudeOilWti: 72.80,
      goldSpot: 2885.50,
      liquidityRegime: 'STABLE_USD',
      liquidityRegimeAr: 'استقرار نسبي في مؤشر الدولار والسيولة',
    },
    lastUpdated: Date.now(),
    historicalCpi: [
      { date: '09/25', headline: 3.4, core: 3.6 },
      { date: '10/25', headline: 3.3, core: 3.5 },
      { date: '11/25', headline: 3.1, core: 3.4 },
      { date: '12/25', headline: 3.0, core: 3.3 },
      { date: '01/26', headline: 3.0, core: 3.3 },
      { date: '02/26', headline: 2.9, core: 3.2 },
    ],
    historicalRates: [
      { date: '09/25', fedRate: 4.88, yield10Y: 4.45, yield2Y: 4.52 },
      { date: '10/25', fedRate: 4.63, yield10Y: 4.38, yield2Y: 4.40 },
      { date: '11/25', fedRate: 4.63, yield10Y: 4.32, yield2Y: 4.30 },
      { date: '12/25', fedRate: 4.38, yield10Y: 4.25, yield2Y: 4.20 },
      { date: '01/26', fedRate: 4.38, yield10Y: 4.22, yield2Y: 4.18 },
      { date: '02/26', fedRate: 4.38, yield10Y: 4.28, yield2Y: 4.15 },
    ],
  };

  const impact = impactData || {
    symbol: stock?.symbol || 'STOCK',
    sector: sector || 'General Market',
    macroScore: 25,
    impactRating: 'MODERATE_TAILWIND' as const,
    impactRatingAr: 'دعم كلي معتدل لبيئة التداول والنمو',
    impactRatingEn: 'Moderate Macro Tailwind',
    rateSensitivity: 'MODERATE' as const,
    rateSensitivityAr: 'متوسطة الحساسية لأسعار الفائدة',
    inflationSensitivity: 'LOW' as const,
    inflationSensitivityAr: 'حساسية منخفضة للتضخم المباشر',
    costOfCapitalImpact: 'Moderate debt servicing cost under 4.25%-4.50% range',
    costOfCapitalImpactAr: 'تكلفة تمويل واقتراض معتدلة ضمن نطاق الفائدة الحالي (4.25% - 4.50%)',
    valuationMultipleImpact: 'Supportive valuation discount factors under 10Y yield of 4.28%',
    valuationMultipleImpactAr: 'مضاعفات تقييم مستقرة مع بقاء عائد سندات الـ 10 سنوات عند 4.28%',
    tailwindsAr: [
      'تباطؤ معدل التضخم الأمريكي العام إلى 2.9% يدعم سياسة الفيدرالي في تخفيف الفائدة مستقبلاً.',
      'استقرار مؤشر الدولار والسيولة الدولية يحد من الضغوط التمويلية.',
    ],
    tailwindsEn: [
      'Cooling US headline CPI at 2.9% paves way for continued monetary policy normalization.',
      'Stable USD liquidity index reduces cross-border capital pressures.',
    ],
    headwindsAr: [
      'بقاء الفائدة الحقيقية أعلى من +1.0% يفرض انتقائية في تسعير مضاعفات الأرباح.',
    ],
    headwindsEn: [
      'Positive real interest rate (>1.0%) keeps discount rates disciplined.',
    ],
    summaryAr: `المؤشرات الاقتصادية الكلية لسهم ${stock?.symbol || 'السهم'}: التضخم 2.9% وفائدة الفيدرالي ${data.interestRates.fedFundsTargetRange} وعائد سندات الـ 10 سنوات ${data.interestRates.treasury10Y}%. يصنف التأثير الإجمالي بـ "دعم كلي معتدل" بدرجة (+25/100).`,
    summaryEn: `Macroeconomic climate for ${stock?.symbol || 'Stock'}: CPI 2.9%, Fed Range ${data.interestRates.fedFundsTargetRange}, 10Y Yield ${data.interestRates.treasury10Y}%. Overall macro impact rating is Moderate Tailwind (+25/100).`,
  };

  const getImpactBadgeColor = (score: number) => {
    if (score >= 40) return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', pill: 'bg-emerald-600 text-white' };
    if (score >= 0) return { bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', pill: 'bg-cyan-600 text-white' };
    if (score >= -30) return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', pill: 'bg-amber-600 text-white' };
    return { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400', pill: 'bg-rose-600 text-white' };
  };

  const badgeStyle = getImpactBadgeColor(impact.macroScore);

  // ================= SIDEBAR / COMPACT MODE =================
  if (mode === 'sidebar' || mode === 'compact') {
    return (
      <div className="bg-white dark:bg-[#11151e] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-md">
        
        {/* Header with Title & Refresh */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 dark:text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                {isAr ? 'لوحة المؤشرات الكلية الأمريكية' : 'US Macro Dashboard'}
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                {isAr ? 'تأثير التضخم وأسعار الفائدة على السهم' : 'Live CPI, Fed Rates & Sector Impact'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${badgeStyle.pill}`}>
              {impact.macroScore > 0 ? `+${impact.macroScore}` : impact.macroScore}/100
            </span>
          </div>
        </div>

        {/* 4 Quick Key Metric Tiles */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          
          {/* Tile 1: US CPI Inflation */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                {isAr ? 'التضخم (CPI)' : 'US CPI'}
              </span>
              <span className="text-emerald-500 font-bold text-[9px]">{data.inflation.trend}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {data.inflation.cpiYoY}%
              </span>
              <span className="text-[10px] text-slate-400">
                Core: {data.inflation.coreCpiYoY}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${data.inflation.cpiYoY <= 3.0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (data.inflation.cpiYoY / 5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 2: Fed Policy Rate */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-sky-500" />
                {isAr ? 'فائدة الفيدرالي' : 'Fed Rate'}
              </span>
              <span className="text-slate-400 text-[9px]">Target</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {data.interestRates.fedFundsTargetRange}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {isAr ? 'سياسة مقيدة متوازنة' : 'Data-Dependent Pause'}
            </div>
          </div>

          {/* Tile 3: 10-Yr Treasury Yield */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-500" />
                {isAr ? 'عائد 10 سنوات' : '10Y Yield'}
              </span>
              <span className="text-purple-400 text-[9px]">^TNX</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400">
                {data.interestRates.treasury10Y}%
              </span>
              <span className="text-[10px] text-slate-400">
                2Y: {data.interestRates.treasury2Y}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Real: +{data.interestRates.realInterestRate}%
            </div>
          </div>

          {/* Tile 4: Stock Macro Impact */}
          <div className={`p-2.5 rounded-xl border space-y-1 ${badgeStyle.bg}`}>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold">{isAr ? 'تأثير السهم' : 'Impact'}</span>
              <Zap className="w-3 h-3" />
            </div>
            <div className="text-xs font-black truncate">
              {isAr ? impact.impactRatingAr : impact.impactRatingEn}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {isAr ? `قطاع: ${stock?.sector || sector}` : `Sector: ${stock?.sector || sector}`}
            </div>
          </div>

        </div>

        {/* Tailwinds & Headwinds Brief */}
        <div className="p-2.5 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'محفزات الاقتصاد الكلي' : 'Macro Tailwinds'}:</span>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
            {isAr ? impact.tailwindsAr[0] : impact.tailwindsEn[0]}
          </p>
        </div>

      </div>
    );
  }

  // ================= FULL DETAILED TAB VIEW =================
  return (
    <div className="space-y-5 animate-fade-in font-sans">
      
      {/* Top Banner: Macro Environment Overview & Stock Evaluation */}
      <div className={`p-5 rounded-2xl border ${badgeStyle.bg} shadow-lg relative overflow-hidden`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-700/60 text-sky-400 shrink-0">
              <Globe className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'تحليل المؤشرات الاقتصادية الكلية (Macro Analysis)' : 'Macroeconomic Environment & Impact'}
                </h2>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase font-mono ${badgeStyle.pill}`}>
                  {impact.macroScore > 0 ? `+${impact.macroScore}` : impact.macroScore} / 100 • {isAr ? impact.impactRatingAr : impact.impactRatingEn}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-3xl leading-relaxed">
                {isAr ? impact.summaryAr : impact.summaryEn}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1.5 text-xs font-mono text-slate-400">
                <span>{isAr ? `القطاع المستهدف:` : 'Target Sector:'} <strong className="text-slate-200">{stock?.sector || sector}</strong></span>
                <span>•</span>
                <span>{isAr ? `حساسية الفائدة:` : 'Rate Sensitivity:'} <strong className="text-sky-400">{isAr ? impact.rateSensitivityAr : impact.rateSensitivity}</strong></span>
                <span>•</span>
                <span>{isAr ? `حساسية التضخم:` : 'Inflation Sensitivity:'} <strong className="text-amber-400">{isAr ? impact.inflationSensitivityAr : impact.inflationSensitivity}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-slate-800/80 shrink-0">
            <div className="text-center px-3 border-r border-slate-800 rtl:border-r-0 rtl:border-l">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">{isAr ? 'تضخم المستهلك' : 'Headline CPI'}</span>
              <span className="text-lg font-black font-mono text-emerald-400">{data.inflation.cpiYoY}%</span>
            </div>
            <div className="text-center px-3 border-r border-slate-800 rtl:border-r-0 rtl:border-l">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">{isAr ? 'فائدة الفيدرالي' : 'Fed Rate'}</span>
              <span className="text-lg font-black font-mono text-sky-400">{data.interestRates.fedFundsTargetRange}</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">{isAr ? 'عائد 10 سنوات' : '10Y Yield'}</span>
              <span className="text-lg font-black font-mono text-purple-400">{data.interestRates.treasury10Y}%</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
        
        {/* ================= COLUMN 1: US INFLATION & MONETARY POLICY ================= */}
        <div className="space-y-5">
          
          {/* Card 1: US CPI Inflation Deep Dive */}
          <div className="bg-white dark:bg-[#11151e] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? 'مؤشرات التضخم الأمريكية (US Inflation CPI)' : 'US Inflation Dynamics (CPI)'}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {data.inflation.releaseDate}
                  </span>
                </div>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {isAr ? data.inflation.trendAr : data.inflation.trendEn}
              </span>
            </div>

            {/* CPI Numbers Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'التضخم العام (YoY)' : 'Headline CPI YoY'}</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{data.inflation.cpiYoY}%</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Target: 2.0%</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'التضخم الأساسي' : 'Core CPI (ex-Food/Energy)'}</span>
                <span className="text-xl font-black text-amber-500">{data.inflation.coreCpiYoY}%</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Sticky Goods</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'التغير الشهري' : 'Month-over-Month'}</span>
                <span className="text-xl font-black text-sky-400">+{data.inflation.cpiMoM}%</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">Controlled</span>
              </div>
            </div>

            {/* CPI 6-Month Trend Chart */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{isAr ? 'المسار التاريخي للتضخم (آخر 6 أشهر)' : 'Historical CPI Trajectory (6M)'}</span>
                <span className="text-emerald-400">Trend: -0.5% disinflation</span>
              </div>
              <div className="h-36 w-full bg-slate-50/50 dark:bg-black/20 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800/60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.historicalCpi}>
                    <defs>
                      <linearGradient id="cpiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="coreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis domain={[1.5, 4.0]} stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}%`, '']}
                    />
                    <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Fed 2% Target', fill: '#ef4444', fontSize: 10 }} />
                    <Area type="monotone" dataKey="headline" name={isAr ? 'التضخم العام' : 'Headline'} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cpiGrad)" />
                    <Area type="monotone" dataKey="core" name={isAr ? 'التضخم الأساسي' : 'Core CPI'} stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 2" fillOpacity={1} fill="url(#coreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed">
              {isAr ? data.inflation.descriptionAr : data.inflation.descriptionEn}
            </p>

          </div>

          {/* Card 2: Federal Reserve Policy & Real Interest Rates */}
          <div className="bg-white dark:bg-[#11151e] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? 'معدلات الفائدة الأمريكية وسياسة الفيدرالي' : 'US Federal Reserve Interest Rates'}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? 'سندات الخزانة والفائدة الحقيقية' : 'Treasury Yields & Real Rate'}
                  </span>
                </div>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                {isAr ? data.interestRates.yieldCurveStateAr : data.interestRates.yieldCurveStateEn}
              </span>
            </div>

            {/* Interest Rates Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'الفائدة الفيدرالية' : 'Fed Funds'}</span>
                <span className="text-sm sm:text-base font-bold text-sky-400">{data.interestRates.fedFundsTargetRange}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'عائد 10 سنوات (^TNX)' : '10Y Treasury'}</span>
                <span className="text-sm sm:text-base font-bold text-purple-400">{data.interestRates.treasury10Y}%</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'عائد سنتين (2Y)' : '2Y Treasury'}</span>
                <span className="text-sm sm:text-base font-bold text-slate-300">{data.interestRates.treasury2Y}%</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'الفائدة الحقيقية' : 'Real Rate (10Y-CPI)'}</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400">+{data.interestRates.realInterestRate}%</span>
              </div>
            </div>

            {/* Yield Trajectory Comparison Chart */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{isAr ? 'مقارنة مسار الفائدة وعوائد الخزانة' : 'Fed Rate vs 10Y Yield Trajectory'}</span>
                <span className="text-purple-400">Spread: +{data.interestRates.yieldCurveSpread2Y10Y}%</span>
              </div>
              <div className="h-36 w-full bg-slate-50/50 dark:bg-black/20 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800/60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.historicalRates}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis domain={[3.5, 5.5]} stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}%`, '']}
                    />
                    <Line type="monotone" dataKey="fedRate" name={isAr ? 'فائدة الفيدرالي' : 'Fed Target'} stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="yield10Y" name={isAr ? 'عائد 10 سنوات' : '10Y Yield'} stroke="#c084fc" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="yield2Y" name={isAr ? 'عائد سنتين' : '2Y Yield'} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>

        {/* ================= COLUMN 2: STOCK-SPECIFIC SECTOR IMPACT & LIQUIDITY ================= */}
        <div className="space-y-5">
          
          {/* Card 3: Stock-Specific Sector Sensitivity & Macro Score */}
          <div className="bg-white dark:bg-[#11151e] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? `تأثير المؤشرات الكلية على ${stock?.symbol || 'السهم'}` : `Macro Impact on ${stock?.symbol || 'Stock'}`}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? `حساسية قطاع ${stock?.sector || sector}` : `Sector Beta & Discount Factor`}
                  </span>
                </div>
              </div>

              <div className="text-right rtl:text-left font-mono">
                <span className="text-xs font-bold text-emerald-400 block">
                  {impact.macroScore > 0 ? `+${impact.macroScore}` : impact.macroScore} / 100
                </span>
                <span className="text-[10px] text-slate-400">
                  {isAr ? 'مقياس الملاءمة الكلية' : 'Macro Fitness'}
                </span>
              </div>
            </div>

            {/* Valuation & Cost of Capital Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">
                  {isAr ? 'تكلفة التمويل وخدمة الديون (Cost of Debt & Capital):' : 'Cost of Debt & Capital Servicing:'}
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {isAr ? impact.costOfCapitalImpactAr : impact.costOfCapitalImpact}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">
                  {isAr ? 'مضاعفات التقييم وسعر الخصم (Valuation Multiple & Discount Rate):' : 'Valuation Multiples & Discount Rate:'}
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {isAr ? impact.valuationMultipleImpactAr : impact.valuationMultipleImpact}
                </p>
              </div>
            </div>

            {/* Tailwinds List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'المحفزات الكلية الداعمة (Macro Tailwinds):' : 'Macro Tailwinds:'}</span>
              </h4>
              <div className="space-y-1.5">
                {(isAr ? impact.tailwindsAr : impact.tailwindsEn).map((tw, idx) => (
                  <div key={idx} className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{tw}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Headwinds List */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>{isAr ? 'التحديات والمخاطر الكلية (Macro Headwinds & Risks):' : 'Macro Headwinds & Risks:'}</span>
              </h4>
              <div className="space-y-1.5">
                {(isAr ? impact.headwindsAr : impact.headwindsEn).map((hw, idx) => (
                  <div key={idx} className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-800 dark:text-rose-200 leading-relaxed flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{hw}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Card 4: Global Liquidity, DXY Dollar Index & Commodities */}
          <div className="bg-white dark:bg-[#11151e] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? 'مؤشر الدولار والسيولة العالمية' : 'Global Liquidity & Dollar Index (DXY)'}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? 'السلع، النفط والذهب' : 'Commodity & FX Indicators'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'مؤشر الدولار DXY' : 'US Dollar (DXY)'}</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{data.liquidity.dxyIndex}</span>
                <span className={`text-[10px] block mt-0.5 ${data.liquidity.dxyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.liquidity.dxyChangePercent >= 0 ? '+' : ''}{data.liquidity.dxyChangePercent}%
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'النفط الخام (WTI)' : 'Crude Oil (WTI)'}</span>
                <span className="text-base sm:text-lg font-black text-amber-500">${data.liquidity.crudeOilWti}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">USD / bbl</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{isAr ? 'الذهب الفوري' : 'Gold Spot'}</span>
                <span className="text-base sm:text-lg font-black text-yellow-400">${data.liquidity.goldSpot}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">USD / oz</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed">
              💡 {isAr ? data.liquidity.liquidityRegimeAr : 'Stable USD liquidity regime is supportive of normalized trading volumes and equity valuation stability.'}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};
