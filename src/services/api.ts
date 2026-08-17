import { StockQuote } from '../types.js';

export interface BatchQuotesResponse {
  quotes: StockQuote[];
  count?: number;
  requestedCount?: number;
}

export class ApiService {
  private isBatchFetching = false;
  private currentAbortController: AbortController | null = null;

  async fetchHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch('/api/health');
    return await res.json();
  }

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

    // Prevent overlapping refresh requests by cancelling previous active controller
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const cleanSymbols = Array.from(
      new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))
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
          // Aborted by newer refresh or unmount, return current results
          return results;
        }

        // For temporary network glitches, silently return available results and warn
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

  // --- SQLite Stock Persistence Endpoints ---

  async fetchSqliteStocks(): Promise<any[]> {
    try {
      const res = await fetch('/api/stocks');
      if (!res.ok) return [];
      const data = await res.json();
      return data.stocks || [];
    } catch (err) {
      console.error('fetchSqliteStocks error:', err);
      return [];
    }
  }

  async saveSqliteStock(stock: {
    symbol: string;
    name?: string;
    sector?: string;
    exchange?: string;
    price?: number;
    upperAlert?: number | null;
    lowerAlert?: number | null;
    alertsEnabled?: boolean;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock),
      });
      return res.ok;
    } catch (err) {
      console.error('saveSqliteStock error:', err);
      return false;
    }
  }

  async bulkSaveSqliteStocks(stocks: any[]): Promise<boolean> {
    try {
      const res = await fetch('/api/stocks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks }),
      });
      return res.ok;
    } catch (err) {
      console.error('bulkSaveSqliteStocks error:', err);
      return false;
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

  async deleteSqliteStock(symbol: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error(`deleteSqliteStock error for ${symbol}:`, err);
      return false;
    }
  }

  async clearAllSqliteStocks(): Promise<boolean> {
    try {
      const res = await fetch('/api/stocks', {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('clearAllSqliteStocks error:', err);
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
