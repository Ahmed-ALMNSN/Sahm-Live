import { FullStockAnalysisData, StockCatalyst, MultiTimeframeCharts, DetailedFinancials, DilutionAndShareData, BidAskData } from '../types/analysisTypes.js';
import { marketService } from './MarketService.js';

export class AnalysisService {
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  private cache = new Map<string, { data: FullStockAnalysisData; expiresAt: number }>();
  private readonly CACHE_TTL = 15000; // 15 seconds cache for comprehensive deep data

  async getFullAnalysisData(symbol: string): Promise<FullStockAnalysisData | null> {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return null;

    const cached = this.cache.get(sym);
    if (cached && cached.expiresAt > Date.now()) {
      // Re-overlay latest quote price if available
      const latestQuote = await marketService.getQuote(sym);
      if (latestQuote && latestQuote.price > 0) {
        cached.data.quote.price = latestQuote.price;
        cached.data.quote.change = latestQuote.change;
        cached.data.quote.changePercent = latestQuote.changePercent;
        cached.data.quote.volume = latestQuote.volume || cached.data.quote.volume;
        cached.data.quote.timestamp = latestQuote.timestamp || Date.now();
      }
      return cached.data;
    }

    try {
      // Fetch in parallel:
      // 1. Quote & Summary Modules
      // 2. Multi-timeframe charts (1D, 5D, 1M, 3M, 6M, 1Y)
      // 3. News & Catalysts
      const [quoteSummaryData, chart1D, chart5D, chart1M, chart3M, chart6M, chart1Y, newsData] = await Promise.all([
        this.fetchQuoteSummary(sym),
        this.fetchChartData(sym, '1d', '1m'),
        this.fetchChartData(sym, '5d', '5m'),
        this.fetchChartData(sym, '1mo', '1d'),
        this.fetchChartData(sym, '3mo', '1d'),
        this.fetchChartData(sym, '6mo', '1d'),
        this.fetchChartData(sym, '1y', '1wk'),
        this.fetchNewsAndCatalysts(sym),
      ]);

      const quote = await marketService.getQuote(sym);

      const qs = quoteSummaryData?.quoteSummary?.result?.[0] || {};
      const price = qs.price || {};
      const summaryDetail = qs.summaryDetail || {};
      const financialData = qs.financialData || {};
      const defaultKeyStatistics = qs.defaultKeyStatistics || {};
      const assetProfile = qs.assetProfile || {};

      // Current Price resolution
      const resolvedPrice = Number(
        quote?.price ?? 
        price.regularMarketPrice?.raw ?? 
        price.postMarketPrice?.raw ?? 
        price.preMarketPrice?.raw ?? 
        summaryDetail.previousClose?.raw ?? 
        0
      );

      const resolvedPrevClose = Number(
        summaryDetail.previousClose?.raw ?? 
        price.regularMarketPreviousClose?.raw ?? 
        quote?.previousClose ?? 
        resolvedPrice
      );

      const resolvedChange = Number((resolvedPrice - resolvedPrevClose).toFixed(4));
      const resolvedChangePercent = resolvedPrevClose > 0 
        ? Number(((resolvedChange / resolvedPrevClose) * 100).toFixed(2))
        : 0;

      // Bid / Ask
      const bid = Number(summaryDetail.bid?.raw ?? price.bid ?? 0);
      const ask = Number(summaryDetail.ask?.raw ?? price.ask ?? 0);
      const bidSize = Number(summaryDetail.bidSize?.raw ?? price.bidSize ?? 0);
      const askSize = Number(summaryDetail.askSize?.raw ?? price.askSize ?? 0);
      
      let spread = 0;
      let spreadPercent = 0;
      let spreadRating: BidAskData['spreadRating'] = 'ACCEPTABLE';

      if (ask > 0 && bid > 0 && ask >= bid) {
        spread = Number((ask - bid).toFixed(4));
        const mid = (ask + bid) / 2;
        spreadPercent = mid > 0 ? Number(((spread / mid) * 100).toFixed(3)) : 0;
        
        if (spreadPercent < 0.15) spreadRating = 'EXCELLENT';
        else if (spreadPercent < 0.4) spreadRating = 'GOOD';
        else if (spreadPercent < 1.0) spreadRating = 'ACCEPTABLE';
        else if (spreadPercent < 2.5) spreadRating = 'HIGH_RISK';
        else spreadRating = 'VERY_HIGH_RISK';
      }

      const bidAsk: BidAskData = {
        bid: bid > 0 ? bid : undefined,
        ask: ask > 0 ? ask : undefined,
        bidSize: bidSize > 0 ? bidSize : undefined,
        askSize: askSize > 0 ? askSize : undefined,
        spread: spread > 0 ? spread : undefined,
        spreadPercent: spreadPercent > 0 ? spreadPercent : undefined,
        spreadRating,
      };

      // Financials
      const financials: DetailedFinancials = {
        revenue: financialData.totalRevenue?.raw ?? undefined,
        revenueGrowth: financialData.revenueGrowth?.raw ? Number((financialData.revenueGrowth.raw * 100).toFixed(2)) : undefined,
        grossProfit: financialData.grossProfits?.raw ?? undefined,
        operatingIncome: financialData.operatingCashflow?.raw ?? undefined,
        netIncome: defaultKeyStatistics.netIncomeToCommon?.raw ?? undefined,
        eps: defaultKeyStatistics.trailingEps?.raw ?? financialData.currentPrice?.raw ?? undefined,
        epsGrowth: defaultKeyStatistics.earningsQuarterlyGrowth?.raw ? Number((defaultKeyStatistics.earningsQuarterlyGrowth.raw * 100).toFixed(2)) : undefined,
        operatingCashflow: financialData.operatingCashflow?.raw ?? undefined,
        freeCashflow: financialData.freeCashflow?.raw ?? undefined,
        totalCash: financialData.totalCash?.raw ?? undefined,
        totalDebt: financialData.totalDebt?.raw ?? undefined,
        debtToEquity: financialData.debtToEquity?.raw ? Number((financialData.debtToEquity.raw / 100).toFixed(2)) : undefined,
        currentRatio: financialData.currentRatio?.raw ? Number(financialData.currentRatio.raw.toFixed(2)) : undefined,
        quickRatio: financialData.quickRatio?.raw ? Number(financialData.quickRatio.raw.toFixed(2)) : undefined,
        grossMargins: financialData.grossMargins?.raw ? Number((financialData.grossMargins.raw * 100).toFixed(2)) : undefined,
        operatingMargins: financialData.operatingMargins?.raw ? Number((financialData.operatingMargins.raw * 100).toFixed(2)) : undefined,
        profitMargins: financialData.profitMargins?.raw ? Number((financialData.profitMargins.raw * 100).toFixed(2)) : undefined,
        returnOnEquity: financialData.returnOnEquity?.raw ? Number((financialData.returnOnEquity.raw * 100).toFixed(2)) : undefined,
        returnOnAssets: financialData.returnOnAssets?.raw ? Number((financialData.returnOnAssets.raw * 100).toFixed(2)) : undefined,
        ebitda: financialData.ebitda?.raw ?? undefined,
        enterpriseValue: defaultKeyStatistics.enterpriseValue?.raw ?? undefined,
        trailingPE: summaryDetail.trailingPE?.raw ? Number(summaryDetail.trailingPE.raw.toFixed(2)) : undefined,
        forwardPE: summaryDetail.forwardPE?.raw ? Number(summaryDetail.forwardPE.raw.toFixed(2)) : undefined,
        priceToBook: defaultKeyStatistics.priceToBook?.raw ? Number(defaultKeyStatistics.priceToBook.raw.toFixed(2)) : undefined,
        bookValue: defaultKeyStatistics.bookValue?.raw ? Number(defaultKeyStatistics.bookValue.raw.toFixed(2)) : undefined,
        financialCurrency: financialData.financialCurrency || 'USD',
      };

      // Dilution & Share Structure
      const sharesOutstanding = defaultKeyStatistics.sharesOutstanding?.raw ?? price.sharesOutstanding?.raw;
      const floatShares = defaultKeyStatistics.floatShares?.raw;
      const floatPercent = (sharesOutstanding && floatShares) ? Number(((floatShares / sharesOutstanding) * 100).toFixed(2)) : undefined;
      const sharesShort = defaultKeyStatistics.sharesShort?.raw;
      const shortRatio = defaultKeyStatistics.shortRatio?.raw ? Number(defaultKeyStatistics.shortRatio.raw.toFixed(2)) : undefined;
      const shortPercentOfFloat = defaultKeyStatistics.shortPercentOfFloat?.raw ? Number((defaultKeyStatistics.shortPercentOfFloat.raw * 100).toFixed(2)) : undefined;
      const lastSplitFactor = defaultKeyStatistics.lastSplitFactor?.raw || defaultKeyStatistics.lastSplitFactor;
      const lastSplitDate = defaultKeyStatistics.lastSplitDate?.raw ? defaultKeyStatistics.lastSplitDate.raw * 1000 : undefined;

      // Dilution & Reverse Split Risk Evaluation
      let dilutionRiskLevel: DilutionAndShareData['dilutionRiskLevel'] = 'LOW';
      let reverseSplitRiskScore = 15;

      if (resolvedPrice < 1.0) {
        reverseSplitRiskScore += 45; // Under $1 Nasdaq compliance risk
      } else if (resolvedPrice < 2.5) {
        reverseSplitRiskScore += 25;
      }

      if (lastSplitFactor && (lastSplitFactor.includes('1:') || lastSplitFactor.includes('1/'))) {
        reverseSplitRiskScore += 30; // History of reverse splits
      }

      if (financials.freeCashflow !== undefined && financials.freeCashflow < 0) {
        if (financials.totalCash !== undefined && financials.totalCash < Math.abs(financials.freeCashflow)) {
          dilutionRiskLevel = 'HIGH'; // Cash burn exceeds cash reserves -> high offering probability
        } else {
          dilutionRiskLevel = 'MEDIUM';
        }
      }

      if (resolvedPrice < 1.5 && floatShares && floatShares < 5000000) {
        if (dilutionRiskLevel === 'HIGH') dilutionRiskLevel = 'CRITICAL';
        else dilutionRiskLevel = 'HIGH';
      }

      const shareStructure: DilutionAndShareData = {
        sharesOutstanding,
        impliedSharesOutstanding: defaultKeyStatistics.impliedSharesOutstanding?.raw,
        floatShares,
        floatPercent,
        sharesShort,
        shortRatio,
        shortPercentOfFloat,
        heldPercentInsiders: defaultKeyStatistics.heldPercentInsiders?.raw ? Number((defaultKeyStatistics.heldPercentInsiders.raw * 100).toFixed(2)) : undefined,
        heldPercentInstitutions: defaultKeyStatistics.heldPercentInstitutions?.raw ? Number((defaultKeyStatistics.heldPercentInstitutions.raw * 100).toFixed(2)) : undefined,
        lastSplitFactor: typeof lastSplitFactor === 'string' ? lastSplitFactor : undefined,
        lastSplitDate,
        recentOfferingsIdentified: dilutionRiskLevel === 'HIGH' || dilutionRiskLevel === 'CRITICAL',
        dilutionRiskLevel,
        reverseSplitRiskScore: Math.min(100, Math.max(0, reverseSplitRiskScore)),
      };

      // Charts bundle
      const charts: MultiTimeframeCharts = {
        '1D': chart1D,
        '5D': chart5D,
        '1M': chart1M,
        '3M': chart3M,
        '6M': chart6M,
        '1Y': chart1Y,
      };

      const resultData: FullStockAnalysisData = {
        symbol: sym,
        companyName: price.shortName || price.longName || quote?.companyName || sym,
        exchange: price.exchangeName || price.exchange || quote?.exchange || 'US',
        sector: assetProfile.sector || 'General',
        industry: assetProfile.industry || 'General Market',
        description: assetProfile.longBusinessSummary,
        currency: price.currency || quote?.currency || 'USD',
        
        quote: {
          price: resolvedPrice,
          change: resolvedChange,
          changePercent: resolvedChangePercent,
          open: Number(summaryDetail.open?.raw ?? price.regularMarketOpen?.raw ?? quote?.open ?? resolvedPrice),
          previousClose: resolvedPrevClose,
          high: Number(summaryDetail.dayHigh?.raw ?? price.regularMarketDayHigh?.raw ?? quote?.high ?? resolvedPrice),
          low: Number(summaryDetail.dayLow?.raw ?? price.regularMarketDayLow?.raw ?? quote?.low ?? resolvedPrice),
          volume: Number(summaryDetail.volume?.raw ?? price.regularMarketVolume?.raw ?? quote?.volume ?? 0),
          avgVolume20D: summaryDetail.averageVolume?.raw ?? summaryDetail.averageDailyVolume10Day?.raw,
          avgVolume3M: summaryDetail.averageVolume10days?.raw ?? summaryDetail.averageVolume?.raw,
          marketCap: summaryDetail.marketCap?.raw ?? price.marketCap?.raw ?? quote?.marketCap,
          fiftyTwoWeekHigh: Number(summaryDetail.fiftyTwoWeekHigh?.raw ?? quote?.fiftyTwoWeekHigh ?? resolvedPrice),
          fiftyTwoWeekLow: Number(summaryDetail.fiftyTwoWeekLow?.raw ?? quote?.fiftyTwoWeekLow ?? resolvedPrice),
          preMarketPrice: price.preMarketPrice?.raw,
          postMarketPrice: price.postMarketPrice?.raw,
          marketState: price.marketState || quote?.marketState || 'REGULAR',
          timestamp: (price.regularMarketTime?.raw ? price.regularMarketTime.raw * 1000 : quote?.timestamp) || Date.now(),
        },

        bidAsk,
        financials,
        shareStructure,
        catalysts: newsData,
        charts,

        targetPrice: {
          current: resolvedPrice,
          targetHigh: financialData.targetHighPrice?.raw,
          targetLow: financialData.targetLowPrice?.raw,
          targetMean: financialData.targetMeanPrice?.raw,
          targetMedian: financialData.targetMedianPrice?.raw,
          recommendationKey: financialData.recommendationKey,
          numberOfAnalystOpinions: financialData.numberOfAnalystOpinions?.raw,
        },

        timestamps: {
          quoteTime: quote?.timestamp || Date.now(),
          financialPeriod: defaultKeyStatistics.lastFiscalYearEnd?.fmt || 'Latest TTM / Quarterly',
          newsUpdated: newsData.length > 0 ? newsData[0].publishedAt : Date.now(),
          analyzedAt: Date.now(),
        },
      };

      this.cache.set(sym, { data: resultData, expiresAt: Date.now() + this.CACHE_TTL });
      return resultData;
    } catch (err) {
      console.error(`Error in getFullAnalysisData for ${sym}:`, err);
      return null;
    }
  }

  private async fetchQuoteSummary(symbol: string): Promise<any> {
    try {
      const modules = [
        'price',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'assetProfile',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory',
        'earnings',
      ].join(',');

      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async fetchChartData(symbol: string, range: string, interval: string): Promise<any[]> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(6000),
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

      const points: any[] = [];
      let cumVol = 0;
      let cumVolPrice = 0;

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c === null || c === undefined || isNaN(c)) continue;
        const o = opens[i] ?? c;
        const h = highs[i] ?? c;
        const l = lows[i] ?? c;
        const v = volumes[i] ?? 0;

        const ts = timestamps[i] * 1000;
        const typical = (h + l + c) / 3;
        cumVol += v;
        cumVolPrice += typical * v;
        const vwap = cumVol > 0 ? Number((cumVolPrice / cumVol).toFixed(4)) : Number(c.toFixed(4));

        const d = new Date(ts);
        const dateStr = (range === '1d' || range === '5d')
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        points.push({
          timestamp: ts,
          date: dateStr,
          open: Number(o.toFixed(4)),
          high: Number(h.toFixed(4)),
          low: Number(l.toFixed(4)),
          close: Number(c.toFixed(4)),
          volume: Number(v),
          vwap,
        });
      }

      return points;
    } catch {
      return [];
    }
  }

  private async fetchNewsAndCatalysts(symbol: string): Promise<StockCatalyst[]> {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1&newsCount=8`;
      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data: any = await res.json();
      const newsItems: any[] = data.news || [];

      return newsItems.map((item) => {
        const title = item.title || 'Market Update';
        const snippet = item.summary || item.title || '';
        const fullText = (title + ' ' + snippet).toLowerCase();

        let sentiment: StockCatalyst['sentiment'] = 'NEUTRAL';
        let impactCategory = 'General News';

        if (/earnings|beat|record revenue|profit surge|dividend increase|guidance raise|buyback/.test(fullText)) {
          sentiment = 'POSITIVE';
          impactCategory = 'Earnings & Growth';
        } else if (/fda approval|patent granted|contract win|partnership|acquisition|merger|upgrade/.test(fullText)) {
          sentiment = 'POSITIVE';
          impactCategory = 'Corporate Catalyst';
        } else if (/offering|dilution|shelf|downgrade|loss|missed|lawsuit|sec investigation|subpoena|delisting|reverse split/.test(fullText)) {
          sentiment = 'NEGATIVE';
          impactCategory = 'Risk / Offering Catalyst';
        }

        return {
          title,
          source: item.publisher || 'Financial Wire',
          publishedAt: item.providerPublishTime ? item.providerPublishTime * 1000 : Date.now(),
          snippet,
          url: item.link,
          sentiment,
          impactCategory,
        };
      });
    } catch {
      return [];
    }
  }
}

export const analysisService = new AnalysisService();
