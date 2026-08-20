export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  previousClose: number;
  high: number;
  low: number;
  volume: number;
  mfi?: number;
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  companyName?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  currency?: string;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  provider: string;
  timestamp: number;
}

export interface ChartDataPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  vwap?: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  website?: string;
  description?: string;
  country?: string;
  exchange?: string;
  marketCap?: number;
  employees?: number;
  ceo?: string;
}

export interface AlertHistoryItem {
  id: string;
  symbol: string;
  companyName?: string;
  type: 'UPPER' | 'LOWER';
  targetPrice: number;
  triggeredPrice: number;
  timestamp: number;
  date: string;
}

export interface BrokeragePlatform {
  id: string;
  name_ar: string;
  name_en: string;
  country: string;
  currency: string;
  buy_commission_type: 'percentage' | 'fixed' | 'per_share';
  buy_commission_value: number;
  sell_commission_type: 'percentage' | 'fixed' | 'per_share';
  sell_commission_value: number;
  minimum_commission: number;
  maximum_commission: number;
  broker_fee: number;
  exchange_fee: number;
  regulatory_fee: number;
  tax_rate: number;
  vat_rate: number;
  additional_fee: number;
  notes?: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface TradeCalculationInput {
  symbol?: string;
  buyPrice: number;
  shares: number;
  sellPrice?: number;
  currentPrice?: number;
  broker: BrokeragePlatform;
  customBuyCommission?: number;
  customSellCommission?: number;
  customTaxRate?: number;
  customVatRate?: number;
  customAdditionalFees?: number;
}

export interface TradeCalculationResult {
  symbol: string;
  buyPrice: number;
  shares: number;
  sellPrice: number;
  currentPrice: number;
  grossBuyAmount: number;
  buyCommission: number;
  buyBrokerFee: number;
  buyExchangeFee: number;
  buyRegulatoryFee: number;
  buyTax: number;
  buyVat: number;
  buyAdditionalFees: number;
  totalBuyFees: number;
  totalCost: number;
  effectiveCostPerShare: number;
  grossSellAmount: number;
  sellCommission: number;
  sellBrokerFee: number;
  sellExchangeFee: number;
  sellRegulatoryFee: number;
  sellTax: number;
  sellVat: number;
  sellAdditionalFees: number;
  totalSellFees: number;
  netSellAmount: number;
  totalFees: number;
  feePercentageOfCapital: number;
  grossProfit: number;
  netProfit: number;
  netLoss: number;
  profitPercent: number;
  profitPerShare: number;
  breakEvenPrice: number;
  isProfitable: boolean;
  currency: string;
  brokerName: string;
}

export interface PortfolioPosition {
  id: string;
  userId?: string;
  symbol: string;
  companyName?: string;
  brokerId: string;
  brokerName?: string;
  quantity: number;
  averageBuyPrice: number;
  totalCost: number;
  totalFees: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedProfit?: number;
  unrealizedProfitPercent?: number;
  estimatedExitFees?: number;
  netUnrealizedProfit?: number;
  openedAt: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: number;
  updatedAt: number;
}

export interface TradeRecord {
  id: string;
  userId?: string;
  symbol: string;
  brokerId: string;
  brokerName?: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  grossAmount: number;
  commission: number;
  brokerFee: number;
  exchangeFee: number;
  regulatoryFee: number;
  tax: number;
  vat: number;
  additionalFees: number;
  totalFees: number;
  netAmount: number;
  executedAt: number;
}

export interface SqliteStockRecord {
  symbol: string;
  name: string;
  sector: string;
  exchange?: string;
  price?: number;
  upperAlert?: number | null;
  lowerAlert?: number | null;
  alertsEnabled?: boolean;
  buyPrice?: number | null;
  shares?: number | null;
  brokerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}
