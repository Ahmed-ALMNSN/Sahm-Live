import { BrokeragePlatform, TradeCalculationInput, TradeCalculationResult } from '../types.js';

export class TradingCalculationService {
  /**
   * Calculates comprehensive, high-precision trade analytics including all buy & sell commissions,
   * platform broker fees, exchange & regulatory fees, VAT, tax, break-even price, and net P/L.
   */
  static calculate(input: TradeCalculationInput): TradeCalculationResult {
    const {
      symbol = '',
      buyPrice = 0,
      shares = 0,
      broker,
      customBuyCommission,
      customSellCommission,
      customTaxRate,
      customVatRate,
      customAdditionalFees,
    } = input;

    const sellPrice = input.sellPrice !== undefined ? input.sellPrice : (input.currentPrice !== undefined ? input.currentPrice : buyPrice);
    const currentPrice = input.currentPrice !== undefined ? input.currentPrice : sellPrice;

    const safeShares = Math.max(0, shares);
    const safeBuyPrice = Math.max(0, buyPrice);
    const safeSellPrice = Math.max(0, sellPrice);

    // 1. Gross Buy Amount
    const grossBuyAmount = safeBuyPrice * safeShares;

    // 2. Buy Commission Calculation
    let rawBuyCommission = 0;
    if (broker.buy_commission_type === 'percentage') {
      rawBuyCommission = (grossBuyAmount * (broker.buy_commission_value || 0)) / 100;
    } else if (broker.buy_commission_type === 'per_share') {
      rawBuyCommission = safeShares * (broker.buy_commission_value || 0);
    } else if (broker.buy_commission_type === 'fixed') {
      rawBuyCommission = broker.buy_commission_value || 0;
    }

    if (broker.minimum_commission && broker.minimum_commission > 0 && grossBuyAmount > 0) {
      rawBuyCommission = Math.max(broker.minimum_commission, rawBuyCommission);
    }
    if (broker.maximum_commission && broker.maximum_commission > 0 && grossBuyAmount > 0) {
      rawBuyCommission = Math.min(broker.maximum_commission, rawBuyCommission);
    }

    const buyCommission = customBuyCommission !== undefined ? customBuyCommission : rawBuyCommission;

    // 3. Buy Additional Broker Fees
    const buyBrokerFee = broker.broker_fee || 0;
    const buyExchangeFee = (grossBuyAmount * (broker.exchange_fee || 0)) / 100;
    const buyRegulatoryFee = (grossBuyAmount * (broker.regulatory_fee || 0)) / 100;
    
    const taxRate = customTaxRate !== undefined ? customTaxRate : (broker.tax_rate || 0);
    const buyTax = (grossBuyAmount * taxRate) / 100;

    const vatRate = customVatRate !== undefined ? customVatRate : (broker.vat_rate || 0);
    // VAT is applied to brokerage services/commissions and exchange fees
    const buyVat = ((buyCommission + buyBrokerFee + buyExchangeFee) * vatRate) / 100;

    const additionalFeesTotal = customAdditionalFees !== undefined ? customAdditionalFees : (broker.additional_fee || 0);
    const buyAdditionalFees = additionalFeesTotal / 2;

    const totalBuyFees = buyCommission + buyBrokerFee + buyExchangeFee + buyRegulatoryFee + buyTax + buyVat + buyAdditionalFees;
    const totalCost = grossBuyAmount + totalBuyFees;
    const effectiveCostPerShare = safeShares > 0 ? totalCost / safeShares : safeBuyPrice;

    // 4. Gross Sell Amount
    const grossSellAmount = safeSellPrice * safeShares;

    // 5. Sell Commission Calculation
    let rawSellCommission = 0;
    if (broker.sell_commission_type === 'percentage') {
      rawSellCommission = (grossSellAmount * (broker.sell_commission_value || 0)) / 100;
    } else if (broker.sell_commission_type === 'per_share') {
      rawSellCommission = safeShares * (broker.sell_commission_value || 0);
    } else if (broker.sell_commission_type === 'fixed') {
      rawSellCommission = broker.sell_commission_value || 0;
    }

    if (broker.minimum_commission && broker.minimum_commission > 0 && grossSellAmount > 0) {
      rawSellCommission = Math.max(broker.minimum_commission, rawSellCommission);
    }
    if (broker.maximum_commission && broker.maximum_commission > 0 && grossSellAmount > 0) {
      rawSellCommission = Math.min(broker.maximum_commission, rawSellCommission);
    }

    const sellCommission = customSellCommission !== undefined ? customSellCommission : rawSellCommission;

    // 6. Sell Additional Fees
    const sellBrokerFee = broker.broker_fee || 0;
    const sellExchangeFee = (grossSellAmount * (broker.exchange_fee || 0)) / 100;
    const sellRegulatoryFee = (grossSellAmount * (broker.regulatory_fee || 0)) / 100;
    const sellTax = (grossSellAmount * taxRate) / 100;
    const sellVat = ((sellCommission + sellBrokerFee + sellExchangeFee) * vatRate) / 100;
    const sellAdditionalFees = additionalFeesTotal / 2;

    const totalSellFees = sellCommission + sellBrokerFee + sellExchangeFee + sellRegulatoryFee + sellTax + sellVat + sellAdditionalFees;
    const netSellAmount = grossSellAmount - totalSellFees;

    // 7. Combined Summary & Profitability
    const totalFees = totalBuyFees + totalSellFees;
    const feePercentageOfCapital = totalCost > 0 ? (totalFees / totalCost) * 100 : 0;
    const grossProfit = grossSellAmount - grossBuyAmount;
    const netProfit = netSellAmount - totalCost;
    const netLoss = netProfit < 0 ? Math.abs(netProfit) : 0;
    const profitPercent = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    const profitPerShare = safeShares > 0 ? netProfit / safeShares : 0;

    // 8. Exact Analytical Break-Even Price Calculation
    // TotalCost + TotalSellFees(BreakEvenPrice) = BreakEvenPrice * Shares
    // BreakEvenPrice * Shares * (1 - VariableFeeRate) = TotalCost + FixedSellFees
    let variableSellRate = 0;
    let fixedSellFees = sellBrokerFee + sellAdditionalFees;

    if (broker.sell_commission_type === 'percentage') {
      variableSellRate += (broker.sell_commission_value || 0) / 100;
    } else if (broker.sell_commission_type === 'per_share') {
      fixedSellFees += safeShares * (broker.sell_commission_value || 0);
    } else if (broker.sell_commission_type === 'fixed') {
      fixedSellFees += broker.sell_commission_value || 0;
    }

    variableSellRate += (broker.exchange_fee || 0) / 100;
    variableSellRate += (broker.regulatory_fee || 0) / 100;
    variableSellRate += taxRate / 100;
    
    // Add VAT component on percentage commission and exchange fee
    if (vatRate > 0 && broker.sell_commission_type === 'percentage') {
      variableSellRate += (((broker.sell_commission_value || 0) + (broker.exchange_fee || 0)) * vatRate) / 10000;
    }

    let breakEvenPrice = safeBuyPrice;
    if (safeShares > 0 && variableSellRate < 1) {
      breakEvenPrice = (totalCost + fixedSellFees) / (safeShares * (1 - variableSellRate));
    }

    return {
      symbol,
      buyPrice: safeBuyPrice,
      shares: safeShares,
      sellPrice: safeSellPrice,
      currentPrice,
      grossBuyAmount,
      buyCommission,
      buyBrokerFee,
      buyExchangeFee,
      buyRegulatoryFee,
      buyTax,
      buyVat,
      buyAdditionalFees,
      totalBuyFees,
      totalCost,
      effectiveCostPerShare,
      grossSellAmount,
      sellCommission,
      sellBrokerFee,
      sellExchangeFee,
      sellRegulatoryFee,
      sellTax,
      sellVat,
      sellAdditionalFees,
      totalSellFees,
      netSellAmount,
      totalFees,
      feePercentageOfCapital,
      grossProfit,
      netProfit,
      netLoss,
      profitPercent,
      profitPerShare,
      breakEvenPrice,
      isProfitable: netProfit >= 0,
      currency: broker.currency || 'USD',
      brokerName: broker.name_ar || broker.name_en || 'Sahm',
    };
  }

  /**
   * Generates a clear, actionable Buy/Wait/Avoid verdict based on the calculator results,
   * break-even feasibility, fee drag, and risk-reward profile.
   */
  static evaluateTradeDecision(
    calcResult: TradeCalculationResult,
    options?: {
      stopLossPrice?: number;
      currentMarketPrice?: number;
    }
  ): TradeDecisionVerdict {
    const { buyPrice, sellPrice, shares, totalCost, totalFees, netProfit, profitPercent, breakEvenPrice, grossProfit } = calcResult;
    const stopLoss = options?.stopLossPrice && options.stopLossPrice > 0 ? options.stopLossPrice : buyPrice * 0.96;
    const currentPrice = options?.currentMarketPrice || buyPrice;

    const breakEvenGapPercent = buyPrice > 0 ? ((breakEvenPrice - buyPrice) / buyPrice) * 100 : 0;
    const feeDragPercent = grossProfit > 0 ? (totalFees / grossProfit) * 100 : (grossProfit <= 0 ? 100 : 0);
    const feePercentageOfCapital = calcResult.feePercentageOfCapital;

    // Risk vs Reward calculation
    const riskPerShare = Math.max(0.01, buyPrice - stopLoss + (totalFees / Math.max(1, shares)));
    const rewardPerShare = Math.max(0, sellPrice - buyPrice - (totalFees / Math.max(1, shares)));
    const riskRewardRatio = Number((rewardPerShare / riskPerShare).toFixed(2));

    const prosAr: string[] = [];
    const warningsAr: string[] = [];
    let score = 50;

    // 1. Loss scenario (sell target below break-even)
    if (sellPrice <= breakEvenPrice || netProfit <= 0) {
      warningsAr.push(`السعر المستهدف ($${sellPrice.toFixed(2)}) أقل من سعر نقطة التعادل ($${breakEvenPrice.toFixed(2)}).`);
      warningsAr.push(`خسارة محققة قدرها -$${Math.abs(netProfit).toFixed(2)} بسبب استقطاعات العمولات والرسوم.`);
      if (feePercentageOfCapital > 1.5) {
        warningsAr.push(`حجم الصفقة صغير بالنسبة للحد الأدنى لعمولة المنصة (${feePercentageOfCapital.toFixed(2)}% من رأس المال).`);
      }

      return {
        verdict: 'DO_NOT_BUY',
        verdictAr: 'تجنب الشراء / صفقة غير مجدية',
        verdictEn: 'DO NOT BUY / UNFAVORABLE',
        badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400',
        summaryAr: `الصفقة تؤدي إلى خسارة صافية قدرها -$${Math.abs(netProfit).toFixed(2)} بعد خصم عمولات منصة ${calcResult.brokerName} والضرائب. الهدف المحدد لا يغطي سعر التعادل ($${breakEvenPrice.toFixed(2)}).`,
        summaryEn: `Trade results in a net loss of -$${Math.abs(netProfit).toFixed(2)} after commissions. Target is below break-even ($${breakEvenPrice.toFixed(2)}).`,
        actionGuidanceAr: `ارفع السعر المستهدف أعلى من $${breakEvenPrice.toFixed(2)} أو قم بزيادة عدد الأسهم لتجاوز أثر الحد الأدنى للعمولة.`,
        riskRewardRatio: 0,
        breakEvenPrice,
        breakEvenGapPercent: Number(breakEvenGapPercent.toFixed(2)),
        targetProfitPercent: Number(profitPercent.toFixed(2)),
        feeDragPercent: Number(Math.min(100, feeDragPercent).toFixed(1)),
        isFeeDragDangerous: true,
        score: Math.max(5, Math.round(15 - Math.abs(profitPercent))),
        prosAr: [],
        warningsAr,
      };
    }

    // 2. Marginal or high-fee scenario (Fee drag > 35% or profitPercent < 1.2% or R:R < 1.0)
    if (feeDragPercent > 35 || profitPercent < 1.2 || (riskRewardRatio > 0 && riskRewardRatio < 1.2)) {
      warningsAr.push(`عمولات المنصة تلتهم ${feeDragPercent.toFixed(1)}% من إجمالي الأرباح المتوقعة.`);
      if (profitPercent < 1.2) {
        warningsAr.push(`هامش الربح الصافي (+${profitPercent.toFixed(2)}%) ضعيف مقارنة بمخاطر التداول.`);
      }
      if (riskRewardRatio < 1.2) {
        warningsAr.push(`نسبة العائد إلى المخاطرة (${riskRewardRatio}:1) أقل من المعدل الآمن الموصى به (2:1).`);
      }
      prosAr.push(`الصفقة رابحة بعد الرسوم بصافي: +$${netProfit.toFixed(2)}.`);
      prosAr.push(`سعر نقطة التعادل: $${breakEvenPrice.toFixed(2)} (فارق +${breakEvenGapPercent.toFixed(2)}%).`);

      score = Math.round(40 + profitPercent * 3 - (feeDragPercent > 50 ? 15 : 0));

      return {
        verdict: 'WAIT',
        verdictAr: 'انتظار وتعديل الأهداف / جدوى منخفضة',
        verdictEn: 'WAIT / MARGINAL TRADE',
        badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400',
        summaryAr: `الصفقة تغطي العمولات بهامش ضئيل (+${profitPercent.toFixed(2)}%)، ولكن رسوم الوسيط تلتهم ${feeDragPercent.toFixed(1)}% من الأرباح الإجمالية.`,
        summaryEn: `Trade covers fees with slim margin (+${profitPercent.toFixed(2)}%), but commissions eat ${feeDragPercent.toFixed(1)}% of total profit.`,
        actionGuidanceAr: `يُنصح برفع الهدف السعري لتحقيق عائد لا يقل عن +3% صافي، أو زيادة عدد الأسهم لتخفيض النسبة المئوية للعمولة من رأس المال.`,
        riskRewardRatio,
        breakEvenPrice,
        breakEvenGapPercent: Number(breakEvenGapPercent.toFixed(2)),
        targetProfitPercent: Number(profitPercent.toFixed(2)),
        feeDragPercent: Number(feeDragPercent.toFixed(1)),
        isFeeDragDangerous: feeDragPercent > 50,
        score: Math.min(65, Math.max(35, score)),
        prosAr,
        warningsAr,
      };
    }

    // 3. Positive viable Buy candidate
    prosAr.push(`صافي ربح مجزٍ بعد كافة العمولات والضرائب: +$${netProfit.toFixed(2)} (+${profitPercent.toFixed(2)}%).`);
    prosAr.push(`سعر التعادل آمن عند $${breakEvenPrice.toFixed(2)} (+${breakEvenGapPercent.toFixed(2)}% فقط).`);
    prosAr.push(`رسوم الوسيط تمثل ${feePercentageOfCapital.toFixed(2)}% فقط من رأس المال (كفاءة مالية عالية).`);
    if (riskRewardRatio >= 2) {
      prosAr.push(`نسبة العائد إلى المخاطرة ممتازة: 1 إلى ${riskRewardRatio}.`);
    }

    score = Math.min(98, Math.round(70 + Math.min(25, profitPercent * 2)));

    return {
      verdict: 'BUY',
      verdictAr: 'إشارة شراء ممتازة / صفقة ذات جدوى عالية',
      verdictEn: 'BUY CANDIDATE / HIGH VALUE TRADE',
      badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
      summaryAr: `صفقة ذات جدوى استثمارية عالية مع هامش ربح صافٍ (+${profitPercent.toFixed(2)}%) يغطي العمولات والضرائب بأمان واكتمال.`,
      summaryEn: `High-conviction trade with strong net profit margin (+${profitPercent.toFixed(2)}%) safely covering all commissions and taxes.`,
      actionGuidanceAr: `صفقة متوازنة وجاهزة للتنفيذ. التزم بوقف الخسارة عند $${stopLoss.toFixed(2)} والهدف عند $${sellPrice.toFixed(2)}.`,
      riskRewardRatio,
      breakEvenPrice,
      breakEvenGapPercent: Number(breakEvenGapPercent.toFixed(2)),
      targetProfitPercent: Number(profitPercent.toFixed(2)),
      feeDragPercent: Number(feeDragPercent.toFixed(1)),
      isFeeDragDangerous: false,
      score,
      prosAr,
      warningsAr,
    };
  }
}

export interface TradeDecisionVerdict {
  verdict: 'BUY' | 'WAIT' | 'DO_NOT_BUY';
  verdictAr: string;
  verdictEn: string;
  badgeClass: string;
  summaryAr: string;
  summaryEn: string;
  actionGuidanceAr: string;
  riskRewardRatio: number;
  breakEvenPrice: number;
  breakEvenGapPercent: number;
  targetProfitPercent: number;
  feeDragPercent: number;
  isFeeDragDangerous: boolean;
  score: number;
  prosAr: string[];
  warningsAr: string[];
}
