import { StockQuote } from '../types.js';

export interface MarketSource {
  name: string;
  fetchQuote(symbol: string): Promise<StockQuote | null>;
  fetchBatchQuotes?(symbols: string[]): Promise<Record<string, StockQuote>>;
}

/**
 * 1. Yahoo Finance Public Chart API (No API key needed)
 */
export class YahooChartSource implements MarketSource {
  name = 'Yahoo Finance (Direct Chart)';

  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const sym = symbol.toUpperCase().trim();
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m&includePrePost=true`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = Number(meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0);
      if (price <= 0) return null;

      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      return {
        symbol: sym,
        price: Number(price.toFixed(2)),
        change,
        changePercent,
        open: Number((meta.regularMarketOpen ?? price).toFixed(2)),
        previousClose: Number(prevClose.toFixed(2)),
        high: Number((meta.regularMarketDayHigh ?? price).toFixed(2)),
        low: Number((meta.regularMarketDayLow ?? price).toFixed(2)),
        volume: Number(meta.regularMarketVolume ?? 0),
        companyName: meta.shortName || meta.symbol || sym,
        exchange: meta.exchangeName || 'US',
        currency: meta.currency || 'USD',
        provider: this.name,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch {
      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};
    await Promise.all(
      symbols.map(async (s) => {
        const q = await this.fetchQuote(s);
        if (q) results[q.symbol] = q;
      })
    );
    return results;
  }
}

/**
 * 2. Stooq Public Quotes (Fast CSV format, highly accessible)
 */
export class StooqSource implements MarketSource {
  name = 'Stooq Global Financials';

  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const sym = symbol.toUpperCase().trim();
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(sym.toLowerCase())}.us&f=sd2t2ohlcv&h&e=csv`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;

      const parts = lines[1].split(',');
      if (parts.length >= 7) {
        const close = parseFloat(parts[6]);
        const open = parseFloat(parts[3]) || close;
        const high = parseFloat(parts[4]) || close;
        const low = parseFloat(parts[5]) || close;
        const vol = parseInt(parts[7], 10) || 0;

        if (!isNaN(close) && close > 0) {
          const change = Number((close - open).toFixed(2));
          const changePercent = open ? Number(((change / open) * 100).toFixed(2)) : 0;
          return {
            symbol: sym,
            price: Number(close.toFixed(2)),
            change,
            changePercent,
            open: Number(open.toFixed(2)),
            previousClose: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            volume: vol,
            companyName: sym,
            exchange: 'US',
            currency: 'USD',
            provider: this.name,
            timestamp: Date.now(),
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};
    await Promise.all(
      symbols.map(async (s) => {
        const q = await this.fetchQuote(s);
        if (q) results[q.symbol] = q;
      })
    );
    return results;
  }
}

/**
 * 3. AlphaVantage / Free Community Market Endpoints
 */
export class CommunityOpenSource implements MarketSource {
  name = 'Global Market Data Engine';

  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const sym = symbol.toUpperCase().trim();
      // Try free quotes proxy
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = Number(meta.regularMarketPrice ?? 0);
      if (price <= 0) return null;

      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      return {
        symbol: sym,
        price: Number(price.toFixed(2)),
        change,
        changePercent,
        open: Number((meta.regularMarketOpen ?? price).toFixed(2)),
        previousClose: Number(prevClose.toFixed(2)),
        high: Number((meta.regularMarketDayHigh ?? price).toFixed(2)),
        low: Number((meta.regularMarketDayLow ?? price).toFixed(2)),
        volume: Number(meta.regularMarketVolume ?? 0),
        companyName: meta.shortName || meta.symbol || sym,
        exchange: meta.exchangeName || 'US',
        currency: meta.currency || 'USD',
        provider: this.name,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch {
      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};
    await Promise.all(
      symbols.map(async (s) => {
        const q = await this.fetchQuote(s);
        if (q) results[q.symbol] = q;
      })
    );
    return results;
  }
}
