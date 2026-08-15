import { MarketProvider } from './MarketProvider.js';
import { StockQuote, ChartDataPoint, CompanyProfile } from '../types.js';

export class FinnhubProvider implements MarketProvider {
  readonly name = 'Finnhub';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FINNHUB_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    if (!this.apiKey) return null;
    try {
      const sym = symbol.toUpperCase().trim();
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data || data.c === 0 || data.c === null || data.c === undefined) return null;

      const price = Number(data.c.toFixed(2));
      const prevClose = Number((data.pc ?? price).toFixed(2));
      const change = Number((data.d ?? (price - prevClose)).toFixed(2));
      const changePercent = Number((data.dp ?? (prevClose ? (change / prevClose) * 100 : 0)).toFixed(2));

      return {
        symbol: sym,
        price,
        change,
        changePercent,
        open: Number((data.o ?? price).toFixed(2)),
        previousClose: prevClose,
        high: Number((data.h ?? price).toFixed(2)),
        low: Number((data.l ?? price).toFixed(2)),
        volume: 0,
        provider: this.name,
        timestamp: (data.t ? data.t * 1000 : Date.now()),
      };
    } catch {
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    if (!this.apiKey || !symbols.length) return {};
    const results: Record<string, StockQuote> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        const q = await this.getQuote(sym);
        if (q) results[q.symbol] = q;
      })
    );
    return results;
  }

  async getChart(symbol: string, range: string = '1mo'): Promise<ChartDataPoint[]> {
    // Finnhub candle endpoint
    if (!this.apiKey) return [];
    try {
      const sym = symbol.toUpperCase().trim();
      const now = Math.floor(Date.now() / 1000);
      let from = now - 30 * 24 * 3600;
      let resolution = 'D';

      if (range === '1D') {
        from = now - 24 * 3600;
        resolution = '5';
      } else if (range === '5D') {
        from = now - 5 * 24 * 3600;
        resolution = '15';
      } else if (range === '1Y') {
        from = now - 365 * 24 * 3600;
        resolution = 'W';
      }

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=${resolution}&from=${from}&to=${now}&token=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];
      const data: any = await res.json();
      if (data.s !== 'ok') return [];

      const points: ChartDataPoint[] = [];
      for (let i = 0; i < (data.t || []).length; i++) {
        const ts = data.t[i] * 1000;
        points.push({
          timestamp: ts,
          date: new Date(ts).toLocaleDateString(),
          open: Number(data.o[i].toFixed(2)),
          high: Number(data.h[i].toFixed(2)),
          low: Number(data.l[i].toFixed(2)),
          close: Number(data.c[i].toFixed(2)),
          volume: Number(data.v[i] || 0),
        });
      }
      return points;
    } catch {
      return [];
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    if (!this.apiKey) return null;
    try {
      const sym = symbol.toUpperCase().trim();
      const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data || !data.name) return null;

      return {
        symbol: sym,
        name: data.name,
        sector: data.finnhubIndustry,
        industry: data.finnhubIndustry,
        website: data.weburl,
        country: data.country,
        exchange: data.exchange,
        marketCap: data.marketCapitalization ? data.marketCapitalization * 1e6 : undefined,
      };
    } catch {
      return null;
    }
  }
}
