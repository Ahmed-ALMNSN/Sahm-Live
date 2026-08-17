export interface DetailedFinancials {
  revenue?: number;
  revenueGrowth?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  epsGrowth?: number;
  operatingCashflow?: number;
  freeCashflow?: number;
  totalCash?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  ebitda?: number;
  enterpriseValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  bookValue?: number;
  financialCurrency?: string;
}

export interface DilutionAndShareData {
  sharesOutstanding?: number;
  impliedSharesOutstanding?: number;
  floatShares?: number;
  floatPercent?: number;
  sharesShort?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  lastSplitFactor?: string;
  lastSplitDate?: number;
  recentOfferingsIdentified?: boolean;
  dilutionRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reverseSplitRiskScore: number;
}

export interface BidAskData {
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  spread?: number;
  spreadPercent?: number;
  spreadRating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'HIGH_RISK' | 'VERY_HIGH_RISK';
}

export interface StockCatalyst {
  title: string;
  source: string;
  publishedAt: number;
  snippet?: string;
  url?: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  impactCategory?: string;
}

export interface MultiTimeframeCharts {
  '1D'?: any[];
  '5D'?: any[];
  '1M'?: any[];
  '3M'?: any[];
  '6M'?: any[];
  '1Y'?: any[];
}

export interface FullStockAnalysisData {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  description?: string;
  currency: string;
  
  // Real-time market quote
  quote: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    previousClose: number;
    high: number;
    low: number;
    volume: number;
    avgVolume20D?: number;
    avgVolume3M?: number;
    marketCap?: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    preMarketPrice?: number;
    postMarketPrice?: number;
    marketState: string;
    timestamp: number;
  };

  // Order Book
  bidAsk: BidAskData;

  // Financials
  financials: DetailedFinancials;

  // Dilution & Splits
  shareStructure: DilutionAndShareData;

  // Catalysts / News
  catalysts: StockCatalyst[];

  // Charts
  charts: MultiTimeframeCharts;

  // Analyst Targets
  targetPrice?: {
    current?: number;
    targetHigh?: number;
    targetLow?: number;
    targetMean?: number;
    targetMedian?: number;
    recommendationKey?: string;
    numberOfAnalystOpinions?: number;
  };

  // Metadata Timestamps
  timestamps: {
    quoteTime: number;
    financialPeriod?: string;
    newsUpdated: number;
    analyzedAt: number;
  };
}
