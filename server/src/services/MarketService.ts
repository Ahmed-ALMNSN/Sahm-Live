import { MarketProvider } from '../providers/MarketProvider.js';
import { YahooProvider } from '../providers/YahooProvider.js';
import { FinnhubProvider } from '../providers/FinnhubProvider.js';
import { StockQuote, ChartDataPoint, CompanyProfile } from '../types.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketService {
  private primaryProvider: MarketProvider;
  private fallbackProvider: MarketProvider;
  private quoteCache = new Map<string, CacheEntry<StockQuote>>();
  private profileCache = new Map<string, CacheEntry<CompanyProfile>>();
  private chartCache = new Map<string, CacheEntry<ChartDataPoint[]>>();
  private inFlightBatches = new Map<string, Promise<Record<string, StockQuote>>>();

  private readonly QUOTE_TTL_MS = 4000; // 4 seconds cache to prevent excessive provider hits
  private readonly PROFILE_TTL_MS = 300000; // 5 minutes cache
  private readonly CHART_TTL_MS = 60000; // 1 minute cache

  constructor() {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    const defaultProvider = (process.env.DEFAULT_MARKET_PROVIDER || 'yahoo').toLowerCase();

    const yahoo = new YahooProvider();
    const finnhub = new FinnhubProvider(finnhubKey);

    if (defaultProvider === 'finnhub' && finnhubKey) {
      this.primaryProvider = finnhub;
      this.fallbackProvider = yahoo;
    } else {
      this.primaryProvider = yahoo;
      this.fallbackProvider = finnhub;
    }
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    const cleanSym = symbol.trim().toUpperCase();
    if (!cleanSym) return null;

    // Check cache
    const cached = this.quoteCache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const quotes = await this.getQuotes([cleanSym]);
    return quotes[cleanSym] || null;
  }

  async getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const cleanSymbols = Array.from(
      new Set(
        symbols
          .map(s => (s || '').trim().toUpperCase())
          .filter(s => s.length > 0 && /^[A-Z0-9.\-=]+$/.test(s))
      )
    ).slice(0, 100); // Enforce max 100 symbols per request

    if (cleanSymbols.length === 0) return {};

    const results: Record<string, StockQuote> = {};
    const symbolsToFetch: string[] = [];

    // Check cache first
    const now = Date.now();
    for (const sym of cleanSymbols) {
      const cached = this.quoteCache.get(sym);
      if (cached && cached.expiresAt > now) {
        results[sym] = cached.data;
      } else {
        symbolsToFetch.push(sym);
      }
    }

    if (symbolsToFetch.length === 0) {
      return results;
    }

    // Try primary provider
    try {
      const fetched = await this.primaryProvider.getQuotes(symbolsToFetch);
      for (const [sym, quote] of Object.entries(fetched)) {
        if (quote) {
          results[sym] = quote;
          this.quoteCache.set(sym, { data: quote, expiresAt: now + this.QUOTE_TTL_MS });
        }
      }
    } catch (err) {
      console.warn(`Primary provider (${this.primaryProvider.name}) failed:`, err);
    }

    // Identify missing symbols for fallback
    const missing = symbolsToFetch.filter(sym => !results[sym]);
    if (missing.length > 0 && (await this.fallbackProvider.isAvailable())) {
      try {
        const fallbackQuotes = await this.fallbackProvider.getQuotes(missing);
        for (const [sym, quote] of Object.entries(fallbackQuotes)) {
          if (quote) {
            results[sym] = quote;
            this.quoteCache.set(sym, { data: quote, expiresAt: now + this.QUOTE_TTL_MS });
          }
        }
      } catch (err) {
        console.warn(`Fallback provider (${this.fallbackProvider.name}) failed:`, err);
      }
    }

    return results;
  }

  async getChart(symbol: string, range: string = '1M', interval?: string): Promise<ChartDataPoint[]> {
    const cleanSym = symbol.trim().toUpperCase();
    const cacheKey = `${cleanSym}_${range}_${interval || ''}`;
    const now = Date.now();

    const cached = this.chartCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    let data: ChartDataPoint[] = [];
    try {
      data = await this.primaryProvider.getChart(cleanSym, range, interval);
      if ((!data || data.length === 0) && (await this.fallbackProvider.isAvailable())) {
        data = await this.fallbackProvider.getChart(cleanSym, range);
      }
    } catch (err) {
      console.error(`Chart fetch error for ${cleanSym}:`, err);
    }

    if (data && data.length > 0) {
      this.chartCache.set(cacheKey, { data, expiresAt: now + this.CHART_TTL_MS });
    }

    return data;
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    const cleanSym = symbol.trim().toUpperCase();
    const now = Date.now();

    const cached = this.profileCache.get(cleanSym);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    let profile: CompanyProfile | null = null;
    try {
      profile = await this.primaryProvider.getCompanyProfile(cleanSym);
      if (!profile && (await this.fallbackProvider.isAvailable())) {
        profile = await this.fallbackProvider.getCompanyProfile(cleanSym);
      }
    } catch (err) {
      console.error(`Profile fetch error for ${cleanSym}:`, err);
    }

    if (profile) {
      this.profileCache.set(cleanSym, { data: profile, expiresAt: now + this.PROFILE_TTL_MS });
    }

    return profile;
  }
}

export const marketService = new MarketService();
