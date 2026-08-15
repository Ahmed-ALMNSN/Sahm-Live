import { MarketProvider } from './MarketProvider.js';
import { StockQuote, ChartDataPoint, CompanyProfile } from '../types.js';

export class YahooProvider implements MarketProvider {
  readonly name = 'Yahoo Finance';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=1d', {
        headers: this.headers,
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes[symbol.toUpperCase()] || null;
  }

  async getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    if (!symbols || symbols.length === 0) return {};
    const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    const results: Record<string, StockQuote> = {};

    // Batch in chunks of up to 50 symbols for reliable Yahoo response
    const chunkSize = 50;
    for (let i = 0; i < cleanSymbols.length; i += chunkSize) {
      const chunk = cleanSymbols.slice(i, i + chunkSize);
      const symbolQuery = chunk.join(',');

      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}`;
        const res = await fetch(url, {
          headers: this.headers,
          signal: AbortSignal.timeout(7000),
        });

        if (res.ok) {
          const data: any = await res.json();
          const quotesList = data?.quoteResponse?.result || [];
          for (const q of quotesList) {
            const sym = q.symbol.toUpperCase();
            const price = Number(q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? 0);
            const prevClose = Number(q.regularMarketPreviousClose ?? price);
            const change = Number(q.regularMarketChange ?? (price - prevClose));
            const changePercent = Number(q.regularMarketChangePercent ?? (prevClose ? (change / prevClose) * 100 : 0));

            results[sym] = {
              symbol: sym,
              price: Number(price.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              open: Number((q.regularMarketOpen ?? price).toFixed(2)),
              previousClose: Number(prevClose.toFixed(2)),
              high: Number((q.regularMarketDayHigh ?? price).toFixed(2)),
              low: Number((q.regularMarketDayLow ?? price).toFixed(2)),
              volume: Number(q.regularMarketVolume ?? 0),
              marketCap: q.marketCap,
              peRatio: q.trailingPE,
              fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: q.fiftyTwoWeekLow,
              companyName: q.shortName || q.longName || sym,
              exchange: q.fullExchangeName || q.exchange,
              currency: q.currency || 'USD',
              marketState: q.marketState || 'REGULAR',
              provider: this.name,
              timestamp: (q.regularMarketTime ? q.regularMarketTime * 1000 : Date.now()),
            };
          }
        }
      } catch (err) {
        console.warn(`YahooProvider v7 quote fetch failed for chunk ${symbolQuery}:`, err);
      }

      // If any symbols in chunk were missed (e.g. quote endpoint filtered or missed), fallback to chart endpoint per missed symbol
      const missed = chunk.filter(sym => !results[sym]);
      if (missed.length > 0) {
        await Promise.all(
          missed.map(async (sym) => {
            try {
              const quote = await this.getQuoteFromChart(sym);
              if (quote) {
                results[sym] = quote;
              }
            } catch {
              // Ignore single failure
            }
          })
        );
      }
    }

    return results;
  }

  private async getQuoteFromChart(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = Number(meta.regularMarketPrice ?? 0);
      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      return {
        symbol: symbol.toUpperCase(),
        price: Number(price.toFixed(2)),
        change,
        changePercent,
        open: Number((meta.regularMarketOpen ?? price).toFixed(2)),
        previousClose: Number(prevClose.toFixed(2)),
        high: Number((meta.regularMarketDayHigh ?? price).toFixed(2)),
        low: Number((meta.regularMarketDayLow ?? price).toFixed(2)),
        volume: Number(meta.regularMarketVolume ?? 0),
        companyName: meta.shortName || meta.symbol || symbol,
        exchange: meta.exchangeName,
        currency: meta.currency || 'USD',
        provider: this.name,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch {
      return null;
    }
  }

  async getChart(symbol: string, range: string = '1mo', interval: string = '1d'): Promise<ChartDataPoint[]> {
    try {
      // Map friendly ranges
      const rangeMap: Record<string, { r: string; i: string }> = {
        '1D': { r: '1d', i: '5m' },
        '5D': { r: '5d', i: '15m' },
        '1M': { r: '1mo', i: '1d' },
        '3M': { r: '3mo', i: '1d' },
        '6M': { r: '6mo', i: '1d' },
        '1Y': { r: '1y', i: '1wk' },
      };

      const selected = rangeMap[range.toUpperCase()] || { r: range, i: interval };
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${selected.r}&interval=${selected.i}`;
      
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];
      const data: any = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return [];

      const timestamps: number[] = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const closes = quotes.close || [];
      const volumes = quotes.volume || [];

      const dataPoints: ChartDataPoint[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c === null || c === undefined || isNaN(c)) continue;

        const ts = timestamps[i] * 1000;
        const d = new Date(ts);
        const dateStr = selected.r === '1d' || selected.r === '5d' 
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });

        dataPoints.push({
          timestamp: ts,
          date: dateStr,
          open: Number((opens[i] ?? c).toFixed(2)),
          high: Number((highs[i] ?? c).toFixed(2)),
          low: Number((lows[i] ?? c).toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: Number(volumes[i] ?? 0),
        });
      }

      // Calculate Technical Indicators: SMA 20 & SMA 50
      for (let i = 0; i < dataPoints.length; i++) {
        if (i >= 19) {
          const slice20 = dataPoints.slice(i - 19, i + 1);
          const sum20 = slice20.reduce((acc, p) => acc + p.close, 0);
          dataPoints[i].sma20 = Number((sum20 / 20).toFixed(2));
        }
        if (i >= 49) {
          const slice50 = dataPoints.slice(i - 49, i + 1);
          const sum50 = slice50.reduce((acc, p) => acc + p.close, 0);
          dataPoints[i].sma50 = Number((sum50 / 50).toFixed(2));
        }
      }

      return dataPoints;
    } catch (err) {
      console.error(`Yahoo chart fetch error for ${symbol}:`, err);
      return [];
    }
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,summaryProfile,price`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        // Fallback with quote
        const q = await this.getQuote(symbol);
        if (q) {
          return {
            symbol: q.symbol,
            name: q.companyName || q.symbol,
            exchange: q.exchange,
            marketCap: q.marketCap,
          };
        }
        return null;
      }

      const data: any = await res.json();
      const result = data?.quoteSummary?.result?.[0];
      const assetProfile = result?.assetProfile || {};
      const price = result?.price || {};

      return {
        symbol: symbol.toUpperCase(),
        name: price.shortName || price.longName || symbol,
        sector: assetProfile.sector || 'N/A',
        industry: assetProfile.industry || 'N/A',
        website: assetProfile.website,
        description: assetProfile.longBusinessSummary,
        country: assetProfile.country,
        exchange: price.exchangeName || price.exchange,
        marketCap: price.marketCap?.raw,
        employees: assetProfile.fullTimeEmployees,
        ceo: assetProfile.companyOfficers?.[0]?.name,
      };
    } catch {
      return null;
    }
  }
}
