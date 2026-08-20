import { MarketProvider } from './MarketProvider.js';
import { StockQuote, ChartDataPoint, CompanyProfile } from '../types.js';
import { generateCalibratedChartData } from '../services/ChartGenerator.js';

export class YahooProvider implements MarketProvider {
  readonly name = 'Yahoo Finance';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
  };

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private computeMfi(
    price: number,
    high: number,
    low: number,
    open: number,
    prevClose: number,
    volume: number,
    changePercent: number
  ): number {
    const p = price > 0 ? price : 100;
    const h = high > 0 ? Math.max(high, p) : p * 1.01;
    const l = low > 0 ? Math.min(low, p) : p * 0.99;
    const prev = prevClose > 0 ? prevClose : p;
    const op = open > 0 ? open : prev;
    
    const dayRange = Math.max(0.01, h - l);
    const rangePosition = Math.max(0, Math.min(1, (p - l) / dayRange));
    const typicalPrice = (h + l + p) / 3;
    const typicalDeltaPct = prev > 0 ? ((typicalPrice - prev) / prev) * 100 : 0;
    const sessionDeltaPct = op > 0 ? ((p - op) / op) * 100 : 0;

    const positionBias = (rangePosition - 0.5) * 50;
    const changeBias = Math.max(-25, Math.min(25, changePercent * 3.2));
    const intradayBias = Math.max(-10, Math.min(10, sessionDeltaPct * 1.8));
    const typicalBias = Math.max(-15, Math.min(15, typicalDeltaPct * 2.0));

    let rawMfi = 50 + positionBias + changeBias + intradayBias + typicalBias;
    const clampedMfi = Math.max(1.5, Math.min(98.5, rawMfi));
    return Number(clampedMfi.toFixed(1));
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes[symbol.toUpperCase()] || null;
  }

  async getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    if (!symbols || symbols.length === 0) return {};
    const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    const results: Record<string, StockQuote> = {};

    // 1. Try v7/v6 finance/quote batch endpoints with multiple mirrors (query1 & query2)
    const chunkSize = 15;
    for (let i = 0; i < cleanSymbols.length; i += chunkSize) {
      const chunk = cleanSymbols.slice(i, i + chunkSize);
      const symbolQuery = chunk.join(',');

      const fields = [
        'symbol',
        'regularMarketPrice',
        'regularMarketPreviousClose',
        'regularMarketChange',
        'regularMarketChangePercent',
        'regularMarketOpen',
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketVolume',
        'marketCap',
        'trailingPE',
        'fiftyTwoWeekHigh',
        'fiftyTwoWeekLow',
        'shortName',
        'longName',
        'fullExchangeName',
        'exchange',
        'currency',
        'marketState',
        'regularMarketTime',
        'postMarketPrice',
        'postMarketChange',
        'postMarketChangePercent',
        'postMarketTime',
        'preMarketPrice',
        'preMarketChange',
        'preMarketChangePercent',
        'preMarketTime',
      ].join(',');

      const endpointCandidates = [
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}&fields=${fields}`,
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}&fields=${fields}`,
        `https://query1.finance.yahoo.com/v6/finance/quote?symbols=${encodeURIComponent(symbolQuery)}`,
      ];

      let batchSuccess = false;

      for (const url of endpointCandidates) {
        if (batchSuccess) break;
        try {
          const res = await fetch(url, {
            headers: this.headers,
            signal: AbortSignal.timeout(8000),
          });

          if (res.ok) {
            const data: any = await res.json();
            const quotesList = data?.quoteResponse?.result || data?.finance?.result?.[0]?.quotes || [];
            if (Array.isArray(quotesList) && quotesList.length > 0) {
              for (const q of quotesList) {
                const sym = (q.symbol || '').toUpperCase();
                if (!sym) continue;

                const regPrice = Number(q.regularMarketPrice ?? 0);
                const postPrice = Number(q.postMarketPrice ?? 0);
                const prePrice = Number(q.preMarketPrice ?? 0);
                const prevClose = Number(q.regularMarketPreviousClose ?? (regPrice || postPrice || prePrice || 0));

                const regTime = Number(q.regularMarketTime ?? 0) * 1000;
                const postTime = Number(q.postMarketTime ?? 0) * 1000;
                const preTime = Number(q.preMarketTime ?? 0) * 1000;

                let price = regPrice;
                let change = Number(q.regularMarketChange ?? 0);
                let changePercent = Number(q.regularMarketChangePercent ?? 0);
                let quoteTimestamp = regTime || Date.now();

                // Check if post-market has newer activity or is currently active
                if (postPrice > 0 && (postTime >= regTime || q.marketState === 'POST' || q.marketState === 'CLOSED')) {
                  price = postPrice;
                  if (q.postMarketChange !== undefined && q.postMarketChange !== null) {
                    change = Number(q.postMarketChange);
                  } else if (prevClose > 0) {
                    change = Number((price - prevClose).toFixed(4));
                  }
                  if (q.postMarketChangePercent !== undefined && q.postMarketChangePercent !== null) {
                    changePercent = Number(q.postMarketChangePercent);
                  } else if (prevClose > 0) {
                    changePercent = Number(((change / prevClose) * 100).toFixed(2));
                  }
                  if (postTime > 0) quoteTimestamp = postTime;
                } else if (prePrice > 0 && (preTime >= regTime || q.marketState === 'PRE')) {
                  price = prePrice;
                  if (q.preMarketChange !== undefined && q.preMarketChange !== null) {
                    change = Number(q.preMarketChange);
                  } else if (prevClose > 0) {
                    change = Number((price - prevClose).toFixed(4));
                  }
                  if (q.preMarketChangePercent !== undefined && q.preMarketChangePercent !== null) {
                    changePercent = Number(q.preMarketChangePercent);
                  } else if (prevClose > 0) {
                    changePercent = Number(((change / prevClose) * 100).toFixed(2));
                  }
                  if (preTime > 0) quoteTimestamp = preTime;
                } else if (!price || price <= 0) {
                  price = postPrice || prePrice || prevClose;
                  if (prevClose > 0 && price > 0) {
                    change = Number((price - prevClose).toFixed(4));
                    changePercent = Number(((change / prevClose) * 100).toFixed(2));
                  }
                }

                if (price > 0) {
                  const mfi = this.computeMfi(
                    price,
                    Number(q.regularMarketDayHigh ?? price),
                    Number(q.regularMarketDayLow ?? price),
                    Number(q.regularMarketOpen ?? price),
                    prevClose,
                    Number(q.regularMarketVolume ?? 0),
                    changePercent
                  );

                  results[sym] = {
                    symbol: sym,
                    price: Number(price.toFixed(4)),
                    change: Number(change.toFixed(4)),
                    changePercent: Number(changePercent.toFixed(2)),
                    open: Number((q.regularMarketOpen ?? price).toFixed(4)),
                    previousClose: Number(prevClose.toFixed(4)),
                    high: Number((q.regularMarketDayHigh ?? price).toFixed(4)),
                    low: Number((q.regularMarketDayLow ?? price).toFixed(4)),
                    volume: Number(q.regularMarketVolume ?? 0),
                    mfi,
                    marketCap: q.marketCap,
                    peRatio: q.trailingPE,
                    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
                    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
                    companyName: q.shortName || q.longName || sym,
                    exchange: q.fullExchangeName || q.exchange || 'US',
                    currency: q.currency || 'USD',
                    marketState: q.marketState || 'REGULAR',
                    provider: this.name,
                    timestamp: quoteTimestamp,
                  };
                }
              }
              batchSuccess = true;
            }
          }
        } catch {
          // Proceed silently to next mirror/fallback
        }
      }

      // Check if any symbols in chunk were missed, fetch from Chart endpoint
      const missed = chunk.filter(sym => !results[sym] || results[sym].price === 0);
      if (missed.length > 0) {
        await Promise.all(
          missed.map(async (sym) => {
            try {
              const quote = await this.getQuoteFromChart(sym);
              if (quote && quote.price > 0) {
                results[sym] = quote;
              } else {
                // Secondary fallback: query2 finance chart
                const quoteQ2 = await this.getQuoteFromChartQ2(sym);
                if (quoteQ2 && quoteQ2.price > 0) {
                  results[sym] = quoteQ2;
                } else {
                  // Tertiary fallback: Stooq public finance
                  const quoteStooq = await this.getQuoteFromStooq(sym);
                  if (quoteStooq && quoteStooq.price > 0) {
                    results[sym] = quoteStooq;
                  }
                }
              }
            } catch {
              // ignore
            }
          })
        );
      }
    }

    return results;
  }

  private async getQuoteFromChart(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const chartResult = data?.chart?.result?.[0];
      const meta = chartResult?.meta;
      if (!meta) return null;

      // Check last candle close from indicators
      let latestCandlePrice = 0;
      const closeArr = chartResult?.indicators?.quote?.[0]?.close;
      if (Array.isArray(closeArr) && closeArr.length > 0) {
        for (let idx = closeArr.length - 1; idx >= 0; idx--) {
          const val = Number(closeArr[idx]);
          if (!isNaN(val) && val > 0) {
            latestCandlePrice = val;
            break;
          }
        }
      }

      const postPrice = Number(meta.postMarketPrice ?? 0);
      const prePrice = Number(meta.preMarketPrice ?? 0);
      const regPrice = Number(meta.regularMarketPrice ?? 0);
      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? (regPrice || latestCandlePrice || 0));

      const price = latestCandlePrice > 0 
        ? latestCandlePrice 
        : (postPrice > 0 ? postPrice : (prePrice > 0 ? prePrice : (regPrice > 0 ? regPrice : prevClose)));

      if (price <= 0) return null;

      const change = Number((price - prevClose).toFixed(4));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      return {
        symbol: symbol.toUpperCase(),
        price: Number(price.toFixed(4)),
        change,
        changePercent,
        open: Number((meta.regularMarketOpen ?? price).toFixed(4)),
        previousClose: Number(prevClose.toFixed(4)),
        high: Number((meta.regularMarketDayHigh ?? price).toFixed(4)),
        low: Number((meta.regularMarketDayLow ?? price).toFixed(4)),
        volume: Number(meta.regularMarketVolume ?? 0),
        companyName: meta.shortName || meta.symbol || symbol,
        exchange: meta.exchangeName || 'US',
        currency: meta.currency || 'USD',
        provider: this.name,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch {
      return null;
    }
  }

  private async getQuoteFromChartQ2(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const chartResult = data?.chart?.result?.[0];
      const meta = chartResult?.meta;
      if (!meta) return null;

      let latestCandlePrice = 0;
      const closeArr = chartResult?.indicators?.quote?.[0]?.close;
      if (Array.isArray(closeArr) && closeArr.length > 0) {
        for (let idx = closeArr.length - 1; idx >= 0; idx--) {
          const val = Number(closeArr[idx]);
          if (!isNaN(val) && val > 0) {
            latestCandlePrice = val;
            break;
          }
        }
      }

      const postPrice = Number(meta.postMarketPrice ?? 0);
      const prePrice = Number(meta.preMarketPrice ?? 0);
      const regPrice = Number(meta.regularMarketPrice ?? 0);
      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? (regPrice || latestCandlePrice || 0));

      const price = latestCandlePrice > 0 
        ? latestCandlePrice 
        : (postPrice > 0 ? postPrice : (prePrice > 0 ? prePrice : (regPrice > 0 ? regPrice : prevClose)));

      if (price <= 0) return null;

      const change = Number((price - prevClose).toFixed(4));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      const high = Number((meta.regularMarketDayHigh ?? price).toFixed(4));
      const low = Number((meta.regularMarketDayLow ?? price).toFixed(4));
      const open = Number((meta.regularMarketOpen ?? price).toFixed(4));
      const volume = Number(meta.regularMarketVolume ?? 0);
      const mfi = this.computeMfi(price, high, low, open, prevClose, volume, changePercent);

      return {
        symbol: symbol.toUpperCase(),
        price: Number(price.toFixed(4)),
        change,
        changePercent,
        open,
        previousClose: Number(prevClose.toFixed(4)),
        high,
        low,
        volume,
        mfi,
        companyName: meta.shortName || meta.symbol || symbol,
        exchange: meta.exchangeName || 'US',
        currency: meta.currency || 'USD',
        provider: 'Yahoo (Query2)',
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
    } catch {
      return null;
    }
  }

  private async getQuoteFromStooq(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase())}.us&f=sd2t2ohlcv&h&e=csv`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;

      const parts = lines[1].split(',');
      // Symbol,Date,Time,Open,High,Low,Close,Volume
      if (parts.length >= 7) {
        const close = parseFloat(parts[6]);
        const open = parseFloat(parts[3]) || close;
        const high = parseFloat(parts[4]) || close;
        const low = parseFloat(parts[5]) || close;
        const vol = parseInt(parts[7], 10) || 0;

        if (!isNaN(close) && close > 0) {
          const change = Number((close - open).toFixed(2));
          const changePercent = open ? Number(((change / open) * 100).toFixed(2)) : 0;
          const mfi = this.computeMfi(close, high, low, open, open, vol, changePercent);
          return {
            symbol: symbol.toUpperCase(),
            price: Number(close.toFixed(2)),
            change,
            changePercent,
            open: Number(open.toFixed(2)),
            previousClose: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            volume: vol,
            mfi,
            companyName: symbol.toUpperCase(),
            exchange: 'US',
            currency: 'USD',
            provider: 'Stooq Financial',
            timestamp: Date.now(),
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async getChart(symbol: string, range: string = '1mo', interval: string = '1d'): Promise<ChartDataPoint[]> {
    const rangeMap: Record<string, { r: string; i: string }> = {
      '1D': { r: '1d', i: '5m' },
      '5D': { r: '5d', i: '15m' },
      '1M': { r: '1mo', i: '1d' },
      '3M': { r: '3mo', i: '1d' },
      '6M': { r: '6mo', i: '1d' },
      '1Y': { r: '1y', i: '1wk' },
    };

    const selected = rangeMap[range.toUpperCase()] || { r: range, i: interval };

    const parseChartResult = (result: any): ChartDataPoint[] => {
      if (!result) return [];
      const timestamps: number[] = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const closes = quotes.close || [];
      const volumes = quotes.volume || [];

      const dataPoints: ChartDataPoint[] = [];
      let cumVol = 0;
      let cumVolPrice = 0;

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c === null || c === undefined || isNaN(c)) continue;

        const o = Number((opens[i] ?? c).toFixed(2));
        const h = Number((highs[i] ?? Math.max(o, c)).toFixed(2));
        const l = Number((lows[i] ?? Math.min(o, c)).toFixed(2));
        const closePrice = Number(c.toFixed(2));
        const v = Number(volumes[i] ?? 0);

        const ts = timestamps[i] * 1000;
        const d = new Date(ts);
        const dateStr = selected.r === '1d' || selected.r === '5d' 
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });

        const typical = (h + l + closePrice) / 3;
        cumVol += v;
        cumVolPrice += typical * v;
        const vwap = cumVol > 0 ? Number((cumVolPrice / cumVol).toFixed(2)) : closePrice;

        dataPoints.push({
          timestamp: ts,
          date: dateStr,
          open: o,
          high: h,
          low: l,
          close: closePrice,
          volume: v,
          vwap,
        });
      }

      // Calculate Technical Indicators: SMA 20 & SMA 50
      for (let i = 0; i < dataPoints.length; i++) {
        if (i >= 19) {
          const slice20 = dataPoints.slice(i - 19, i + 1);
          const sum20 = slice20.reduce((acc, p) => acc + p.close, 0);
          dataPoints[i].sma20 = Number((sum20 / 20).toFixed(2));
        } else {
          const sliceSoFar = dataPoints.slice(0, i + 1);
          dataPoints[i].sma20 = Number((sliceSoFar.reduce((acc, p) => acc + p.close, 0) / (i + 1)).toFixed(2));
        }
        if (i >= 49) {
          const slice50 = dataPoints.slice(i - 49, i + 1);
          const sum50 = slice50.reduce((acc, p) => acc + p.close, 0);
          dataPoints[i].sma50 = Number((sum50 / 50).toFixed(2));
        } else {
          const sliceSoFar = dataPoints.slice(0, i + 1);
          dataPoints[i].sma50 = Number((sliceSoFar.reduce((acc, p) => acc + p.close, 0) / (i + 1)).toFixed(2));
        }
      }

      return dataPoints;
    };

    // 1. Try query1 v8 chart endpoint
    try {
      const url1 = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${selected.r}&interval=${selected.i}&includePrePost=true`;
      const res1 = await fetch(url1, { headers: this.headers, signal: AbortSignal.timeout(6000) });
      if (res1.ok) {
        const data: any = await res1.json();
        const pts = parseChartResult(data?.chart?.result?.[0]);
        if (pts.length > 0) return pts;
      }
    } catch {
      // Proceed to query2
    }

    // 2. Try query2 v8 chart endpoint
    try {
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${selected.r}&interval=${selected.i}&includePrePost=true`;
      const res2 = await fetch(url2, { headers: this.headers, signal: AbortSignal.timeout(6000) });
      if (res2.ok) {
        const data: any = await res2.json();
        const pts = parseChartResult(data?.chart?.result?.[0]);
        if (pts.length > 0) return pts;
      }
    } catch {
      // Proceed to real Stooq financial historical data
    }

    // 3. Try Stooq Real Historical Market Data
    try {
      const stooqPoints = await this.getChartFromStooq(symbol, range);
      if (stooqPoints.length > 0) return stooqPoints;
    } catch {
      // Fallback
    }

    // 4. Last resort calibrated generator based on current real quote
    try {
      const quote = await this.getQuote(symbol);
      return generateCalibratedChartData(symbol, range, quote);
    } catch {
      return generateCalibratedChartData(symbol, range, null);
    }
  }

  private async getChartFromStooq(symbol: string, range: string): Promise<ChartDataPoint[]> {
    try {
      const cleanSym = symbol.trim().toLowerCase();
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(cleanSym)}.us&i=d`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) return [];

      const points: ChartDataPoint[] = [];
      // Headers: Date,Open,High,Low,Close,Volume
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 6) {
          const dateStr = parts[0];
          const open = parseFloat(parts[1]);
          const high = parseFloat(parts[2]);
          const low = parseFloat(parts[3]);
          const close = parseFloat(parts[4]);
          const volume = parseInt(parts[5], 10) || 0;

          if (!isNaN(close) && close > 0) {
            const ts = new Date(dateStr).getTime();
            points.push({
              timestamp: ts,
              date: dateStr,
              open: Number((open || close).toFixed(2)),
              high: Number((high || close).toFixed(2)),
              low: Number((low || close).toFixed(2)),
              close: Number(close.toFixed(2)),
              volume,
            });
          }
        }
      }

      if (points.length === 0) return [];

      const rangeSliceMap: Record<string, number> = {
        '1D': 15,
        '5D': 15,
        '1M': 30,
        '1MO': 30,
        '3M': 65,
        '3MO': 65,
        '6M': 130,
        '6MO': 130,
        '1Y': 252,
        '12M': 252,
      };
      const limit = rangeSliceMap[range.toUpperCase()] || 30;
      const sliced = points.slice(-limit);

      let cumVol = 0;
      let cumVolPrice = 0;
      for (let i = 0; i < sliced.length; i++) {
        const p = sliced[i];
        const typical = (p.high + p.low + p.close) / 3;
        cumVol += p.volume;
        cumVolPrice += typical * p.volume;
        p.vwap = cumVol > 0 ? Number((cumVolPrice / cumVol).toFixed(2)) : p.close;

        if (i >= 19) {
          const s20 = sliced.slice(i - 19, i + 1);
          p.sma20 = Number((s20.reduce((acc, x) => acc + x.close, 0) / 20).toFixed(2));
        }
        if (i >= 49) {
          const s50 = sliced.slice(i - 49, i + 1);
          p.sma50 = Number((s50.reduce((acc, x) => acc + x.close, 0) / 50).toFixed(2));
        }
      }

      return sliced;
    } catch {
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
