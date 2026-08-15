export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';

export type FilterType = 
  | 'ALL' 
  | 'RISING' 
  | 'FALLING' 
  | 'ALERTS_ENABLED' 
  | 'UPPER_ALERT' 
  | 'LOWER_ALERT' 
  | 'NO_ALERTS';

export type SortField = 
  | 'symbol' 
  | 'companyName' 
  | 'price' 
  | 'changePercent' 
  | 'volume' 
  | 'dayHigh' 
  | 'dayLow' 
  | 'upperAlert' 
  | 'lowerAlert' 
  | 'lastUpdated';

export type SortDirection = 'asc' | 'desc';

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
  sector?: string;
  exchange?: string;
  currency?: string;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  provider: string;
  timestamp: number;
}

export interface StockItem {
  symbol: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  exchange?: string;
  currency?: string;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  provider?: string;
  upperAlert: number | null;
  lowerAlert: number | null;
  alertsEnabled: boolean;
  
  // Alert crossing states: true means price is currently at or above upper alert (or below lower alert)
  // Used to ensure notification ONLY fires when crossing the threshold, not repeatedly on every tick.
  upperCrossedState?: boolean;
  lowerCrossedState?: boolean;
  
  lastPrice?: number;
  lastUpdated: number;
  flashStatus?: 'up' | 'down' | null;
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

export interface AlertNotification {
  id: string;
  symbol: string;
  companyName?: string;
  type: 'UPPER' | 'LOWER';
  targetPrice: number;
  triggeredPrice: number;
  timestamp: number;
  dateStr?: string;
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

export interface ParsedStockData {
  symbol: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  price?: number;
  upperAlert?: number | null;
  lowerAlert?: number | null;
}

export interface FileParseResult {
  success: boolean;
  stocks: ParsedStockData[];
  filename: string;
  totalRows: number;
  validStocksCount: number;
  duplicateCount: number;
  ignoredCount: number;
  sheetNames?: string[];
  selectedSheet?: string;
  error?: string;
}
