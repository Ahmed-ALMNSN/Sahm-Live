import { StockQuote, ChartDataPoint, CompanyProfile } from '../types.js';

export interface MarketProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getQuote(symbol: string): Promise<StockQuote | null>;
  getQuotes(symbols: string[]): Promise<Record<string, StockQuote>>;
  getChart(symbol: string, range?: string, interval?: string): Promise<ChartDataPoint[]>;
  getCompanyProfile(symbol: string): Promise<CompanyProfile | null>;
}
