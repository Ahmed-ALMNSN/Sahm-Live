import React from 'react';
import { ProfessionalReportData, formatFinancialNumber } from '../utils/reportEngine.js';
import { Language } from '../types.js';

interface PDFReportTemplateProps {
  report: ProfessionalReportData;
  lang: Language;
  containerId?: string;
  isPrintMode?: boolean;
}

export const PDFReportTemplate: React.FC<PDFReportTemplateProps> = ({
  report,
  lang,
  containerId = 'institutional-report-content',
  isPrintMode = false,
}) => {
  const isAr = lang === 'ar';
  const {
    company,
    market,
    session,
    technical,
    fundamental,
    financialHealth,
    valuation,
    volume,
    supportResistance,
    risk,
    macro,
    tradingPlan,
    scenarios,
    invalidationConditions,
    score,
    finalAssessment,
    analystRationale,
    dataSources,
    chartDataSeries,
  } = report;

  const isPos = market.change >= 0;

  // Recommendation Badge Translation
  const getRecommendationLabel = (rec: string) => {
    if (!isAr) return rec;
    switch (rec) {
      case 'STRONG BUY SETUP':
        return 'فرصة شراء قوية جداً';
      case 'BUY SETUP':
        return 'فرصة شراء فنية';
      case 'SELL':
        return 'بيع / تخفيف المراكز';
      case 'AVOID':
        return 'تجنب الدخول';
      case 'REDUCE':
        return 'تقليص الكميات';
      case 'WAIT':
        return 'انتظار وتريث';
      case 'WATCH':
      default:
        return 'مراقبة ومتابعة';
    }
  };

  // Risk Level Translation
  const getRiskLevelLabel = (riskLvl: string) => {
    if (!isAr) return `${riskLvl} RISK`;
    switch (riskLvl) {
      case 'LOW':
        return 'مخاطر منخفضة';
      case 'MEDIUM':
        return 'مخاطر معتدلة';
      case 'HIGH':
        return 'مخاطر مرتفعة';
      case 'EXTREME':
        return 'مخاطر قصوى';
      default:
        return `${riskLvl} مخاطر`;
    }
  };

  // Health Level Translation
  const getHealthLevelLabel = (health: string) => {
    if (!isAr) return `${health} HEALTH`;
    switch (health) {
      case 'STRONG':
        return 'متانة مالية ممتازة';
      case 'GOOD':
        return 'متانة مالية جيدة';
      case 'WEAK':
        return 'متانة مالية ضعيفة';
      case 'POOR':
        return 'متانة مالية متدهورة';
      default:
        return 'متانة مالية متوازنة';
    }
  };

  // Profitability Status Translation
  const getProfitabilityLabel = (status: string) => {
    if (!isAr) return status;
    switch (status) {
      case 'PROFITABLE':
        return 'شركة رابحة';
      case 'LOSS-MAKING':
        return 'تسجل خسائر تشغيلية';
      case 'IMPROVING':
        return 'أداء مالي في تحسن';
      case 'DETERIORATING':
        return 'أداء مالي متراجع';
      default:
        return 'بيانات مالية قيد التدقيق';
    }
  };

  // Session State Translation
  const getSessionStateLabel = (st: string) => {
    if (!isAr) return st;
    switch (st) {
      case 'REGULAR':
        return 'جلسة التداول الرسمية';
      case 'PRE_MARKET':
        return 'ما قبل الافتتاح (Pre-Market)';
      case 'AFTER_HOURS':
        return 'ما بعد الإغلاق (After-Hours)';
      case 'CLOSED':
        return 'السوق مغلق حالياً';
      default:
        return st;
    }
  };

  // Status Badge for Financial Health
  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'STRONG':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700';
      case 'WEAK':
      case 'POOR':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600';
    }
  };

  // SVG Candlestick Institutional Chart calculations
  const chartWidth = 820;
  const chartHeight = 240;
  const chartPadding = { top: 20, right: 75, bottom: 25, left: 15 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const mainPlotHeight = 150;
  const volumePlotHeight = 45;
  const volumePlotTop = chartPadding.top + mainPlotHeight + 8;

  const validCandles = Array.isArray(chartDataSeries) && chartDataSeries.length > 0
    ? chartDataSeries
    : [
        { date: '1', open: market.price * 0.98, high: market.price * 1.01, low: market.price * 0.97, close: market.price, volume: 1000000 },
      ];

  const allPrices = [
    tradingPlan.stopLoss,
    tradingPlan.target1,
    tradingPlan.target2,
    tradingPlan.target3,
    market.price,
    technical.ema20,
    technical.vwap,
    ...validCandles.map(d => d.high),
    ...validCandles.map(d => d.low)
  ].filter(p => typeof p === 'number' && !isNaN(p) && p > 0);

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const priceMargin = Math.max(0.2, (rawMax - rawMin) * 0.08);
  const priceMin = Math.max(0.01, rawMin - priceMargin);
  const priceMax = rawMax + priceMargin;
  const priceRange = Math.max(0.1, priceMax - priceMin);

  const maxVolume = Math.max(1, ...validCandles.map(d => d.volume || 0));

  const getY = (p: number) => {
    const norm = (p - priceMin) / priceRange;
    return chartPadding.top + (1 - norm) * mainPlotHeight;
  };

  const getVolY = (v: number) => {
    const norm = (v || 0) / maxVolume;
    return volumePlotTop + volumePlotHeight - norm * volumePlotHeight;
  };

  // Calculate EMA series points for SVG path
  const numCandles = validCandles.length;
  const getCandleX = (i: number) => chartPadding.left + (i + 0.5) * (plotWidth / numCandles);

  // Generate smooth indicator line path
  const generateIndicatorPath = (period: number) => {
    if (numCandles < 2) return '';
    const points: { x: number; y: number }[] = [];
    let prevEma = validCandles[0].close;
    const k = 2 / (period + 1);

    validCandles.forEach((c, i) => {
      prevEma = c.close * k + prevEma * (1 - k);
      points.push({ x: getCandleX(i), y: getY(prevEma) });
    });

    return points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  };

  const ema20Path = generateIndicatorPath(20);
  const ema50Path = generateIndicatorPath(50);

  // VWAP Path
  const vwapPath = (() => {
    if (numCandles < 2) return '';
    let cumVol = 0;
    let cumVolPrice = 0;
    const points: { x: number; y: number }[] = [];

    validCandles.forEach((c, i) => {
      const typical = (c.high + c.low + c.close) / 3;
      const vol = c.volume || 1000;
      cumVol += vol;
      cumVolPrice += typical * vol;
      const vwapVal = cumVol > 0 ? cumVolPrice / cumVol : typical;
      points.push({ x: getCandleX(i), y: getY(vwapVal) });
    });

    return points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  })();

  // Price grid ticks (5 steps)
  const priceTicks = Array.from({ length: 5 }, (_, i) => {
    const val = priceMin + (priceRange * (i + 0.5)) / 5;
    return { val, y: getY(val) };
  });

  return (
    <div
      id={containerId}
      dir={isAr ? 'rtl' : 'ltr'}
      lang={lang}
      className="bg-white text-slate-900 mx-auto transition-colors print:p-0 arabic-text"
      style={{
        width: '100%',
        maxWidth: '880px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Cairo', system-ui, -apple-system, sans-serif",
        letterSpacing: 'normal',
      }}
    >
      {/* ================= 1. INSTITUTIONAL REPORT HEADER ================= */}
      <header className="border-b-2 border-slate-900 pb-4 mb-6" style={{ breakInside: 'avoid' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                {isAr ? 'تقرير بحوث واستثمار كمي' : 'Institutional Equity Research'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {isAr ? 'تقرير تحليلي مؤسسي شامل' : 'Comprehensive Research Dossier'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1.5 flex items-baseline gap-2">
              <span>{company.symbol}</span>
              <span className="text-base sm:text-lg font-normal text-slate-600">({company.name})</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {company.exchange} • {company.sector} • {company.industry}
            </p>
          </div>

          <div className="text-left rtl:text-right border-l-2 rtl:border-l-0 rtl:border-r-2 border-slate-200 pl-4 rtl:pl-0 rtl:pr-4">
            <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900">
              ${market.price.toFixed(2)}
            </div>
            <div className={`text-xs font-mono font-bold flex items-center gap-1 ${isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
              <span>{isPos ? '▲ +' : '▼ '}{market.change.toFixed(2)} ({isPos ? '+' : ''}{market.changePercent.toFixed(2)}%)</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {isAr ? 'تاريخ التقرير:' : 'Report Date:'} {isAr ? (dataSources.reportGeneratedAtDateAr || dataSources.reportGeneratedAtDateEn.split(',')[0]) : dataSources.reportGeneratedAtDateEn.split(',')[0]}
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. EXECUTIVE SUMMARY ================= */}
      <section className="mb-6 rounded-xl border border-slate-300 bg-slate-50 p-4" style={{ breakInside: 'avoid' }}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            {isAr ? 'الملخص التنفيذي وتقييم الفرصة' : 'Executive Summary & Key Takeaways'}
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            {isAr ? 'نقاط الجدارة الاستثمارية:' : 'Confidence Score:'} <strong className="text-slate-900">{score.totalScore}/100</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">{isAr ? 'القرار النهائي' : 'Final Assessment'}</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">{getRecommendationLabel(finalAssessment.recommendation)}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">{isAr ? 'مستوى المخاطر' : 'Risk Level'}</span>
            <span className={`text-xs font-bold mt-0.5 block ${risk.overallRiskLevel === 'LOW' ? 'text-emerald-700' : risk.overallRiskLevel === 'HIGH' ? 'text-rose-700' : 'text-amber-700'}`}>
              {getRiskLevelLabel(risk.overallRiskLevel)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">{isAr ? 'المسار والزخم' : 'Trend & Momentum'}</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {isAr ? technical.trendDirectionAr : technical.trendDirectionEn} ({score.momentumScore}/100)
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 block">{isAr ? 'المتانة المالية' : 'Financial Health'}</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {getHealthLevelLabel(financialHealth.overallHealth)} ({getProfitabilityLabel(financialHealth.profitabilityStatus)})
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed font-sans">
          {isAr ? analystRationale.rationaleAr : analystRationale.rationaleEn}
        </p>
      </section>

      {/* ================= 3. MARKET SNAPSHOT & SESSION ANALYSIS ================= */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ breakInside: 'avoid' }}>
        {/* Market Snapshot Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-2 font-mono">
            {isAr ? 'بيانات السوق المباشرة' : 'Market Snapshot'}
          </h3>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <div className="text-slate-500">{isAr ? 'الإغلاق السابق:' : 'Prev Close:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              {market.previousClose ? `$${market.previousClose.toFixed(2)}` : 'N/A'}
            </div>

            <div className="text-slate-500">{isAr ? 'سعر الافتتاح:' : 'Open:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              {market.open ? `$${market.open.toFixed(2)}` : 'N/A'}
            </div>

            <div className="text-slate-500">{isAr ? 'أعلى / أدنى اليوم:' : 'Day High / Low:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              ${market.dayHigh?.toFixed(2) || '0.00'} - ${market.dayLow?.toFixed(2) || '0.00'}
            </div>

            <div className="text-slate-500">{isAr ? 'نطاق 52 أسبوعاً:' : '52W Range:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              ${company.week52Low?.toFixed(2) || '0.00'} - ${company.week52High?.toFixed(2) || '0.00'}
            </div>

            <div className="text-slate-500">{isAr ? 'حجم التداول:' : 'Volume:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              {formatFinancialNumber(market.volume)} {isAr ? 'سهم' : ''}
            </div>

            <div className="text-slate-500">{isAr ? 'متوسط الحجم (20D):' : 'Avg Vol (20D):'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              {formatFinancialNumber(market.avgVolume20D)} {isAr ? 'سهم' : ''}
            </div>

            <div className="text-slate-500">{isAr ? 'السيولة النسبية (RVOL):' : 'Relative Vol (RVOL):'}</div>
            <div className="font-mono font-bold text-slate-900 text-left rtl:text-right">
              {market.rvol.toFixed(2)}x
            </div>

            <div className="text-slate-500">{isAr ? 'القيمة السوقية:' : 'Market Cap:'}</div>
            <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
              {formatFinancialNumber(company.marketCap, '$')}
            </div>
          </div>
        </div>

        {/* Session Analysis */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-2 font-mono">
              {isAr ? 'تحليل الجلسة ونطاق التداول' : 'Session Dynamics & VWAP'}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
              <div className="text-slate-500">{isAr ? 'جلسة التداول:' : 'Market Session:'}</div>
              <div className="font-mono font-bold text-emerald-700 text-left rtl:text-right">
                {getSessionStateLabel(session.state)}
              </div>

              <div className="text-slate-500">{isAr ? 'متوسط السيولة (VWAP):' : 'Session VWAP:'}</div>
              <div className="font-mono font-bold text-slate-900 text-left rtl:text-right">
                ${session.vwap.toFixed(2)}
              </div>

              <div className="text-slate-500">{isAr ? 'موقع السعر في النطاق:' : 'Range Position:'}</div>
              <div className="font-mono font-semibold text-slate-900 text-left rtl:text-right">
                {session.sessionProgressPercent}%
              </div>
            </div>

            {/* Range Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${session.sessionProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>{isAr ? 'قاع اليوم:' : 'Low:'} ${session.sessionLow.toFixed(2)}</span>
              <span>VWAP: ${session.vwap.toFixed(2)}</span>
              <span>{isAr ? 'قمة اليوم:' : 'High:'} ${session.sessionHigh.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 font-sans italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
            {isAr ? session.pricePositionTextAr : session.pricePositionTextEn}
          </p>
        </div>
      </section>

      {/* ================= 4. EMBEDDED TECHNICAL CHART & TRADING PLAN ================= */}
      <section id="section-trading-plan" className="mb-6 rounded-xl border border-slate-200 bg-white p-4 page-break-before" style={{ breakInside: 'avoid' }}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
            {isAr ? 'الرسم البياني ومستويات خطة التداول المقترحة' : 'Execution Chart & Target Grid'}
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            EMA20: ${technical.ema20.toFixed(2)} | VWAP: ${technical.vwap.toFixed(2)}
          </span>
        </div>

        <div className="relative w-full border border-slate-200 rounded-xl p-3 bg-slate-900 text-white mb-3 overflow-hidden shadow-sm">
          {/* Chart Header & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-100">{company.symbol} (D1)</span>
              <span className="text-emerald-400 font-semibold">${market.price.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> EMA20 (${technical.ema20.toFixed(2)})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-purple-500 inline-block" /> EMA50</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-teal-400 inline-block" /> VWAP (${technical.vwap.toFixed(2)})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block border-b border-dashed" /> {isAr ? 'الأهداف' : 'Targets'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-rose-500 inline-block border-b border-dashed" /> {isAr ? 'وقف الخسارة' : 'Stop Loss'}</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[240px]">
            {/* Background & Watermark */}
            <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#0b0f19" rx="6" />
            <text
              x={plotWidth / 2 + chartPadding.left}
              y={chartPadding.top + mainPlotHeight / 2 + 15}
              fill="#ffffff"
              fillOpacity="0.03"
              fontSize="72"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {company.symbol}
            </text>

            {/* Horizontal Grid & Price Scale on Right */}
            {priceTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={chartPadding.left}
                  y1={tick.y}
                  x2={chartWidth - chartPadding.right}
                  y2={tick.y}
                  stroke="#1e293b"
                  strokeDasharray="2,2"
                  strokeWidth="0.8"
                />
                <text
                  x={chartWidth - chartPadding.right + 6}
                  y={tick.y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${tick.val.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Entry Range Highlight Area */}
            {tradingPlan.entryMin > 0 && tradingPlan.entryMax > 0 && (
              <rect
                x={chartPadding.left}
                y={Math.min(getY(tradingPlan.entryMin), getY(tradingPlan.entryMax))}
                width={plotWidth}
                height={Math.max(3, Math.abs(getY(tradingPlan.entryMax) - getY(tradingPlan.entryMin)))}
                fill="#10b981"
                fillOpacity="0.08"
                stroke="#10b981"
                strokeOpacity="0.25"
                strokeDasharray="3,2"
                strokeWidth="0.8"
              />
            )}

            {/* Stop Loss Line & Badge */}
            {tradingPlan.stopLoss > 0 && (
              <g>
                <line
                  x1={chartPadding.left}
                  y1={getY(tradingPlan.stopLoss)}
                  x2={chartWidth - chartPadding.right}
                  y2={getY(tradingPlan.stopLoss)}
                  stroke="#f43f5e"
                  strokeDasharray="4,3"
                  strokeWidth="1.2"
                />
                <rect
                  x={chartWidth - chartPadding.right + 2}
                  y={getY(tradingPlan.stopLoss) - 7}
                  width="70"
                  height="14"
                  fill="#881337"
                  rx="3"
                />
                <text
                  x={chartWidth - chartPadding.right + 6}
                  y={getY(tradingPlan.stopLoss) + 3}
                  fill="#fecdd3"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isAr ? 'وقف' : 'SL'} ${tradingPlan.stopLoss.toFixed(2)}
                </text>
              </g>
            )}

            {/* Target 1 Line & Badge */}
            {tradingPlan.target1 > 0 && (
              <g>
                <line
                  x1={chartPadding.left}
                  y1={getY(tradingPlan.target1)}
                  x2={chartWidth - chartPadding.right}
                  y2={getY(tradingPlan.target1)}
                  stroke="#10b981"
                  strokeDasharray="4,3"
                  strokeWidth="1"
                />
                <rect
                  x={chartWidth - chartPadding.right + 2}
                  y={getY(tradingPlan.target1) - 7}
                  width="70"
                  height="14"
                  fill="#064e3b"
                  rx="3"
                />
                <text
                  x={chartWidth - chartPadding.right + 6}
                  y={getY(tradingPlan.target1) + 3}
                  fill="#a7f3d0"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isAr ? 'هدف 1' : 'T1'} ${tradingPlan.target1.toFixed(2)}
                </text>
              </g>
            )}

            {/* Target 2 Line & Badge */}
            {tradingPlan.target2 > 0 && (
              <g>
                <line
                  x1={chartPadding.left}
                  y1={getY(tradingPlan.target2)}
                  x2={chartWidth - chartPadding.right}
                  y2={getY(tradingPlan.target2)}
                  stroke="#10b981"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                />
                <rect
                  x={chartWidth - chartPadding.right + 2}
                  y={getY(tradingPlan.target2) - 7}
                  width="70"
                  height="14"
                  fill="#064e3b"
                  rx="3"
                />
                <text
                  x={chartWidth - chartPadding.right + 6}
                  y={getY(tradingPlan.target2) + 3}
                  fill="#a7f3d0"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isAr ? 'هدف 2' : 'T2'} ${tradingPlan.target2.toFixed(2)}
                </text>
              </g>
            )}

            {/* Target 3 Line & Badge */}
            {tradingPlan.target3 > 0 && (
              <g>
                <line
                  x1={chartPadding.left}
                  y1={getY(tradingPlan.target3)}
                  x2={chartWidth - chartPadding.right}
                  y2={getY(tradingPlan.target3)}
                  stroke="#34d399"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                />
                <rect
                  x={chartWidth - chartPadding.right + 2}
                  y={getY(tradingPlan.target3) - 7}
                  width="70"
                  height="14"
                  fill="#065f46"
                  rx="3"
                />
                <text
                  x={chartWidth - chartPadding.right + 6}
                  y={getY(tradingPlan.target3) + 3}
                  fill="#6ee7b7"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isAr ? 'هدف 3' : 'T3'} ${tradingPlan.target3.toFixed(2)}
                </text>
              </g>
            )}

            {/* Live Price Line & Badge */}
            <g>
              <line
                x1={chartPadding.left}
                y1={getY(market.price)}
                x2={chartWidth - chartPadding.right}
                y2={getY(market.price)}
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <rect
                x={chartWidth - chartPadding.right + 2}
                y={getY(market.price) - 8}
                width="70"
                height="16"
                fill="#1e3a8a"
                rx="3"
              />
              <text
                x={chartWidth - chartPadding.right + 6}
                y={getY(market.price) + 3.5}
                fill="#93c5fd"
                fontSize="9"
                fontWeight="900"
                fontFamily="monospace"
              >
                ${market.price.toFixed(2)}
              </text>
            </g>

            {/* Moving Averages Polyline Overlay */}
            {ema50Path && (
              <path d={ema50Path} fill="none" stroke="#a855f7" strokeWidth="1.2" opacity="0.8" />
            )}
            {ema20Path && (
              <path d={ema20Path} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.9" />
            )}
            {vwapPath && (
              <path d={vwapPath} fill="none" stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.85" />
            )}

            {/* Candlesticks Rendering */}
            {validCandles.map((d, i) => {
              const x = getCandleX(i);
              const candleW = Math.max(3, Math.min(12, (plotWidth / numCandles) * 0.7));
              const isGreen = d.close >= d.open;
              const candleColor = isGreen ? '#22c55e' : '#f43f5e';
              const top = Math.min(getY(d.open), getY(d.close));
              const bot = Math.max(getY(d.open), getY(d.close));
              const candleH = Math.max(1.5, bot - top);

              return (
                <g key={`candle-${i}`}>
                  {/* High - Low Wick */}
                  <line
                    x1={x}
                    y1={getY(d.high)}
                    x2={x}
                    y2={getY(d.low)}
                    stroke={candleColor}
                    strokeWidth="1"
                  />
                  {/* Real Body */}
                  <rect
                    x={x - candleW / 2}
                    y={top}
                    width={candleW}
                    height={candleH}
                    fill={candleColor}
                    rx="1"
                  />
                </g>
              );
            })}

            {/* Volume Panel Separator */}
            <line
              x1={chartPadding.left}
              y1={volumePlotTop - 4}
              x2={chartWidth - chartPadding.right}
              y2={volumePlotTop - 4}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={chartPadding.left + 4}
              y={volumePlotTop + 8}
              fill="#64748b"
              fontSize="8"
              fontFamily="monospace"
            >
              {isAr ? 'حجم التداول' : 'VOL'} (RVOL: {market.rvol.toFixed(2)}x)
            </text>

            {/* Volume Bars */}
            {validCandles.map((d, i) => {
              const x = getCandleX(i);
              const barW = Math.max(2, Math.min(10, (plotWidth / numCandles) * 0.65));
              const isGreen = d.close >= d.open;
              const barColor = isGreen ? '#166534' : '#9f1239';
              const barY = getVolY(d.volume || 0);
              const barH = Math.max(1, volumePlotTop + volumePlotHeight - barY);

              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barW / 2}
                  y={barY}
                  width={barW}
                  height={barH}
                  fill={barColor}
                  opacity="0.8"
                />
              );
            })}

            {/* Time / Date Axis Labels */}
            {validCandles.map((d, i) => {
              const step = Math.max(1, Math.floor(numCandles / 6));
              if (i % step !== 0 && i !== numCandles - 1) return null;
              const x = getCandleX(i);
              return (
                <text
                  key={`time-${i}`}
                  x={x}
                  y={chartHeight - 6}
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {d.date || `${i + 1}`}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Trading Plan Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">{isAr ? 'منطقة الدخول' : 'Entry Zone'}</span>
            <span className="font-mono font-bold text-slate-900">${tradingPlan.entryMin} - ${tradingPlan.entryMax}</span>
          </div>
          <div className="bg-rose-50 p-2 rounded border border-rose-200">
            <span className="text-[10px] text-rose-700 block">{isAr ? 'وقف الخسارة' : 'Stop Loss'}</span>
            <span className="font-mono font-bold text-rose-800">${tradingPlan.stopLoss.toFixed(2)}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block">{isAr ? 'الهدف 1 (40%)' : 'Target 1 (40%)'}</span>
            <span className="font-mono font-bold text-emerald-800">${tradingPlan.target1.toFixed(2)}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block">{isAr ? 'الهدف 2 (30%)' : 'Target 2 (30%)'}</span>
            <span className="font-mono font-bold text-emerald-800">${tradingPlan.target2.toFixed(2)}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block">{isAr ? 'الهدف 3 (30%)' : 'Target 3 (30%)'}</span>
            <span className="font-mono font-bold text-emerald-800">${tradingPlan.target3.toFixed(2)}</span>
          </div>
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <span className="text-[10px] text-blue-700 block">{isAr ? 'العائد/المخاطرة' : 'R/R Ratio'}</span>
            <span className="font-mono font-bold text-blue-800">{tradingPlan.riskRewardRatio}:1</span>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">{isAr ? 'المخاطرة للسهم' : 'Risk/Share'}</span>
            <span className="font-mono font-bold text-slate-900">${tradingPlan.riskPerShare.toFixed(2)}</span>
          </div>
        </div>

        {/* Position Sizing calculation */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 p-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{isAr ? 'حجم المركز المحسوب:' : 'Position Size:'}</span>
            <span className="font-mono font-bold text-slate-900">{tradingPlan.shares.toLocaleString()} {isAr ? 'سهم' : 'shares'}</span>
            <span className="text-slate-400">(${tradingPlan.capitalRequired.toLocaleString()})</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-rose-700 font-mono font-semibold">
              {isAr ? 'أقصى خسارة محددة:' : 'Max Risk:'} -${tradingPlan.maxLoss.toLocaleString()}
            </span>
            <span className="text-emerald-700 font-mono font-semibold">
              {isAr ? 'العائد المتوقع عند الهدف 1:' : 'Profit at Target 1:'} +${tradingPlan.profitT1.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* ================= 5. TECHNICAL ANALYSIS METRICS TABLE ================= */}
      <section id="section-technical-analysis" className="mb-6 rounded-xl border border-slate-200 bg-white p-3.5 page-break-before" style={{ breakInside: 'avoid' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-2 font-mono">
          {isAr ? 'جدول المؤشرات الفنية والإشارات' : 'Technical Indicator Breakdown'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono">
                <th className="pb-1.5 font-semibold">{isAr ? 'المؤشر الفني' : 'Indicator'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'القيمة الحالية' : 'Value'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'الإشارة الفنية' : 'Signal'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'التفسير المؤسسي' : 'Interpretation'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {technical.indicatorsTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 font-mono font-bold text-slate-900">{row.indicator}</td>
                  <td className="py-2 font-mono text-slate-800">{row.value}</td>
                  <td className="py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.signal === 'BULLISH'
                        ? 'bg-emerald-100 text-emerald-800'
                        : row.signal === 'BEARISH'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {isAr ? row.signalAr : row.signal}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600 text-[11px]">
                    {isAr ? row.interpretationAr : row.interpretationEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= 6. FUNDAMENTAL ANALYSIS & AUDITED FINANCIAL STATEMENTS ================= */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-3.5" style={{ breakInside: 'avoid' }}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
            {isAr ? 'التحليل الأساسي والقوائم المالية (آخر 12 شهراً TTM)' : 'Fundamental Statements & Cash Flow (TTM)'}
          </h3>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getHealthBadge(financialHealth.overallHealth)}`}>
            {getHealthLevelLabel(financialHealth.overallHealth)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono">
                <th className="pb-1.5 font-semibold">{isAr ? 'البند المالي' : 'Metric'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'الفترة' : 'Period'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'القيمة' : 'Value'}</th>
                <th className="pb-1.5 font-semibold">{isAr ? 'النمو السنوي (YoY)' : 'Growth YoY'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fundamental.financialStatementsTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 font-medium text-slate-900">{isAr ? row.metricAr : row.metricEn}</td>
                  <td className="py-2 font-mono text-slate-500">{row.period}</td>
                  <td className="py-2 font-mono font-bold text-slate-900">{row.value}</td>
                  <td className={`py-2 font-mono font-semibold ${row.growthYoY.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {row.growthYoY}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-2.5 rounded bg-slate-50 border border-slate-100 text-xs text-slate-700">
          <strong className="text-slate-900">{isAr ? 'حالة ربحية الشركة:' : 'Profitability Status:'}</strong> {getProfitabilityLabel(financialHealth.profitabilityStatus)} — {isAr ? financialHealth.profitabilityReasonAr : financialHealth.profitabilityReasonEn}
        </div>
      </section>

      {/* ================= 7. FINANCIAL RATIOS & VALUATION ================= */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-3.5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-2 font-mono">
          {isAr ? 'مضاعفات التقييم والنسب المالية' : 'Financial Ratios & Valuation Multiples'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {valuation.valuationTable.map((v, i) => (
            <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block">
                {isAr ? v.ratio : v.ratio.split(' (')[0]}
              </span>
              <span className="font-mono font-bold text-slate-900 block mt-0.5">{v.value}</span>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                {isAr ? v.assessmentAr : v.assessmentEn}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 8. SUPPORT & RESISTANCE / RISK ASSESSMENT ================= */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ breakInside: 'avoid' }}>
        {/* Support & Resistance Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-2 font-mono">
            {isAr ? 'مستويات الدعم والمقاومة المحورية' : 'Support & Resistance Grid'}
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-1.5 rounded bg-rose-50 border border-rose-100">
              <span className="font-mono font-bold text-rose-800">{isAr ? 'R3 (مقاومة قصوى):' : 'R3 (Major Resistance):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.r3.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-rose-50 border border-rose-100">
              <span className="font-mono font-bold text-rose-800">{isAr ? 'R2 (مقاومة ثانوية):' : 'R2 (Secondary Resistance):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.r2.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-rose-50 border border-rose-100">
              <span className="font-mono font-bold text-rose-800">{isAr ? 'R1 (مقاومة أولى):' : 'R1 (Initial Resistance):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.r1.toFixed(2)} ({supportResistance.r1DistancePct}%)</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-blue-50 border border-blue-100">
              <span className="font-mono font-bold text-blue-800">{isAr ? 'PIVOT (نقطة الارتكاز):' : 'PIVOT (Pivot Point):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.pivotPoint.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-emerald-50 border border-emerald-100">
              <span className="font-mono font-bold text-emerald-800">{isAr ? 'S1 (دعم أول):' : 'S1 (Initial Support):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.s1.toFixed(2)} (-{supportResistance.s1DistancePct}%)</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-emerald-50 border border-emerald-100">
              <span className="font-mono font-bold text-emerald-800">{isAr ? 'S2 (دعم ثاني):' : 'S2 (Secondary Support):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.s2.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-emerald-50 border border-emerald-100">
              <span className="font-mono font-bold text-emerald-800">{isAr ? 'S3 (دعم رئيسي):' : 'S3 (Major Support):'}</span>
              <span className="font-mono font-bold text-slate-900">${supportResistance.s3.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Risk Assessment Matrix */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              {isAr ? 'مصفوفة تقييم المخاطر' : 'Risk Matrix'}
            </h3>
            <span className="text-xs font-mono font-bold text-amber-700">
              {getRiskLevelLabel(risk.overallRiskLevel)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {risk.riskFactors.map((rf, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-slate-800">{isAr ? rf.titleAr : rf.titleEn}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    rf.level === 'LOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {getRiskLevelLabel(rf.level)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {isAr ? rf.descriptionAr : rf.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 8.5 MACROECONOMIC & US MONETARY POLICY ANALYSIS ================= */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4" style={{ breakInside: 'avoid' }}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
            {isAr ? 'المؤشرات الاقتصادية الكلية وسياسة الفيدرالي الأمريكي' : 'Macroeconomic Indicators & US Monetary Policy'}
          </h3>
          <span className="text-[10px] font-mono text-slate-500 font-bold">
            {isAr ? 'تأثير بيئة الفائدة والتضخم' : 'Macro & Rate Impact'}
          </span>
        </div>

        {/* 4 Macro Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-mono">{isAr ? 'التضخم العام (CPI):' : 'US CPI Inflation:'}</span>
            <span className="font-mono font-black text-slate-900 text-sm">{macro?.cpiYoY ?? 2.9}%</span>
            <span className="text-[9px] text-emerald-700 block mt-0.5">{isAr ? macro?.cpiTrendAr ?? 'تباطؤ تدريجي' : macro?.cpiTrendEn ?? 'Cooling'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-mono">{isAr ? 'فائدة الفيدرالي المستهدفة:' : 'Fed Funds Target:'}</span>
            <span className="font-mono font-black text-slate-900 text-sm">{macro?.fedFundsTargetRange ?? '4.25% - 4.50%'}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">{isAr ? 'نطاق تشديد مقيد' : 'Data-Dependent'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-mono">{isAr ? 'سندات 10 سنوات (10Y):' : '10Y Treasury Yield:'}</span>
            <span className="font-mono font-black text-purple-700 text-sm">{macro?.treasury10Y ?? 4.28}%</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Real: +{macro?.realInterestRate ?? 1.38}%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-mono">{isAr ? 'تقييم الأثر على السهم:' : 'Macro Impact Score:'}</span>
            <span className="font-mono font-black text-emerald-700 text-sm">+{macro?.stockMacroScore ?? 25}/100</span>
            <span className="text-[9px] text-emerald-700 block mt-0.5 truncate">{isAr ? macro?.impactRatingAr ?? 'دعم كلي معتدل' : macro?.impactRatingEn ?? 'Moderate Tailwind'}</span>
          </div>
        </div>

        {/* Macro Commentary */}
        <p className="text-xs text-slate-700 leading-relaxed p-2.5 rounded bg-slate-50 border border-slate-100 mb-2.5">
          {isAr ? macro?.summaryAr : macro?.summaryEn}
        </p>

        {/* Tailwinds & Headwinds Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-200">
            <span className="font-bold text-emerald-800 block mb-1">
              {isAr ? 'المحفزات الكلية الداعمة للسهم:' : 'Macro Tailwinds:'}
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
              {(isAr ? macro?.tailwindsAr : macro?.tailwindsEn)?.map((tw, idx) => (
                <li key={idx}>{tw}</li>
              )) || <li>{isAr ? 'تباطؤ معدلات التضخم يدعم استقرار تكاليف التشغيل.' : 'Cooling inflation stabilizes operational input costs.'}</li>}
            </ul>
          </div>
          <div className="p-2.5 rounded bg-rose-50/60 border border-rose-200">
            <span className="font-bold text-rose-800 block mb-1">
              {isAr ? 'التحديات والمخاطر الكلية:' : 'Macro Headwinds:'}
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
              {(isAr ? macro?.headwindsAr : macro?.headwindsEn)?.map((hw, idx) => (
                <li key={idx}>{hw}</li>
              )) || <li>{isAr ? 'بقاء الفائدة الحقيقية مرتفعة يفرض انضباطاً في مكررات التقييم.' : 'Positive real rates keep valuation multiples restrained.'}</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= 9. SCENARIOS & INVALIDATION CONDITIONS ================= */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4" style={{ breakInside: 'avoid' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 font-mono">
          {isAr ? 'السيناريوهات التكتيكية وشروط إلغاء الصفقة' : 'Tactical Scenarios & Invalidation Conditions'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 block mb-1">
              {isAr ? '1. السيناريو الإيجابي الصاعد' : '1. Bullish Scenario'}
            </span>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              {isAr ? scenarios.bullishScenarioAr : scenarios.bullishScenarioEn}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              {isAr ? '2. السيناريو العرضي المحايد' : '2. Neutral Scenario'}
            </span>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              {isAr ? scenarios.neutralScenarioAr : scenarios.neutralScenarioEn}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
            <span className="text-xs font-bold text-rose-800 block mb-1">
              {isAr ? '3. السيناريو السلبي الهابط' : '3. Bearish Scenario'}
            </span>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              {isAr ? scenarios.bearishScenarioAr : scenarios.bearishScenarioEn}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-rose-50/40 border border-rose-200">
          <h4 className="text-xs font-bold text-rose-900 mb-1.5 flex items-center gap-1.5">
            <span>⚠️</span> {isAr ? 'شروط إلغاء الصفقة والتوصية (Invalidation Criteria):' : 'Strict Invalidation Criteria:'}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
            {(isAr ? invalidationConditions.conditionsAr : invalidationConditions.conditionsEn).map((cond, i) => (
              <li key={i}>{cond}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= 10. FINAL ASSESSMENT CARD ================= */}
      <section className="mb-6 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white p-5 text-center shadow-lg" style={{ breakInside: 'avoid' }}>
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
          {isAr ? 'التقييم المؤسسي والقرار النهائي' : 'FINAL INSTITUTIONAL VERDICT'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          {getRecommendationLabel(finalAssessment.recommendation)}
        </h2>
        <p className="text-sm font-semibold text-emerald-400 mb-4 font-sans">
          {isAr ? finalAssessment.recommendationAr : 'High-Probability Quantitative Trade Setup'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800 pt-4 max-w-xl mx-auto">
          <div>
            <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل الثقة:' : 'Confidence:'}</span>
            <span className="font-mono font-bold text-white text-sm">{finalAssessment.confidenceScore}/100</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isAr ? 'نقطة الدخول القصوى:' : 'Entry Max:'}</span>
            <span className="font-mono font-bold text-white text-sm">${tradingPlan.entryMax}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isAr ? 'وقف الخسارة الإلزامي:' : 'Stop Loss:'}</span>
            <span className="font-mono font-bold text-rose-400 text-sm">${tradingPlan.stopLoss.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isAr ? 'الهدف الأول (T1):' : 'Target 1:'}</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">${tradingPlan.target1.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* ================= 11. DATA SOURCES & METHODOLOGY DISCLAIMER ================= */}
      <footer className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 font-mono space-y-1" style={{ breakInside: 'avoid' }}>
        <div className="flex flex-wrap justify-between gap-2">
          <span>{isAr ? 'مزود البيانات المباشرة:' : 'Market Feed:'} {isAr ? 'تغذية حية للأسهم الأمريكية وقاعدة البيانات' : dataSources.marketDataProvider}</span>
          <span>{isAr ? 'مزود القوائم المالية:' : 'Financial Provider:'} {isAr ? 'محرك القوائم المالية المدققة وإفصاحات SEC' : dataSources.financialDataProvider}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-slate-400">
          <span>{isAr ? 'الفترة الزمنية:' : 'Period:'} {isAr ? 'قوائم مدققة لآخر 12 شهراً • إشارات يومية ولحظية' : `${dataSources.financialPeriod} • ${dataSources.indicatorTimeframe}`}</span>
          <span>{isAr ? 'وقت الإنشاء والتوليد:' : 'Generated:'} {isAr ? dataSources.reportGeneratedAtDateAr : dataSources.reportGeneratedAtDateEn}</span>
        </div>
        <p className="text-[9px] text-slate-400 leading-tight pt-1">
          {isAr
            ? 'إخلاء مسؤولية: هذا التقرير تم إنشاؤه لأغراض بحثية وفنية واستثمارية مبنية على البيانات اللحظية والتحليل الكمي والقوائم المالية المدققة، ولا يعتبر استشارة مالية أو توصية استثمارية مباشرة.'
            : 'Disclaimer: This quantitative report is produced for institutional research and technical assessment based on real-time market data. Not financial advice.'}
        </p>
      </footer>
    </div>
  );
};
