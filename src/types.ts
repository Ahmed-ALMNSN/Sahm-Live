export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';
export type ScreenWidthMode = 'fluid' | 'wide' | 'standard';
export type ScreenDensityMode = 'compact' | 'normal' | 'comfortable';

export type FilterType = 
  | 'ALL' 
  | 'RISING' 
  | 'FALLING' 
  | 'ALERTS_ENABLED' 
  | 'UPPER_ALERT' 
  | 'LOWER_ALERT' 
  | 'NO_ALERTS'
  | 'WITH_POSITIONS'
  | 'PROFITABLE'
  | 'UNPROFITABLE';

export type SortField = 
  | 'symbol' 
  | 'companyName' 
  | 'price' 
  | 'changePercent' 
  | 'volume' 
  | 'mfi'
  | 'dayHigh' 
  | 'dayLow' 
  | 'upperAlert' 
  | 'lowerAlert' 
  | 'netProfit'
  | 'profitPercent'
  | 'costBasis'
  | 'currentValue'
  | 'lastUpdated';

export type SortDirection = 'asc' | 'desc';

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
  exchange_fee: number; // percentage
  regulatory_fee: number; // percentage
  tax_rate: number; // percentage
  vat_rate: number; // percentage
  additional_fee: number;
  notes?: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: number;
  updated_at?: number;
}

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
  mfi?: number;
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
  
  // Trading position fields
  buyPrice?: number | null;
  shares?: number | null;
  brokerId?: string | null;
  
  // Calculated trading analytics
  costBasis?: number;
  currentValue?: number;
  grossProfit?: number;
  netProfit?: number;
  profitPercent?: number;
  totalFees?: number;
  breakEvenPrice?: number;
  
  // Alert crossing states
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
  buyPrice?: number | null;
  shares?: number | null;
  brokerId?: string | null;
}

export interface DetectedColumnsInfo {
  symbolCol?: string;
  upperAlertCol?: string;
  lowerAlertCol?: string;
  companyCol?: string;
  sectorCol?: string;
  priceCol?: string;
  buyPriceCol?: string;
  sharesCol?: string;
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
  detectedColumns?: DetectedColumnsInfo;
  error?: string;
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
  
  // Buy Breakdown
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

  // Sell Breakdown
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

  // Combined Results & Profitability
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

export interface UserSettings {
  theme: Theme;
  lang: Language;
  refreshInterval: number;
  defaultBrokerId: string;
  soundAlerts: boolean;
  notificationPermission: string;
}

export interface ImportJobRecord {
  id: string;
  filename: string;
  fileType: string;
  importedRows: number;
  successfulRows: number;
  failedRows: number;
  importedAt: number;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  timestamp: number;
  metadata?: string;
}
