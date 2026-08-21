import {
  StockQuote,
  BrokeragePlatform,
  TradeCalculationInput,
  TradeCalculationResult,
  PortfolioPosition,
  TradeRecord,
  UserSettings,
  ImportJobRecord,
  AuditLogRecord,
} from '../types.js';
import { MacroeconomicData, StockMacroImpact } from '../types/macroTypes.js';

export interface BatchQuotesResponse {
  quotes: StockQuote[];
  count?: number;
  requestedCount?: number;
}

export class ApiService {
  private currentAbortController: AbortController | null = null;

  async fetchHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch('/api/health');
    return await res.json();
  }

  // --- REAL-TIME MARKET QUOTES ---

  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`fetchQuote failed for ${symbol}:`, err);
      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    if (!symbols || symbols.length === 0) return {};

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const cleanSymbols = Array.from(
      new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
    );

    const results: Record<string, StockQuote> = {};
    const chunkSize = 100;

    for (let i = 0; i < cleanSymbols.length; i += chunkSize) {
      if (signal.aborted) return results;
      const chunk = cleanSymbols.slice(i, i + chunkSize);

      try {
        const res = await fetch('/api/quotes/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: chunk }),
          signal,
        });

        if (res.ok) {
          const data: BatchQuotesResponse = await res.json();
          if (Array.isArray(data.quotes)) {
            for (const q of data.quotes) {
              if (q && q.symbol) {
                results[q.symbol.toUpperCase()] = q;
              }
            }
          }
        }
      } catch (err: any) {
        if (
          signal.aborted ||
          err?.name === 'AbortError' ||
          err?.message?.includes('aborted') ||
          err?.message?.includes('The user aborted a request')
        ) {
          return results;
        }
        console.warn('Batch quote fetch transient warning:', err?.message || err);
      }
    }

    return results;
  }

  async fetchChart(symbol: string, range: string = '1M', interval?: string) {
    try {
      const query = new URLSearchParams({ range });
      if (interval) query.append('interval', interval);
      const res = await fetch(`/api/chart/${encodeURIComponent(symbol)}?${query.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.error(`fetchChart error for ${symbol}:`, err);
      return [];
    }
  }

  async fetchProfile(symbol: string) {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`fetchProfile error for ${symbol}:`, err);
      return null;
    }
  }

  async fetchFullAnalysis(symbol: string) {
    try {
      const res = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error(`fetchFullAnalysis error for ${symbol}:`, err);
      return null;
    }
  }

  // --- MACROECONOMIC DATA & US MONETARY POLICY ---

  async fetchMacroData(): Promise<MacroeconomicData | null> {
    try {
      const res = await fetch('/api/macro');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error('fetchMacroData error:', err);
      return null;
    }
  }

  async fetchStockMacroImpact(symbol: string, sector: string = 'General'): Promise<{ macro: MacroeconomicData; impact: StockMacroImpact } | null> {
    try {
      const res = await fetch(`/api/macro/stock/${encodeURIComponent(symbol)}?sector=${encodeURIComponent(sector)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error(`fetchStockMacroImpact error for ${symbol}:`, err);
      return null;
    }
  }

  // --- WATCHLIST & STOCKS (DB IS SINGLE SOURCE OF TRUTH) ---

  async fetchWatchlist(): Promise<any[]> {
    try {
      const res = await fetch('/api/watchlist');
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || data.stocks || [];
    } catch (err) {
      console.error('fetchWatchlist error:', err);
      return [];
    }
  }

  async saveWatchlistItem(item: {
    symbol: string;
    companyName?: string;
    sector?: string;
    exchange?: string;
    industry?: string;
    upperAlert?: number | null;
    lowerAlert?: number | null;
    alertsEnabled?: boolean;
    buyPrice?: number | null;
    shares?: number | null;
    brokerId?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      return res.ok;
    } catch (err) {
      console.error('saveWatchlistItem error:', err);
      return false;
    }
  }

  async deleteWatchlistItem(symbol: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error(`deleteWatchlistItem error for ${symbol}:`, err);
      return false;
    }
  }

  async clearWatchlist(): Promise<boolean> {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('clearWatchlist error:', err);
      return false;
    }
  }

  async clearAllAlerts(): Promise<boolean> {
    try {
      const res = await fetch('/api/watchlist/clear-alerts', {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.error('clearAllAlerts error:', err);
      return false;
    }
  }

  async importWatchlist(
    stocks: any[],
    filename?: string,
    fileType?: string
  ): Promise<{ success: boolean; importedCount: number; failedCount: number }> {
    try {
      const res = await fetch('/api/watchlist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks, filename, fileType }),
      });
      if (!res.ok) return { success: false, importedCount: 0, failedCount: stocks.length };
      return await res.json();
    } catch (err) {
      console.error('importWatchlist error:', err);
      return { success: false, importedCount: 0, failedCount: stocks.length };
    }
  }

  async syncAllStocks(stocks: any[]): Promise<{ success: boolean; count: number; timestamp?: number; message?: string }> {
    try {
      const res = await fetch('/api/stocks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks }),
      });
      if (!res.ok) {
        return { success: false, count: 0 };
      }
      return await res.json();
    } catch (err) {
      console.error('syncAllStocks error:', err);
      return { success: false, count: 0 };
    }
  }

  // Compatibility aliases
  async fetchSqliteStocks(): Promise<any[]> {
    return this.fetchWatchlist();
  }

  async saveSqliteStock(stock: any): Promise<boolean> {
    return this.saveWatchlistItem(stock);
  }

  async deleteSqliteStock(symbol: string): Promise<boolean> {
    return this.deleteWatchlistItem(symbol);
  }

  async clearAllSqliteStocks(): Promise<boolean> {
    return this.clearWatchlist();
  }

  // --- BROKERAGE PLATFORMS ---

  async fetchBrokers(): Promise<{ brokers: BrokeragePlatform[]; defaultBroker: BrokeragePlatform }> {
    try {
      const res = await fetch('/api/brokers');
      if (!res.ok) throw new Error('Failed to fetch brokers');
      const data = await res.json();
      return {
        brokers: data.brokers || [],
        defaultBroker: data.defaultBroker,
      };
    } catch (err) {
      console.error('fetchBrokers error:', err);
      return { brokers: [], defaultBroker: {} as any };
    }
  }

  async saveBroker(broker: Partial<BrokeragePlatform> & { name_ar: string; name_en: string }): Promise<BrokeragePlatform | null> {
    try {
      const isUpdate = Boolean(broker.id);
      const url = isUpdate ? `/api/brokers/${encodeURIComponent(broker.id!)}` : '/api/brokers';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broker),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.broker || null;
    } catch (err) {
      console.error('saveBroker error:', err);
      return null;
    }
  }

  async deleteBroker(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/brokers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('deleteBroker error:', err);
      return false;
    }
  }

  async setDefaultBroker(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/brokers/${encodeURIComponent(id)}/default`, {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.error('setDefaultBroker error:', err);
      return false;
    }
  }

  // --- TRADING CALCULATIONS ---

  async calculateTrade(input: Partial<TradeCalculationInput>): Promise<TradeCalculationResult | null> {
    try {
      const res = await fetch('/api/trading/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.result || null;
    } catch (err) {
      console.error('calculateTrade error:', err);
      return null;
    }
  }

  // --- PORTFOLIO & TRADES ---

  async fetchPortfolioPositions(): Promise<PortfolioPosition[]> {
    try {
      const res = await fetch('/api/portfolio/positions');
      if (!res.ok) return [];
      const data = await res.json();
      return data.positions || [];
    } catch (err) {
      console.error('fetchPortfolioPositions error:', err);
      return [];
    }
  }

  async savePortfolioPosition(pos: any): Promise<PortfolioPosition | null> {
    try {
      const isUpdate = Boolean(pos.id);
      const url = isUpdate ? `/api/portfolio/positions/${encodeURIComponent(pos.id)}` : '/api/portfolio/positions';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pos),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.position || null;
    } catch (err) {
      console.error('savePortfolioPosition error:', err);
      return null;
    }
  }

  async deletePortfolioPosition(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/portfolio/positions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('deletePortfolioPosition error:', err);
      return false;
    }
  }

  async fetchTrades(): Promise<TradeRecord[]> {
    try {
      const res = await fetch('/api/trades');
      if (!res.ok) return [];
      const data = await res.json();
      return data.trades || [];
    } catch (err) {
      console.error('fetchTrades error:', err);
      return [];
    }
  }

  async recordTrade(trade: Omit<TradeRecord, 'id'>): Promise<TradeRecord | null> {
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.trade || null;
    } catch (err) {
      console.error('recordTrade error:', err);
      return null;
    }
  }

  // --- SETTINGS & AUDIT LOGS ---

  async fetchSettings(): Promise<Record<string, string>> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return {};
      const data = await res.json();
      return data.settings || {};
    } catch (err) {
      console.error('fetchSettings error:', err);
      return {};
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<boolean> {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (err) {
      console.error('saveSettings error:', err);
      return false;
    }
  }

  async fetchAuditLogs(): Promise<AuditLogRecord[]> {
    try {
      const res = await fetch('/api/audit-logs');
      if (!res.ok) return [];
      const data = await res.json();
      return data.logs || [];
    } catch {
      return [];
    }
  }

  async fetchImportJobs(): Promise<ImportJobRecord[]> {
    try {
      const res = await fetch('/api/import-jobs');
      if (!res.ok) return [];
      const data = await res.json();
      return data.jobs || [];
    } catch {
      return [];
    }
  }

  // --- ALERT HISTORY ---

  async fetchAlertHistory() {
    try {
      const res = await fetch('/api/alerts/history');
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  }

  async recordAlertHistory(alert: {
    symbol: string;
    companyName?: string;
    type: 'UPPER' | 'LOWER';
    targetPrice: number;
    triggeredPrice: number;
  }) {
    try {
      const res = await fetch('/api/alerts/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async deleteAlertHistory(id: string) {
    try {
      const res = await fetch(`/api/alerts/history/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async clearAlertHistory() {
    try {
      const res = await fetch('/api/alerts/history', {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchSqliteStatus(): Promise<any> {
    try {
      const res = await fetch('/api/sqlite/status');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('fetchSqliteStatus error:', err);
      return null;
    }
  }
}

export const apiService = new ApiService();
