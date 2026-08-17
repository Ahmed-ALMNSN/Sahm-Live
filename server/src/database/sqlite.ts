import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { AlertHistoryItem } from '../types.js';

export interface SqliteStock {
  symbol: string;
  name: string;
  sector: string;
  exchange?: string;
  price?: number;
  upperAlert?: number | null;
  lowerAlert?: number | null;
  alertsEnabled?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export class SqliteDatabase {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private initialized = false;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
    this.dbPath = path.join(dataDir, 'sahm_stocks.sqlite');
  }

  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    try {
      this.SQL = await initSqlJs();

      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
        console.log(`[SQLite] Loaded existing database from ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        console.log(`[SQLite] Created fresh SQLite database`);
      }

      this.createTables();
      this.seedDefaultStocksIfEmpty();
      this.saveToDisk();
      this.initialized = true;
    } catch (err) {
      console.error('[SQLite] Failed to initialize SQLite database:', err);
    }
  }

  private saveToDisk(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('[SQLite] Failed to persist database to disk:', err);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // Table: stocks (contains symbol, name, sector as requested by user)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stocks (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT DEFAULT 'General',
        exchange TEXT DEFAULT 'US',
        price REAL DEFAULT 0,
        upper_alert REAL,
        lower_alert REAL,
        alerts_enabled INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // Table: alert_history
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        company_name TEXT,
        type TEXT NOT NULL,
        target_price REAL NOT NULL,
        triggered_price REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        date TEXT NOT NULL
      );
    `);
    // Table: system_meta (to track seeding flags, settings)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  private seedDefaultStocksIfEmpty(): void {
    if (!this.db) return;

    // Check if initial seeding already took place previously
    try {
      const metaRes = this.db.exec(`SELECT value FROM system_meta WHERE key = 'has_seeded_initial';`);
      const alreadySeeded = metaRes[0]?.values[0]?.[0] === '1';
      if (alreadySeeded) {
        return;
      }
    } catch {
      // Table might have just been created
    }

    const countRes = this.db.exec(`SELECT COUNT(*) as count FROM stocks;`);
    const count = countRes[0]?.values[0]?.[0] as number || 0;

    if (count === 0) {
      console.log('[SQLite] First-time setup: Seeding initial stocks...');
      const defaultStocks: SqliteStock[] = [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', upperAlert: 245.00, lowerAlert: 215.00, alertsEnabled: true },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ', upperAlert: 430.00, lowerAlert: 390.00, alertsEnabled: true },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors', exchange: 'NASDAQ', upperAlert: 140.00, lowerAlert: 110.00, alertsEnabled: true },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', exchange: 'NASDAQ', upperAlert: 210.00, lowerAlert: 180.00, alertsEnabled: true },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', exchange: 'NASDAQ', upperAlert: 190.00, lowerAlert: 160.00, alertsEnabled: true },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive & Clean Energy', exchange: 'NASDAQ', upperAlert: 260.00, lowerAlert: 190.00, alertsEnabled: true },
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', exchange: 'NASDAQ', upperAlert: 600.00, lowerAlert: 510.00, alertsEnabled: true },
      ];

      const now = Date.now();
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO stocks (symbol, name, sector, exchange, price, upper_alert, lower_alert, alerts_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      for (const s of defaultStocks) {
        stmt.run([
          s.symbol,
          s.name,
          s.sector,
          s.exchange || 'US',
          s.price || 0,
          s.upperAlert ?? null,
          s.lowerAlert ?? null,
          s.alertsEnabled ? 1 : 0,
          now,
          now
        ]);
      }
      stmt.free();

      // Mark seeding as permanently completed
      this.db.run(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('has_seeded_initial', '1');`);
      this.saveToDisk();
    }
  }

  // --- Stock Operations ---

  getAllStocks(): SqliteStock[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT symbol, name, sector, exchange, price, upper_alert, lower_alert, alerts_enabled, created_at, updated_at 
        FROM stocks 
        ORDER BY symbol ASC;
      `);

      if (!res || res.length === 0) return [];
      const rows = res[0].values;
      return rows.map((r: any[]) => ({
        symbol: r[0],
        name: r[1],
        sector: r[2],
        exchange: r[3],
        price: r[4] ? Number(r[4]) : undefined,
        upperAlert: r[5] !== null && r[5] !== undefined ? Number(r[5]) : null,
        lowerAlert: r[6] !== null && r[6] !== undefined ? Number(r[6]) : null,
        alertsEnabled: Boolean(r[7]),
        createdAt: r[8] ? Number(r[8]) : undefined,
        updatedAt: r[9] ? Number(r[9]) : undefined,
      }));
    } catch (err) {
      console.error('[SQLite] Error getting stocks:', err);
      return [];
    }
  }

  getStock(symbol: string): SqliteStock | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(`
        SELECT symbol, name, sector, exchange, price, upper_alert, lower_alert, alerts_enabled, created_at, updated_at 
        FROM stocks WHERE symbol = ?;
      `);
      stmt.bind([symbol.toUpperCase()]);
      if (stmt.step()) {
        const r = stmt.get();
        stmt.free();
        return {
          symbol: r[0] as string,
          name: r[1] as string,
          sector: r[2] as string,
          exchange: r[3] as string,
          price: r[4] ? Number(r[4]) : undefined,
          upperAlert: r[5] !== null && r[5] !== undefined ? Number(r[5]) : null,
          lowerAlert: r[6] !== null && r[6] !== undefined ? Number(r[6]) : null,
          alertsEnabled: Boolean(r[7]),
          createdAt: r[8] ? Number(r[8]) : undefined,
          updatedAt: r[9] ? Number(r[9]) : undefined,
        };
      }
      stmt.free();
      return null;
    } catch (err) {
      console.error(`[SQLite] Error getting stock ${symbol}:`, err);
      return null;
    }
  }

  upsertStock(stock: SqliteStock): boolean {
    if (!this.db) return false;
    try {
      const now = Date.now();
      const existing = this.getStock(stock.symbol);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO stocks (symbol, name, sector, exchange, price, upper_alert, lower_alert, alerts_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      stmt.run([
        stock.symbol.toUpperCase(),
        stock.name || stock.symbol,
        stock.sector || 'General',
        stock.exchange || 'US',
        stock.price || 0,
        stock.upperAlert !== undefined ? stock.upperAlert : null,
        stock.lowerAlert !== undefined ? stock.lowerAlert : null,
        stock.alertsEnabled !== undefined ? (stock.alertsEnabled ? 1 : 0) : 1,
        existing?.createdAt || now,
        now,
      ]);
      stmt.free();

      this.saveToDisk();
      return true;
    } catch (err) {
      console.error(`[SQLite] Error upserting stock ${stock.symbol}:`, err);
      return false;
    }
  }

  deleteStock(symbol: string): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM stocks WHERE symbol = ?;`);
      stmt.run([symbol.toUpperCase()]);
      stmt.free();
      this.saveToDisk();
      console.log(`[SQLite] Deleted stock: ${symbol}`);
      return true;
    } catch (err) {
      console.error(`[SQLite] Error deleting stock ${symbol}:`, err);
      return false;
    }
  }

  clearAllStocks(): boolean {
    if (!this.db) return false;
    try {
      this.db.run(`DELETE FROM stocks;`);
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error clearing stocks:', err);
      return false;
    }
  }

  syncAllStocks(stocks: SqliteStock[]): { success: boolean; count: number; timestamp: number } {
    if (!this.db) return { success: false, count: 0, timestamp: Date.now() };
    try {
      const now = Date.now();
      // Clear existing records to ensure deletions/reorderings are accurately synchronized
      this.db.run(`DELETE FROM stocks;`);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO stocks (symbol, name, sector, exchange, price, upper_alert, lower_alert, alerts_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      let count = 0;
      for (const s of stocks) {
        if (s && s.symbol) {
          stmt.run([
            s.symbol.toUpperCase(),
            s.name || s.symbol.toUpperCase(),
            s.sector || 'General',
            s.exchange || 'US',
            s.price !== undefined ? Number(s.price) : 0,
            s.upperAlert !== undefined && s.upperAlert !== null ? Number(s.upperAlert) : null,
            s.lowerAlert !== undefined && s.lowerAlert !== null ? Number(s.lowerAlert) : null,
            s.alertsEnabled !== undefined ? (s.alertsEnabled ? 1 : 0) : 1,
            s.createdAt || now,
            now
          ]);
          count++;
        }
      }
      stmt.free();
      this.saveToDisk();
      console.log(`[SQLite] Successfully synced & committed ${count} stocks to persistent database`);
      return { success: true, count, timestamp: now };
    } catch (err) {
      console.error('[SQLite] Error syncing all stocks:', err);
      return { success: false, count: 0, timestamp: Date.now() };
    }
  }

  // --- Alert History Operations ---

  getAlertHistory(): AlertHistoryItem[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT id, symbol, company_name, type, target_price, triggered_price, timestamp, date 
        FROM alert_history 
        ORDER BY timestamp DESC 
        LIMIT 500;
      `);

      if (!res || res.length === 0) return [];
      return res[0].values.map((r: any[]) => ({
        id: r[0],
        symbol: r[1],
        companyName: r[2],
        type: r[3] as 'UPPER' | 'LOWER',
        targetPrice: Number(r[4]),
        triggeredPrice: Number(r[5]),
        timestamp: Number(r[6]),
        date: r[7],
      }));
    } catch (err) {
      console.error('[SQLite] Error getting alert history:', err);
      return [];
    }
  }

  addAlertHistory(item: Omit<AlertHistoryItem, 'id' | 'timestamp' | 'date'>): AlertHistoryItem | null {
    if (!this.db) return null;
    try {
      const now = Date.now();
      const id = `${item.symbol}_${now}_${Math.random().toString(36).substring(2, 7)}`;
      const dateStr = new Date(now).toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO alert_history (id, symbol, company_name, type, target_price, triggered_price, timestamp, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);

      stmt.run([
        id,
        item.symbol.toUpperCase(),
        item.companyName || item.symbol,
        item.type,
        item.targetPrice,
        item.triggeredPrice,
        now,
        dateStr,
      ]);
      stmt.free();

      this.saveToDisk();

      return {
        id,
        symbol: item.symbol.toUpperCase(),
        companyName: item.companyName,
        type: item.type,
        targetPrice: item.targetPrice,
        triggeredPrice: item.triggeredPrice,
        timestamp: now,
        date: dateStr,
      };
    } catch (err) {
      console.error('[SQLite] Error inserting alert history:', err);
      return null;
    }
  }

  deleteAlertHistory(id: string): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM alert_history WHERE id = ?;`);
      stmt.run([id]);
      stmt.free();
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error(`[SQLite] Error deleting alert history ${id}:`, err);
      return false;
    }
  }

  clearAlertHistory(): boolean {
    if (!this.db) return false;
    try {
      this.db.run(`DELETE FROM alert_history;`);
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error clearing alert history:', err);
      return false;
    }
  }

  // Check SQLite Database status & metadata
  getStatus(): { initialized: boolean; totalStocks: number; totalAlerts: number; dbPath: string } {
    if (!this.db) {
      return { initialized: false, totalStocks: 0, totalAlerts: 0, dbPath: this.dbPath };
    }
    try {
      const stockRes = this.db.exec(`SELECT COUNT(*) FROM stocks;`);
      const alertRes = this.db.exec(`SELECT COUNT(*) FROM alert_history;`);
      const totalStocks = Number(stockRes[0]?.values[0]?.[0] || 0);
      const totalAlerts = Number(alertRes[0]?.values[0]?.[0] || 0);
      return {
        initialized: true,
        totalStocks,
        totalAlerts,
        dbPath: this.dbPath,
      };
    } catch {
      return { initialized: true, totalStocks: 0, totalAlerts: 0, dbPath: this.dbPath };
    }
  }
}

export const sqliteDb = new SqliteDatabase();
