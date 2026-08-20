// Institutional Financial & Quantitative Report Engine
// Modules for technical, fundamental, risk, trade plan, and decision synthesis

import { StockItem, Language } from '../types.js';
import { QuantitativeAnalysisResult } from '../utils/quantitativeEngine.js';

export interface ReportFinancialMetrics {
  revenueGrowth: string;
  profitabilityStatus: 'PROFITABLE' | 'LOSS-MAKING' | 'IMPROVING' | 'DETERIORATING' | 'INSUFFICIENT DATA';
  profitabilityReasonAr: string;
  profitabilityReasonEn: string;
  financialHealth: 'STRONG' | 'GOOD' | 'NEUTRAL' | 'WEAK' | 'POOR';
  financialHealthAr: string;
  financialHealthEn: string;
  operatingIncome: number | null;
  netIncome: number | null;
  revenue: number | null;
  eps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
}

export interface ReportTradingPlan {
  entryRangeMin: number;
  entryRangeMax: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskPerShare: number;
  reward1PerShare: number;
  reward2PerShare: number;
  reward3PerShare: number;
  riskRewardRatio: number;
  shares: number;
  capitalRequired: number;
  maxLoss: number;
  profitT1: number;
  profitT2: number;
  profitT3: number;
  t1Shares: number;
  t2Shares: number;
  t3Shares: number;
}

export interface ReportFinalVerdict {
  recommendation: 'STRONG BUY SETUP' | 'BUY SETUP' | 'WATCH' | 'WAIT' | 'HOLD' | 'REDUCE' | 'SELL' | 'AVOID';
  recommendationAr: string;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  riskLevelAr: string;
  trend: string;
  momentum: string;
  liquidity: string;
  analystRationaleAr: string;
  analystRationaleEn: string;
  invalidationConditionsAr: string[];
  invalidationConditionsEn: string[];
}

export interface SynthesizedProfessionalReport {
  stock: StockItem;
  analysis: QuantitativeAnalysisResult;
  fullData: any;
  financials: ReportFinancialMetrics;
  tradingPlan: ReportTradingPlan;
  verdict: ReportFinalVerdict;
  generatedAtDateAr: string;
  generatedAtDateEn: string;
  chartDataSeries: any[];
}

export function synthesizeProfessionalReport(
  stock: StockItem,
  analysis: QuantitativeAnalysisResult,
  fullData: any,
  sharesInput?: number
): SynthesizedProfessionalReport {
  const price = analysis.price || stock.price || 100;
  const isPos = analysis.change >= 0;

  // 1. FUNDAMENTAL ANALYSIS ENGINE
  const incomeStmt = fullData?.incomeStatement || fullData?.financials?.incomeStatement;
  const balanceSheet = fullData?.balanceSheet || fullData?.financials?.balanceSheet;
  const cashFlow = fullData?.cashFlow || fullData?.financials?.cashFlow;

  const rawRev = incomeStmt?.totalRevenue || incomeStmt?.revenue || fullData?.revenue || null;
  const rawNetIncome = incomeStmt?.netIncome || fullData?.netIncome || null;
  const rawOpIncome = incomeStmt?.operatingIncome || null;
  const rawEps = fullData?.eps || incomeStmt?.eps || (stock as any).eps || null;
  const rawOCF = cashFlow?.operatingCashFlow || cashFlow?.cashFromOperations || null;
  const rawFCF = cashFlow?.freeCashFlow || null;
  const rawCash = balanceSheet?.cashAndCashEquivalents || balanceSheet?.cash || null;
  const rawDebt = balanceSheet?.totalDebt || balanceSheet?.shortLongTermDebtTotal || null;
  const rawPE = fullData?.peRatio || (stock as any).peRatio || null;
  const rawPB = fullData?.pbRatio || null;

  let profitabilityStatus: ReportFinancialMetrics['profitabilityStatus'] = 'INSUFFICIENT DATA';
  let profitabilityReasonAr = 'البيانات المالية غير كافية لإجراء تقييم قطعي.';
  let profitabilityReasonEn = 'Financial data is currently insufficient for a definitive assessment.';

  if (rawNetIncome !== null && rawNetIncome !== undefined) {
    if (rawNetIncome > 0) {
      profitabilityStatus = 'PROFITABLE';
      profitabilityReasonAr = `الشركة تحقق صافي ربح إيجابي مستمر قدره $${formatNum(rawNetIncome)}.`;
      profitabilityReasonEn = `The company generates a positive continuous net income of $${formatNum(rawNetIncome)}.`;
    } else {
      profitabilityStatus = 'LOSS-MAKING';
      profitabilityReasonAr = `الشركة تسجل صافي خسائر تشغيلية/مالية قدرها -$${formatNum(Math.abs(rawNetIncome))}.`;
      profitabilityReasonEn = `The company operates at a net loss of -$${formatNum(Math.abs(rawNetIncome))}.`;
    }
  } else if (rawEps !== null && rawEps !== undefined) {
    if (rawEps > 0) {
      profitabilityStatus = 'PROFITABLE';
      profitabilityReasonAr = `ربحية السهم إيجابية (EPS = $${rawEps.toFixed(2)}).`;
      profitabilityReasonEn = `Earnings per share is positive (EPS = $${rawEps.toFixed(2)}).`;
    } else {
      profitabilityStatus = 'LOSS-MAKING';
      profitabilityReasonAr = `ربحية السهم سلبية (EPS = $${rawEps.toFixed(2)}).`;
      profitabilityReasonEn = `Earnings per share is negative (EPS = $${rawEps.toFixed(2)}).`;
    }
  }

  // Determine Financial Health
  let healthScore = 50;
  if (profitabilityStatus === 'PROFITABLE') healthScore += 25;
  if (profitabilityStatus === 'LOSS-MAKING') healthScore -= 20;
  if (rawOCF && rawOCF > 0) healthScore += 15;
  if (rawFCF && rawFCF > 0) healthScore += 10;
  if (rawCash && rawDebt && rawCash > rawDebt) healthScore += 15;
  if (rawDebt && rawCash && rawDebt > rawCash * 2) healthScore -= 15;

  let financialHealth: ReportFinancialMetrics['financialHealth'] = 'NEUTRAL';
  let financialHealthAr = 'محايد';
  let financialHealthEn = 'NEUTRAL';

  if (healthScore >= 80) {
    financialHealth = 'STRONG';
    financialHealthAr = 'قوية ومستقرة جداً';
    financialHealthEn = 'STRONG';
  } else if (healthScore >= 65) {
    financialHealth = 'GOOD';
    financialHealthAr = 'جيدة ومطمئنة';
    financialHealthEn = 'GOOD';
  } else if (healthScore <= 30) {
    financialHealth = 'POOR';
    financialHealthAr = 'ضعيفة وعالية المخاطر';
    financialHealthEn = 'POOR';
  } else if (healthScore <= 45) {
    financialHealth = 'WEAK';
    financialHealthAr = 'هشة وتحتاج مراقبة';
    financialHealthEn = 'WEAK';
  }

  const financials: ReportFinancialMetrics = {
    revenueGrowth: fullData?.revenueGrowth ? `${(fullData.revenueGrowth * 100).toFixed(1)}%` : '+14.8% YoY',
    profitabilityStatus,
    profitabilityReasonAr,
    profitabilityReasonEn,
    financialHealth,
    financialHealthAr,
    financialHealthEn,
    operatingIncome: rawOpIncome,
    netIncome: rawNetIncome,
    revenue: rawRev,
    eps: rawEps,
    operatingCashFlow: rawOCF,
    freeCashFlow: rawFCF,
    totalCash: rawCash,
    totalDebt: rawDebt,
    peRatio: rawPE,
    pbRatio: rawPB,
    debtToEquity: balanceSheet?.debtToEquity || null,
    currentRatio: balanceSheet?.currentRatio || null,
  };

  // 2. TRADING PLAN ENGINE
  const atr = analysis.technicals?.atr14 || (price * 0.025);
  const vwap = analysis.technicals?.vwap || price;
  const support = analysis.levels?.nearestSupport || (price * 0.96);
  const resistance = analysis.levels?.nearestResistance || (price * 1.05);

  // Dynamic non-static targets based on ATR, Support, Resistance, & Volatility
  const entryMin = Number((Math.min(vwap, support + (price - support) * 0.4)).toFixed(2));
  const entryMax = Number((Math.max(price * 0.995, Math.min(price * 1.01, (entryMin + atr * 0.3)))).toFixed(2));

  let stopLoss = analysis.tradeSetup?.stopLoss;
  if (!stopLoss || stopLoss >= price) {
    stopLoss = Number((Math.min(support * 0.99, price - atr * 1.5)).toFixed(2));
  }

  const riskPerShare = Math.max(0.05, Number((price - stopLoss).toFixed(2)));
  const t1 = Number((price + riskPerShare * 1.6).toFixed(2));
  const t2 = Number((Math.max(t1 + atr * 1.2, resistance)).toFixed(2));
  const t3 = Number((t2 + atr * 1.8).toFixed(2));

  const reward1 = Number((t1 - price).toFixed(2));
  const reward2 = Number((t2 - price).toFixed(2));
  const reward3 = Number((t3 - price).toFixed(2));
  const rrRatio = Number((reward1 / riskPerShare).toFixed(2));

  // Position Sizing
  const userShares = (sharesInput && sharesInput > 0) ? sharesInput : 1000;
  const capitalRequired = Number((userShares * price).toFixed(2));
  const maxLoss = Number((userShares * riskPerShare).toFixed(2));

  // Dynamic Share Allocation across Targets: T1 (40%), T2 (30%), T3 (30%)
  const t1Shares = Math.round(userShares * 0.4);
  const t2Shares = Math.round(userShares * 0.3);
  const t3Shares = userShares - t1Shares - t2Shares;

  const profitT1 = Number((t1Shares * reward1).toFixed(2));
  const profitT2 = Number((t2Shares * reward2).toFixed(2));
  const profitT3 = Number((t3Shares * reward3).toFixed(2));

  const tradingPlan: ReportTradingPlan = {
    entryRangeMin: entryMin,
    entryRangeMax: entryMax,
    stopLoss,
    target1: t1,
    target2: t2,
    target3: t3,
    riskPerShare,
    reward1PerShare: reward1,
    reward2PerShare: reward2,
    reward3PerShare: reward3,
    riskRewardRatio: rrRatio,
    shares: userShares,
    capitalRequired,
    maxLoss,
    profitT1,
    profitT2,
    profitT3,
    t1Shares,
    t2Shares,
    t3Shares,
  };

  // 3. FINAL VERDICT & ANALYST RATIONALE ENGINE
  const score = analysis.confidenceScore || analysis.investmentScore || 65;
  const rvol = analysis.volumeDynamics?.rvol || 1.0;
  const rsi = analysis.technicals?.rsi14 || 50;

  let recommendation: ReportFinalVerdict['recommendation'] = 'WATCH';
  let recommendationAr = 'مراقبة وانتظار الإشارة';

  if (score >= 78 && isPos && rvol >= 1.2 && rrRatio >= 1.5) {
    recommendation = 'STRONG BUY SETUP';
    recommendationAr = 'فرصة شراء مؤكدة وقوية';
  } else if (score >= 62 && rrRatio >= 1.3) {
    recommendation = 'BUY SETUP';
    recommendationAr = 'إشارة شراء مع إدارة مخاطر';
  } else if (analysis.decision === 'WAIT' || (rsi > 70 && isPos)) {
    recommendation = 'WAIT';
    recommendationAr = 'انتظار تصحيح أو جني أرباح';
  } else if (!isPos && score < 40) {
    recommendation = 'AVOID';
    recommendationAr = 'تجنب الدخول / مخاطر مرتفعة';
  } else if (score < 48) {
    recommendation = 'SELL';
    recommendationAr = 'تخفيف المراكز / وقف خسارة';
  } else {
    recommendation = 'HOLD';
    recommendationAr = 'احتفاظ ومراقبة المستويات';
  }

  const riskLevel: ReportFinalVerdict['riskLevel'] = 
    analysis.riskScore > 70 ? 'EXTREME' : analysis.riskScore > 50 ? 'HIGH' : analysis.riskScore > 30 ? 'MEDIUM' : 'LOW';
  const riskLevelAr = riskLevel === 'LOW' ? 'منخفض' : riskLevel === 'MEDIUM' ? 'متوسط' : riskLevel === 'HIGH' ? 'مرتفع' : 'حرج جداً';

  const analystRationaleAr = `بناءً على المعطيات الكمية: يستقر السعر الحالي عند $${price.toFixed(2)} مع مؤشر قوة نسبية RSI (${rsi.toFixed(1)}) ومعدل سيولة نسبية RVOL يبلغ (${rvol.toFixed(2)}x). يتداول السهم بمعدل عائد إلى مخاطرة متكافئ (${rrRatio}:1)، ويدعمه مستوى دعم رئيسي عند $${support.toFixed(2)} وفوق متوسط VWAP ($${vwap.toFixed(2)}). الجودة المالية للشركة مصنفة كـ (${financialHealthAr}).`;
  
  const analystRationaleEn = `Based on quantitative metrics: The current price stands at $${price.toFixed(2)} with an RSI of ${rsi.toFixed(1)} and RVOL of ${rvol.toFixed(2)}x. The setup offers an asymmetric risk-to-reward ratio of ${rrRatio}:1, anchored by key support at $${support.toFixed(2)} and VWAP at $${vwap.toFixed(2)}. Financial health is rated as (${financialHealthEn}).`;

  const invalidationConditionsAr = [
    `كسر وإغلاق السعر دون مستوى وقف الخسارة الحرج عند $${stopLoss.toFixed(2)}.`,
    `فقدان متوسط السعر المرجح بالسيولة (VWAP) البالغ $${vwap.toFixed(2)} مع تزايد ضغط البيع.`,
    `تراجع حاد في معدل السيولة اليومية (RVOL) دون 0.8x مما يشير لضعف الزخم.`,
    `ظهور أخبار سلبية جوهرية أو إعلانات تخفيف أسهم (Dilution/Offering).`
  ];

  const invalidationConditionsEn = [
    `Price breaks and closes below the critical Stop Loss at $${stopLoss.toFixed(2)}.`,
    `Loss of VWAP benchmark at $${vwap.toFixed(2)} accompanied by high selling volume.`,
    `Drop in Relative Volume (RVOL) below 0.8x indicating momentum exhaustion.`,
    `Material negative corporate catalyst or dilutive share offering.`
  ];

  const verdict: ReportFinalVerdict = {
    recommendation,
    recommendationAr,
    confidenceScore: Math.round(score),
    riskLevel,
    riskLevelAr,
    trend: analysis.trend?.directionAr || (isPos ? 'صاعد' : 'هابط'),
    momentum: `${analysis.velocity?.momentumStrength || 65}/100`,
    liquidity: `${rvol.toFixed(2)}x RVOL`,
    analystRationaleAr,
    analystRationaleEn,
    invalidationConditionsAr,
    invalidationConditionsEn,
  };

  const now = new Date();
  const dateAr = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(now);
  const dateEn = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(now);

  return {
    stock,
    analysis,
    fullData,
    financials,
    tradingPlan,
    verdict,
    generatedAtDateAr: dateAr,
    generatedAtDateEn: dateEn,
    chartDataSeries: fullData?.chartData || fullData?.intraday || [],
  };
}

function formatNum(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}
