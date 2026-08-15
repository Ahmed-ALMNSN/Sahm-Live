import fs from 'fs';
import path from 'path';
import { AlertHistoryItem } from '../types.js';

export interface StorageData {
  alertHistory: AlertHistoryItem[];
  watchlist: string[];
  settings: Record<string, any>;
}

export class AppStorage {
  private filePath: string;
  private memoryData: StorageData = {
    alertHistory: [],
    watchlist: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'TSLA', 'META'],
    settings: {
      refreshInterval: 5000,
      theme: 'dark',
      language: 'ar',
    },
  };

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Fallback to memory
      }
    }
    this.filePath = path.join(dataDir, 'storage.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryData = {
          ...this.memoryData,
          ...parsed,
        };
      }
    } catch (err) {
      console.warn('Could not read persistent storage file, using memory storage:', err);
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.memoryData, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write persistent storage file:', err);
    }
  }

  getAlertHistory(): AlertHistoryItem[] {
    return [...this.memoryData.alertHistory];
  }

  addAlertHistory(item: Omit<AlertHistoryItem, 'id' | 'timestamp' | 'date'>): AlertHistoryItem {
    const now = Date.now();
    const historyItem: AlertHistoryItem = {
      ...item,
      id: `${item.symbol}_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      date: new Date(now).toISOString(),
    };

    this.memoryData.alertHistory.unshift(historyItem);
    // Keep max 500 records
    if (this.memoryData.alertHistory.length > 500) {
      this.memoryData.alertHistory = this.memoryData.alertHistory.slice(0, 500);
    }

    this.save();
    return historyItem;
  }

  deleteAlertHistoryItem(id: string): boolean {
    const initialLen = this.memoryData.alertHistory.length;
    this.memoryData.alertHistory = this.memoryData.alertHistory.filter(i => i.id !== id);
    const changed = this.memoryData.alertHistory.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  clearAlertHistory(): void {
    this.memoryData.alertHistory = [];
    this.save();
  }

  getWatchlist(): string[] {
    return [...this.memoryData.watchlist];
  }

  saveWatchlist(symbols: string[]): void {
    this.memoryData.watchlist = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
    this.save();
  }
}

export const appStorage = new AppStorage();
