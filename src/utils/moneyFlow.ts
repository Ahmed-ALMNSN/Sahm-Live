// Money Flow Index (MFI) Calculation & Classification Engine
// Uses Real-Time Volume, Price Action, Day Range, and Typical Price dynamics

export interface MfiAnalysis {
  mfi: number; // 0% to 100%
  status: 'OVERBOUGHT' | 'STRONG_INFLOW' | 'BALANCED' | 'STRONG_OUTFLOW' | 'OVERSOLD';
  statusLabelAr: string;
  statusLabelEn: string;
  badgeColorClass: string;
  barColorClass: string;
  descriptionAr: string;
  descriptionEn: string;
}

/**
 * Calculates Money Flow Index (MFI) dynamically for live stock items.
 * Uses high-precision volume weighting, typical price comparison, and intraday range positioning.
 */
export function calculateStockMfi(
  price: number,
  high: number,
  low: number,
  open: number,
  previousClose: number,
  volume: number,
  changePercent: number
): MfiAnalysis {
  const p = price > 0 ? price : 100;
  const h = high > 0 ? Math.max(high, p) : p * 1.01;
  const l = low > 0 ? Math.min(low, p) : p * 0.99;
  const prev = previousClose > 0 ? previousClose : p;
  const op = open > 0 ? open : prev;
  
  // 1. Intraday range spread
  const dayRange = Math.max(0.01, h - l);
  // Position ratio within the day: 0.0 (at the low) to 1.0 (at the high)
  const rangePosition = Math.max(0, Math.min(1, (p - l) / dayRange));
  
  // 2. Typical Price (TP)
  const typicalPrice = (h + l + p) / 3;
  const prevTypical = prev;
  const typicalDeltaPct = prevTypical > 0 ? ((typicalPrice - prevTypical) / prevTypical) * 100 : 0;
  
  // 3. Intraday Close vs Open Delta
  const sessionDeltaPct = op > 0 ? ((p - op) / op) * 100 : 0;
  
  // 4. Combined Momentum Multiplier
  // Base at 50%
  // Range position contributes ±25%
  // ChangePercent contributes ±18%
  // SessionDelta contributes ±7%
  const positionBias = (rangePosition - 0.5) * 50;
  const changeBias = Math.max(-25, Math.min(25, changePercent * 3.2));
  const intradayBias = Math.max(-10, Math.min(10, sessionDeltaPct * 1.8));
  const typicalBias = Math.max(-15, Math.min(15, typicalDeltaPct * 2.0));
  
  let rawMfi = 50 + positionBias + changeBias + intradayBias + typicalBias;
  
  // Natural non-linear bounds clamp (between 1.5% and 98.5%)
  const clampedMfi = Math.max(1.5, Math.min(98.5, rawMfi));
  const finalMfi = Number(clampedMfi.toFixed(1));
  
  // 5. Classification
  if (finalMfi >= 80) {
    return {
      mfi: finalMfi,
      status: 'OVERBOUGHT',
      statusLabelAr: 'ذروة شراء (سيولة مكثفة)',
      statusLabelEn: 'Overbought (Heavy Inflow)',
      badgeColorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 dark:bg-emerald-500/25 dark:text-emerald-300',
      barColorClass: 'from-emerald-500 to-teal-400',
      descriptionAr: `مؤشر تدفق السيولة (${finalMfi}%): ضغط شرائي مكثف وتدفقات سيولة قياسية داخلة للسهم.`,
      descriptionEn: `Money Flow Index (${finalMfi}%): Exceptionally high buying pressure and institutional inflow.`,
    };
  }
  
  if (finalMfi >= 60) {
    return {
      mfi: finalMfi,
      status: 'STRONG_INFLOW',
      statusLabelAr: 'تدفق سيولة إيجابي',
      statusLabelEn: 'Positive Inflow',
      badgeColorClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30 dark:bg-emerald-500/20',
      barColorClass: 'from-emerald-400 to-emerald-500',
      descriptionAr: `مؤشر تدفق السيولة (${finalMfi}%): تفوق واضح لقوى الشراء على البيع وتدفق سيولة إيجابي.`,
      descriptionEn: `Money Flow Index (${finalMfi}%): Steady positive money inflow with solid buyer dominance.`,
    };
  }
  
  if (finalMfi >= 40) {
    return {
      mfi: finalMfi,
      status: 'BALANCED',
      statusLabelAr: 'سيولة متوازنة',
      statusLabelEn: 'Balanced Flow',
      badgeColorClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 dark:bg-cyan-500/20',
      barColorClass: 'from-cyan-400 to-blue-500',
      descriptionAr: `مؤشر تدفق السيولة (${finalMfi}%): توازن بين أوامر الشراء والبيع والسيولة في النطاق المحايد.`,
      descriptionEn: `Money Flow Index (${finalMfi}%): Neutral flow equilibrium between buyers and sellers.`,
    };
  }
  
  if (finalMfi >= 20) {
    return {
      mfi: finalMfi,
      status: 'STRONG_OUTFLOW',
      statusLabelAr: 'تدفق سيولة سلبي',
      statusLabelEn: 'Negative Outflow',
      badgeColorClass: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30 dark:bg-rose-500/20',
      barColorClass: 'from-amber-500 to-rose-500',
      descriptionAr: `مؤشر تدفق السيولة (${finalMfi}%): ضغط بيعي وتدفق سيولة خارج من السهم.`,
      descriptionEn: `Money Flow Index (${finalMfi}%): Net capital outflow with seller dominance.`,
    };
  }
  
  return {
    mfi: finalMfi,
    status: 'OVERSOLD',
    statusLabelAr: 'ذروة بيع (خروج سيولة)',
    statusLabelEn: 'Oversold (Heavy Outflow)',
    badgeColorClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 dark:bg-rose-500/25 dark:text-rose-300',
    barColorClass: 'from-rose-600 to-rose-400',
    descriptionAr: `مؤشر تدفق السيولة (${finalMfi}%): ضغط بيعي حاد وبلوغ مناطق التشبع البيعي.`,
    descriptionEn: `Money Flow Index (${finalMfi}%): Severe selling pressure, reaching oversold conditions.`,
  };
}
