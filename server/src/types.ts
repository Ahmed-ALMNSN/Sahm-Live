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
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  companyName?: string;
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
