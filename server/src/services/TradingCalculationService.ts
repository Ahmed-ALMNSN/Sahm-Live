import { BrokeragePlatform, TradeCalculationInput, TradeCalculationResult } from '../types.js';

export class TradingCalculationService {
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
}
