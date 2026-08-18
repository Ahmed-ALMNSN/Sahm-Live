import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import {
  AlertHistoryItem,
  BrokeragePlatform,
  PortfolioPosition,
  TradeRecord,
  StockQuote,
  SqliteStockRecord,
} from '../types.js';

export interface WatchlistItemRecord {
  id: string;
  watchlistId: string;
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  industry?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  upperAlert: number | null;
  lowerAlert: number | null;
  alertsEnabled: boolean;
  buyPrice: number | null;
  shares: number | null;
  brokerId: string;
  displayOrder: number;
  createdAt: number;
  updatedAt: number;
}

export class SqliteDatabase {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private initialized = false;

  constructor() {
    const baseDir = process.env.APP_USER_DATA_PATH || process.cwd();
    const dataDir = path.join(baseDir, 'data');
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
        console.log(`[SQLite] Loaded database from ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        console.log(`[SQLite] Created fresh SQLite database`);
      }

      this.runMigrations();
      this.seedDefaultBrokersIfEmpty();
      this.seedDefaultWatchlistIfEmpty();
      this.seedDefaultSettingsIfEmpty();
      this.saveToDisk();
      this.initialized = true;
    } catch (err) {
      console.error('[SQLite] Failed to initialize SQLite database:', err);
    }
  }

  public saveToDisk(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('[SQLite] Failed to persist database to disk:', err);
    }
  }

  private runMigrations(): void {
    if (!this.db) return;

    // 1. system_meta
    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // 2. stocks (master security / company definition table)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stocks (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT DEFAULT 'General',
        exchange TEXT DEFAULT 'US',
        industry TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // 3. stock_quotes (stores latest live prices and volume)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stock_quotes (
        symbol TEXT PRIMARY KEY,
        current_price REAL DEFAULT 0,
        previous_close REAL DEFAULT 0,
        open REAL DEFAULT 0,
        high REAL DEFAULT 0,
        low REAL DEFAULT 0,
        volume REAL DEFAULT 0,
        change REAL DEFAULT 0,
        change_percent REAL DEFAULT 0,
        market_state TEXT DEFAULT 'REGULAR',
        source TEXT DEFAULT 'YAHOO',
        fetched_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY (symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
      );
    `);

    // 4. watchlists
    this.db.run(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        name TEXT DEFAULT 'Main Watchlist',
        is_default INTEGER DEFAULT 1,
        created_at INTEGER
      );
    `);

    // Ensure default watchlist entry exists
    try {
      const res = this.db.exec(`SELECT id FROM watchlists WHERE id = 'default_watchlist';`);
      if (!res || res.length === 0 || res[0].values.length === 0) {
        this.db.run(`
          INSERT INTO watchlists (id, user_id, name, is_default, created_at)
          VALUES ('default_watchlist', 'default_user', 'Main Watchlist', 1, ${Date.now()});
        `);
      }
    } catch {
      // ignore
    }

    // 5. watchlist_items
    this.db.run(`
      CREATE TABLE IF NOT EXISTS watchlist_items (
        id TEXT PRIMARY KEY,
        watchlist_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        upper_alert REAL,
        lower_alert REAL,
        alerts_enabled INTEGER DEFAULT 1,
        buy_price REAL,
        shares REAL,
        broker_id TEXT DEFAULT 'broker_sahm',
        display_order INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        UNIQUE(watchlist_id, symbol)
      );
    `);

    // 6. brokerage_platforms
    this.db.run(`
      CREATE TABLE IF NOT EXISTS brokerage_platforms (
        id TEXT PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        country TEXT DEFAULT 'KSA / US',
        currency TEXT DEFAULT 'USD',
        buy_commission_type TEXT DEFAULT 'percentage',
        buy_commission_value REAL DEFAULT 0.15,
        sell_commission_type TEXT DEFAULT 'percentage',
        sell_commission_value REAL DEFAULT 0.15,
        minimum_commission REAL DEFAULT 1.99,
        maximum_commission REAL DEFAULT 0.0,
        broker_fee REAL DEFAULT 0.0,
        exchange_fee REAL DEFAULT 0.005,
        regulatory_fee REAL DEFAULT 0.00278,
        tax_rate REAL DEFAULT 0.0,
        vat_rate REAL DEFAULT 15.0,
        additional_fee REAL DEFAULT 0.0,
        notes TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // 7. portfolio_positions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS portfolio_positions (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        symbol TEXT NOT NULL,
        broker_id TEXT DEFAULT 'broker_sahm',
        quantity REAL NOT NULL,
        average_buy_price REAL NOT NULL,
        total_cost REAL NOT NULL,
        total_fees REAL DEFAULT 0.0,
        opened_at INTEGER,
        status TEXT DEFAULT 'OPEN',
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // 8. trades
    this.db.run(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        symbol TEXT NOT NULL,
        broker_id TEXT DEFAULT 'broker_sahm',
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        gross_amount REAL NOT NULL,
        commission REAL DEFAULT 0.0,
        broker_fee REAL DEFAULT 0.0,
        exchange_fee REAL DEFAULT 0.0,
        regulatory_fee REAL DEFAULT 0.0,
        tax REAL DEFAULT 0.0,
        vat REAL DEFAULT 0.0,
        additional_fees REAL DEFAULT 0.0,
        total_fees REAL DEFAULT 0.0,
        net_amount REAL NOT NULL,
        executed_at INTEGER NOT NULL
      );
    `);

    // 9. alert_history
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

    // 10. user_settings
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );
    `);

    // 11. import_jobs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        imported_rows INTEGER NOT NULL,
        successful_rows INTEGER NOT NULL,
        failed_rows INTEGER NOT NULL,
        imported_at INTEGER NOT NULL
      );
    `);

    // 12. audit_logs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      );
    `);

    // Indexes for high performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist_items(symbol);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_id ON watchlist_items(watchlist_id);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_quotes_fetched ON stock_quotes(fetched_at);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alert_history(timestamp);`);

    // Schema Migrations / Column additions for existing databases
    this.ensureColumn('stocks', 'name', 'TEXT NOT NULL DEFAULT ""');
    this.ensureColumn('stocks', 'sector', "TEXT DEFAULT 'General'");
    this.ensureColumn('stocks', 'exchange', "TEXT DEFAULT 'US'");
    this.ensureColumn('stocks', 'industry', 'TEXT');
    this.ensureColumn('stocks', 'created_at', 'INTEGER');
    this.ensureColumn('stocks', 'updated_at', 'INTEGER');

    this.ensureColumn('stock_quotes', 'current_price', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'previous_close', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'open', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'high', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'low', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'volume', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'change', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'change_percent', 'REAL DEFAULT 0');
    this.ensureColumn('stock_quotes', 'market_state', "TEXT DEFAULT 'REGULAR'");
    this.ensureColumn('stock_quotes', 'source', "TEXT DEFAULT 'YAHOO'");
    this.ensureColumn('stock_quotes', 'fetched_at', 'INTEGER');
    this.ensureColumn('stock_quotes', 'updated_at', 'INTEGER');

    this.ensureColumn('watchlist_items', 'watchlist_id', "TEXT DEFAULT 'default_watchlist'");
    this.ensureColumn('watchlist_items', 'symbol', 'TEXT');
    this.ensureColumn('watchlist_items', 'upper_alert', 'REAL');
    this.ensureColumn('watchlist_items', 'lower_alert', 'REAL');
    this.ensureColumn('watchlist_items', 'alerts_enabled', 'INTEGER DEFAULT 1');
    this.ensureColumn('watchlist_items', 'buy_price', 'REAL');
    this.ensureColumn('watchlist_items', 'shares', 'REAL');
    this.ensureColumn('watchlist_items', 'broker_id', "TEXT DEFAULT 'broker_sahm'");
    this.ensureColumn('watchlist_items', 'display_order', 'INTEGER DEFAULT 0');
    this.ensureColumn('watchlist_items', 'created_at', 'INTEGER');
    this.ensureColumn('watchlist_items', 'updated_at', 'INTEGER');

    this.ensureColumn('brokerage_platforms', 'name_ar', 'TEXT');
    this.ensureColumn('brokerage_platforms', 'name_en', 'TEXT');
    this.ensureColumn('brokerage_platforms', 'country', "TEXT DEFAULT 'KSA / US'");
    this.ensureColumn('brokerage_platforms', 'currency', "TEXT DEFAULT 'USD'");
    this.ensureColumn('brokerage_platforms', 'buy_commission_type', "TEXT DEFAULT 'percentage'");
    this.ensureColumn('brokerage_platforms', 'buy_commission_value', 'REAL DEFAULT 0.15');
    this.ensureColumn('brokerage_platforms', 'sell_commission_type', "TEXT DEFAULT 'percentage'");
    this.ensureColumn('brokerage_platforms', 'sell_commission_value', 'REAL DEFAULT 0.15');
    this.ensureColumn('brokerage_platforms', 'minimum_commission', 'REAL DEFAULT 1.99');
    this.ensureColumn('brokerage_platforms', 'maximum_commission', 'REAL DEFAULT 0.0');
    this.ensureColumn('brokerage_platforms', 'broker_fee', 'REAL DEFAULT 0.0');
    this.ensureColumn('brokerage_platforms', 'exchange_fee', 'REAL DEFAULT 0.005');
    this.ensureColumn('brokerage_platforms', 'regulatory_fee', 'REAL DEFAULT 0.00278');
    this.ensureColumn('brokerage_platforms', 'tax_rate', 'REAL DEFAULT 0.0');
    this.ensureColumn('brokerage_platforms', 'vat_rate', 'REAL DEFAULT 15.0');
    this.ensureColumn('brokerage_platforms', 'additional_fee', 'REAL DEFAULT 0.0');
    this.ensureColumn('brokerage_platforms', 'notes', 'TEXT');
    this.ensureColumn('brokerage_platforms', 'is_default', 'INTEGER DEFAULT 0');
    this.ensureColumn('brokerage_platforms', 'is_active', 'INTEGER DEFAULT 1');

    this.ensureColumn('portfolio_positions', 'user_id', "TEXT DEFAULT 'default_user'");
    this.ensureColumn('portfolio_positions', 'symbol', 'TEXT');
    this.ensureColumn('portfolio_positions', 'broker_id', "TEXT DEFAULT 'broker_sahm'");
    this.ensureColumn('portfolio_positions', 'quantity', 'REAL DEFAULT 0');
    this.ensureColumn('portfolio_positions', 'average_buy_price', 'REAL DEFAULT 0');
    this.ensureColumn('portfolio_positions', 'total_cost', 'REAL DEFAULT 0');
    this.ensureColumn('portfolio_positions', 'total_fees', 'REAL DEFAULT 0');
    this.ensureColumn('portfolio_positions', 'opened_at', 'INTEGER');
    this.ensureColumn('portfolio_positions', 'status', "TEXT DEFAULT 'OPEN'");

    this.ensureColumn('trades', 'user_id', "TEXT DEFAULT 'default_user'");
    this.ensureColumn('trades', 'symbol', 'TEXT');
    this.ensureColumn('trades', 'broker_id', "TEXT DEFAULT 'broker_sahm'");
    this.ensureColumn('trades', 'type', "TEXT DEFAULT 'BUY'");
    this.ensureColumn('trades', 'quantity', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'price', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'gross_amount', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'commission', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'broker_fee', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'exchange_fee', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'regulatory_fee', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'tax', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'vat', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'additional_fees', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'total_fees', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'net_amount', 'REAL DEFAULT 0');
    this.ensureColumn('trades', 'executed_at', 'INTEGER DEFAULT 0');

    this.ensureColumn('alert_history', 'symbol', 'TEXT');
    this.ensureColumn('alert_history', 'company_name', 'TEXT');
    this.ensureColumn('alert_history', 'type', "TEXT DEFAULT 'UPPER'");
    this.ensureColumn('alert_history', 'target_price', 'REAL DEFAULT 0');
    this.ensureColumn('alert_history', 'triggered_price', 'REAL DEFAULT 0');
    this.ensureColumn('alert_history', 'timestamp', 'INTEGER DEFAULT 0');
    this.ensureColumn('alert_history', 'date', "TEXT DEFAULT ''");
  }

  private ensureColumn(tableName: string, columnName: string, columnDef: string): void {
    if (!this.db) return;
    try {
      const res = this.db.exec(`PRAGMA table_info(${tableName});`);
      if (res && res.length > 0 && res[0].values) {
        const columns = res[0].values.map((row: any) => String(row[1]).toLowerCase());
        if (!columns.includes(columnName.toLowerCase())) {
          console.log(`[SQLite] Migrating schema: adding column ${columnName} to ${tableName}`);
          this.db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
        }
      }
    } catch (err) {
      console.error(`[SQLite] Error ensuring column ${columnName} on ${tableName}:`, err);
    }
  }

  private seedDefaultBrokersIfEmpty(): void {
    if (!this.db) return;
    try {
      const res = this.db.exec(`SELECT COUNT(*) FROM brokerage_platforms;`);
      const count = (res[0]?.values[0]?.[0] as number) || 0;
      if (count === 0) {
        console.log('[SQLite] Seeding default brokerage platforms (Sahm is default)...');
        const now = Date.now();
        const brokers: BrokeragePlatform[] = [
          {
            id: 'broker_sahm',
            name_ar: 'منصة سهم (Sahm)',
            name_en: 'Sahm Capital',
            country: 'KSA / US',
            currency: 'USD',
            buy_commission_type: 'percentage',
            buy_commission_value: 0.15,
            sell_commission_type: 'percentage',
            sell_commission_value: 0.15,
            minimum_commission: 1.99,
            maximum_commission: 0,
            broker_fee: 0,
            exchange_fee: 0.005,
            regulatory_fee: 0.00278,
            tax_rate: 0,
            vat_rate: 15.0,
            additional_fee: 0,
            notes: 'المنصة الافتراضية - منصة سهم المرخصة للتداول بالسوق الأمريكي',
            is_default: true,
            is_active: true,
          },
          {
            id: 'broker_derayah',
            name_ar: 'دراية جلوبال (Derayah Global)',
            name_en: 'Derayah Global',
            country: 'KSA / US',
            currency: 'USD',
            buy_commission_type: 'per_share',
            buy_commission_value: 0.0199,
            sell_commission_type: 'per_share',
            sell_commission_value: 0.0199,
            minimum_commission: 2.99,
            maximum_commission: 0,
            broker_fee: 0,
            exchange_fee: 0.005,
            regulatory_fee: 0.00278,
            tax_rate: 0,
            vat_rate: 15.0,
            additional_fee: 0,
            notes: 'دراية المالية - تداول الأسهم الأمريكية',
            is_default: false,
            is_active: true,
          },
          {
            id: 'broker_ibkr',
            name_ar: 'إنترأكتيف بروكرز (IBKR)',
            name_en: 'Interactive Brokers (Tiered)',
            country: 'US / Global',
            currency: 'USD',
            buy_commission_type: 'per_share',
            buy_commission_value: 0.005,
            sell_commission_type: 'per_share',
            sell_commission_value: 0.005,
            minimum_commission: 1.0,
            maximum_commission: 0,
            broker_fee: 0,
            exchange_fee: 0.003,
            regulatory_fee: 0.00278,
            tax_rate: 0,
            vat_rate: 0,
            additional_fee: 0,
            notes: 'حساب Interactive Brokers بنظام العمولة المتدرجة',
            is_default: false,
            is_active: true,
          },
          {
            id: 'broker_alrajhi',
            name_ar: 'الراجحي المالية (Al Rajhi Capital)',
            name_en: 'Al Rajhi Capital (US)',
            country: 'KSA',
            currency: 'USD',
            buy_commission_type: 'percentage',
            buy_commission_value: 0.18,
            sell_commission_type: 'percentage',
            sell_commission_value: 0.18,
            minimum_commission: 3.5,
            maximum_commission: 0,
            broker_fee: 0,
            exchange_fee: 0.005,
            regulatory_fee: 0.00278,
            tax_rate: 0,
            vat_rate: 15.0,
            additional_fee: 0,
            notes: 'الراجحي كابيتال للتداول الدولي',
            is_default: false,
            is_active: true,
          },
          {
            id: 'broker_robinhood',
            name_ar: 'روبنهود (Robinhood)',
            name_en: 'Robinhood',
            country: 'US',
            currency: 'USD',
            buy_commission_type: 'fixed',
            buy_commission_value: 0,
            sell_commission_type: 'fixed',
            sell_commission_value: 0,
            minimum_commission: 0,
            maximum_commission: 0,
            broker_fee: 0,
            exchange_fee: 0,
            regulatory_fee: 0.00278,
            tax_rate: 0,
            vat_rate: 0,
            additional_fee: 0,
            notes: 'تداول بدون عمولة مباشرة',
            is_default: false,
            is_active: true,
          },
        ];

        const stmt = this.db.prepare(`
          INSERT INTO brokerage_platforms (
            id, name_ar, name_en, country, currency,
            buy_commission_type, buy_commission_value,
            sell_commission_type, sell_commission_value,
            minimum_commission, maximum_commission,
            broker_fee, exchange_fee, regulatory_fee,
            tax_rate, vat_rate, additional_fee,
            notes, is_default, is_active,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `);

        for (const b of brokers) {
          stmt.run([
            b.id,
            b.name_ar,
            b.name_en,
            b.country,
            b.currency,
            b.buy_commission_type,
            b.buy_commission_value,
            b.sell_commission_type,
            b.sell_commission_value,
            b.minimum_commission,
            b.maximum_commission,
            b.broker_fee,
            b.exchange_fee,
            b.regulatory_fee,
            b.tax_rate,
            b.vat_rate,
            b.additional_fee,
            b.notes || '',
            b.is_default ? 1 : 0,
            b.is_active ? 1 : 0,
            now,
            now,
          ]);
        }
        stmt.free();
      }
    } catch (err) {
      console.error('[SQLite] Error seeding brokers:', err);
    }
  }

  private seedDefaultWatchlistIfEmpty(): void {
    if (!this.db) return;

    // Check if initial seeding already took place previously
    try {
      const metaRes = this.db.exec(`SELECT value FROM system_meta WHERE key = 'has_seeded_initial';`);
      const alreadySeeded = metaRes[0]?.values[0]?.[0] === '1';
      if (alreadySeeded) {
        return;
      }
    } catch {
      // ignore
    }

    try {
      const countRes = this.db.exec(`SELECT COUNT(*) FROM watchlist_items;`);
      const count = (countRes[0]?.values[0]?.[0] as number) || 0;

      if (count === 0) {
        console.log('[SQLite] First-time install: Seeding initial stocks into database...');
        const defaultStocks = [
          { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', upperAlert: 245.0, lowerAlert: 215.0, buyPrice: 220.5, shares: 50 },
          { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ', upperAlert: 430.0, lowerAlert: 390.0, buyPrice: 405.0, shares: 25 },
          { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors', exchange: 'NASDAQ', upperAlert: 140.0, lowerAlert: 110.0, buyPrice: 120.0, shares: 100 },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', exchange: 'NASDAQ', upperAlert: 210.0, lowerAlert: 180.0, buyPrice: 185.0, shares: 40 },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', exchange: 'NASDAQ', upperAlert: 190.0, lowerAlert: 160.0, buyPrice: 168.0, shares: 35 },
          { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive & Clean Energy', exchange: 'NASDAQ', upperAlert: 260.0, lowerAlert: 190.0, buyPrice: 215.0, shares: 30 },
          { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', exchange: 'NASDAQ', upperAlert: 600.0, lowerAlert: 510.0, buyPrice: 530.0, shares: 20 },
        ];

        const now = Date.now();
        const stockStmt = this.db.prepare(`
          INSERT OR REPLACE INTO stocks (symbol, name, sector, exchange, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?);
        `);
        const itemStmt = this.db.prepare(`
          INSERT OR REPLACE INTO watchlist_items (
            id, watchlist_id, symbol, upper_alert, lower_alert, alerts_enabled,
            buy_price, shares, broker_id, display_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `);

        for (let i = 0; i < defaultStocks.length; i++) {
          const s = defaultStocks[i];
          stockStmt.run([s.symbol, s.name, s.sector, s.exchange, now, now]);
          itemStmt.run([
            `item_${s.symbol}`,
            'default_watchlist',
            s.symbol,
            s.upperAlert,
            s.lowerAlert,
            1,
            s.buyPrice,
            s.shares,
            'broker_sahm',
            i,
            now,
            now,
          ]);
        }
        stockStmt.free();
        itemStmt.free();

        this.db.run(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('has_seeded_initial', '1');`);
      }
    } catch (err) {
      console.error('[SQLite] Error seeding watchlist:', err);
    }
  }

  private seedDefaultSettingsIfEmpty(): void {
    if (!this.db) return;
    try {
      const defaults: Record<string, string> = {
        theme: 'dark',
        lang: 'ar',
        refreshInterval: '2000',
        defaultBrokerId: 'broker_sahm',
        soundAlerts: 'true',
      };
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?);
      `);
      const now = Date.now();
      for (const [k, v] of Object.entries(defaults)) {
        stmt.run([k, v, now]);
      }
      stmt.free();
    } catch (err) {
      console.error('[SQLite] Error seeding user settings:', err);
    }
  }

  // ==========================================
  // WATCHLIST & STOCK OPERATIONS (DB AS SOURCE OF TRUTH)
  // ==========================================

  getWatchlist(watchlistId = 'default_watchlist'): WatchlistItemRecord[] {
    if (!this.db) return [];
    try {
      const query = `
        SELECT 
          w.id, w.watchlist_id, w.symbol, 
          COALESCE(s.name, w.symbol) as company_name,
          COALESCE(s.sector, 'General') as sector,
          COALESCE(s.exchange, 'US') as exchange,
          s.industry,
          COALESCE(q.current_price, 0) as price,
          COALESCE(q.change, 0) as change,
          COALESCE(q.change_percent, 0) as change_percent,
          COALESCE(q.open, 0) as open,
          COALESCE(q.previous_close, 0) as previous_close,
          COALESCE(q.high, 0) as day_high,
          COALESCE(q.low, 0) as day_low,
          COALESCE(q.volume, 0) as volume,
          w.upper_alert, w.lower_alert, w.alerts_enabled,
          w.buy_price, w.shares, COALESCE(w.broker_id, 'broker_sahm') as broker_id,
          w.display_order, w.created_at, w.updated_at
        FROM watchlist_items w
        LEFT JOIN stocks s ON w.symbol = s.symbol
        LEFT JOIN stock_quotes q ON w.symbol = q.symbol
        WHERE w.watchlist_id = ?
        ORDER BY w.display_order ASC, w.created_at ASC;
      `;
      const stmt = this.db.prepare(query);
      stmt.bind([watchlistId]);
      const results: WatchlistItemRecord[] = [];
      while (stmt.step()) {
        const r = stmt.get();
        results.push({
          id: r[0] as string,
          watchlistId: r[1] as string,
          symbol: r[2] as string,
          companyName: r[3] as string,
          sector: r[4] as string,
          exchange: r[5] as string,
          industry: r[6] ? (r[6] as string) : undefined,
          price: Number(r[7] || 0),
          change: Number(r[8] || 0),
          changePercent: Number(r[9] || 0),
          open: Number(r[10] || 0),
          previousClose: Number(r[11] || 0),
          dayHigh: Number(r[12] || 0),
          dayLow: Number(r[13] || 0),
          volume: Number(r[14] || 0),
          upperAlert: r[15] !== null && r[15] !== undefined ? Number(r[15]) : null,
          lowerAlert: r[16] !== null && r[16] !== undefined ? Number(r[16]) : null,
          alertsEnabled: Boolean(r[17]),
          buyPrice: r[18] !== null && r[18] !== undefined ? Number(r[18]) : null,
          shares: r[19] !== null && r[19] !== undefined ? Number(r[19]) : null,
          brokerId: (r[20] as string) || 'broker_sahm',
          displayOrder: Number(r[21] || 0),
          createdAt: Number(r[22] || 0),
          updatedAt: Number(r[23] || 0),
        });
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('[SQLite] Error getting watchlist:', err);
      return [];
    }
  }

  addOrUpdateWatchlistItem(item: {
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
    watchlistId?: string;
  }): boolean {
    if (!this.db) return false;
    try {
      const sym = item.symbol.trim().toUpperCase();
      const watchlistId = item.watchlistId || 'default_watchlist';
      const now = Date.now();

      // 1. Ensure master stock definition exists
      const stockStmt = this.db.prepare(`
        INSERT INTO stocks (symbol, name, sector, exchange, industry, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          name = COALESCE(excluded.name, stocks.name),
          sector = COALESCE(excluded.sector, stocks.sector),
          exchange = COALESCE(excluded.exchange, stocks.exchange),
          industry = COALESCE(excluded.industry, stocks.industry),
          updated_at = excluded.updated_at;
      `);
      stockStmt.run([
        sym,
        item.companyName || sym,
        item.sector || 'General',
        item.exchange || 'US',
        item.industry || null,
        now,
        now,
      ]);
      stockStmt.free();

      // 2. Upsert into watchlist_items
      const id = `item_${watchlistId}_${sym}`;
      const itemStmt = this.db.prepare(`
        INSERT INTO watchlist_items (
          id, watchlist_id, symbol, upper_alert, lower_alert, alerts_enabled,
          buy_price, shares, broker_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(watchlist_id, symbol) DO UPDATE SET
          upper_alert = excluded.upper_alert,
          lower_alert = excluded.lower_alert,
          alerts_enabled = excluded.alerts_enabled,
          buy_price = excluded.buy_price,
          shares = excluded.shares,
          broker_id = excluded.broker_id,
          updated_at = excluded.updated_at;
      `);

      itemStmt.run([
        id,
        watchlistId,
        sym,
        item.upperAlert !== undefined ? item.upperAlert : null,
        item.lowerAlert !== undefined ? item.lowerAlert : null,
        item.alertsEnabled !== undefined ? (item.alertsEnabled ? 1 : 0) : 1,
        item.buyPrice !== undefined ? item.buyPrice : null,
        item.shares !== undefined ? item.shares : null,
        item.brokerId || 'broker_sahm',
        now,
        now,
      ]);
      itemStmt.free();

      this.recordAuditLog('default_user', 'UPSERT_WATCHLIST_ITEM', 'watchlist_items', sym, JSON.stringify(item));
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error adding/updating watchlist item:', err);
      return false;
    }
  }

  deleteWatchlistItem(symbol: string, watchlistId = 'default_watchlist'): boolean {
    if (!this.db) return false;
    try {
      const sym = symbol.trim().toUpperCase();
      const stmt = this.db.prepare(`DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?;`);
      stmt.run([watchlistId, sym]);
      stmt.free();

      this.recordAuditLog('default_user', 'DELETE_WATCHLIST_ITEM', 'watchlist_items', sym);
      this.saveToDisk();
      console.log(`[SQLite] Permanently deleted ${sym} from watchlist`);
      return true;
    } catch (err) {
      console.error('[SQLite] Error deleting watchlist item:', err);
      return false;
    }
  }

  clearWatchlist(watchlistId = 'default_watchlist'): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM watchlist_items WHERE watchlist_id = ?;`);
      stmt.run([watchlistId]);
      stmt.free();

      this.recordAuditLog('default_user', 'CLEAR_WATCHLIST', 'watchlist_items', watchlistId);
      this.saveToDisk();
      console.log(`[SQLite] Permanently cleared all items from watchlist ${watchlistId}`);
      return true;
    } catch (err) {
      console.error('[SQLite] Error clearing watchlist:', err);
      return false;
    }
  }

  importWatchlistStocks(
    stocks: Array<{
      symbol: string;
      companyName?: string;
      sector?: string;
      exchange?: string;
      industry?: string;
      price?: number;
      upperAlert?: number | null;
      lowerAlert?: number | null;
      alertsEnabled?: boolean;
      buyPrice?: number | null;
      shares?: number | null;
      brokerId?: string;
    }>,
    filename = 'upload.csv',
    fileType = 'csv',
    watchlistId = 'default_watchlist'
  ): { success: boolean; importedCount: number; failedCount: number } {
    if (!this.db || !Array.isArray(stocks)) return { success: false, importedCount: 0, failedCount: 0 };
    try {
      const now = Date.now();
      let importedCount = 0;
      let failedCount = 0;

      const stockStmt = this.db.prepare(`
        INSERT INTO stocks (symbol, name, sector, exchange, industry, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          name = COALESCE(excluded.name, stocks.name),
          sector = COALESCE(excluded.sector, stocks.sector),
          exchange = COALESCE(excluded.exchange, stocks.exchange),
          industry = COALESCE(excluded.industry, stocks.industry),
          updated_at = excluded.updated_at;
      `);

      const itemStmt = this.db.prepare(`
        INSERT INTO watchlist_items (
          id, watchlist_id, symbol, upper_alert, lower_alert, alerts_enabled,
          buy_price, shares, broker_id, display_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(watchlist_id, symbol) DO UPDATE SET
          upper_alert = COALESCE(excluded.upper_alert, watchlist_items.upper_alert),
          lower_alert = COALESCE(excluded.lower_alert, watchlist_items.lower_alert),
          alerts_enabled = COALESCE(excluded.alerts_enabled, watchlist_items.alerts_enabled),
          buy_price = COALESCE(excluded.buy_price, watchlist_items.buy_price),
          shares = COALESCE(excluded.shares, watchlist_items.shares),
          broker_id = COALESCE(excluded.broker_id, watchlist_items.broker_id),
          updated_at = excluded.updated_at;
      `);

      for (let i = 0; i < stocks.length; i++) {
        const s = stocks[i];
        const sym = s?.symbol?.trim()?.toUpperCase();
        if (!sym) {
          failedCount++;
          continue;
        }

        try {
          stockStmt.run([
            sym,
            s.companyName || sym,
            s.sector || 'General',
            s.exchange || 'US',
            s.industry || null,
            now,
            now,
          ]);

          itemStmt.run([
            `item_${watchlistId}_${sym}`,
            watchlistId,
            sym,
            s.upperAlert !== undefined ? s.upperAlert : null,
            s.lowerAlert !== undefined ? s.lowerAlert : null,
            s.alertsEnabled !== undefined ? (s.alertsEnabled ? 1 : 0) : 1,
            s.buyPrice !== undefined ? s.buyPrice : null,
            s.shares !== undefined ? s.shares : null,
            s.brokerId || 'broker_sahm',
            i,
            now,
            now,
          ]);
          importedCount++;
        } catch {
          failedCount++;
        }
      }

      stockStmt.free();
      itemStmt.free();

      // Record Import Job in DB
      this.recordImportJob(filename, fileType, stocks.length, importedCount, failedCount);
      this.recordAuditLog('default_user', 'IMPORT_STOCKS', 'watchlist_items', watchlistId, JSON.stringify({ filename, importedCount }));
      this.saveToDisk();

      return { success: true, importedCount, failedCount };
    } catch (err) {
      console.error('[SQLite] Error during bulk import:', err);
      return { success: false, importedCount: 0, failedCount: stocks.length };
    }
  }

  // ==========================================
  // STOCK QUOTES (UPSERT LIVE PRICES TO DB)
  // ==========================================

  upsertStockQuote(quote: StockQuote): boolean {
    if (!this.db || !quote || !quote.symbol) return false;
    try {
      const sym = quote.symbol.trim().toUpperCase();
      const now = Date.now();

      // Make sure stock definition exists
      const stockStmt = this.db.prepare(`
        INSERT OR IGNORE INTO stocks (symbol, name, sector, exchange, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?);
      `);
      const anyQuote = quote as any;
      stockStmt.run([sym, anyQuote.companyName || sym, anyQuote.sector || 'General', anyQuote.exchange || 'US', now, now]);
      stockStmt.free();

      const stmt = this.db.prepare(`
        INSERT INTO stock_quotes (
          symbol, current_price, previous_close, open, high, low,
          volume, change, change_percent, market_state, source, fetched_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          current_price = excluded.current_price,
          previous_close = excluded.previous_close,
          open = excluded.open,
          high = excluded.high,
          low = excluded.low,
          volume = excluded.volume,
          change = excluded.change,
          change_percent = excluded.change_percent,
          market_state = excluded.market_state,
          source = excluded.source,
          fetched_at = excluded.fetched_at,
          updated_at = excluded.updated_at;
      `);

      stmt.run([
        sym,
        quote.price || 0,
        quote.previousClose || 0,
        quote.open || 0,
        quote.high || 0,
        quote.low || 0,
        quote.volume || 0,
        quote.change || 0,
        quote.changePercent || 0,
        quote.marketState || 'REGULAR',
        quote.provider || 'YAHOO',
        now,
        now,
      ]);
      stmt.free();
      return true;
    } catch (err) {
      console.error('[SQLite] Error upserting stock quote:', err);
      return false;
    }
  }

  upsertBatchStockQuotes(quotes: StockQuote[]): number {
    if (!this.db || !Array.isArray(quotes)) return 0;
    let count = 0;
    for (const q of quotes) {
      if (this.upsertStockQuote(q)) {
        count++;
      }
    }
    if (count > 0) {
      this.saveToDisk();
    }
    return count;
  }

  // ==========================================
  // BROKERAGE PLATFORMS (MANAGE & CALCULATION CONFIG)
  // ==========================================

  getAllBrokers(): BrokeragePlatform[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT 
          id, name_ar, name_en, country, currency,
          buy_commission_type, buy_commission_value,
          sell_commission_type, sell_commission_value,
          minimum_commission, maximum_commission,
          broker_fee, exchange_fee, regulatory_fee,
          tax_rate, vat_rate, additional_fee,
          notes, is_default, is_active,
          created_at, updated_at
        FROM brokerage_platforms
        ORDER BY is_default DESC, name_ar ASC;
      `);

      if (!res || res.length === 0) return [];
      return res[0].values.map((r: any[]) => ({
        id: r[0],
        name_ar: r[1],
        name_en: r[2],
        country: r[3],
        currency: r[4],
        buy_commission_type: r[5],
        buy_commission_value: Number(r[6] || 0),
        sell_commission_type: r[7],
        sell_commission_value: Number(r[8] || 0),
        minimum_commission: Number(r[9] || 0),
        maximum_commission: Number(r[10] || 0),
        broker_fee: Number(r[11] || 0),
        exchange_fee: Number(r[12] || 0),
        regulatory_fee: Number(r[13] || 0),
        tax_rate: Number(r[14] || 0),
        vat_rate: Number(r[15] || 0),
        additional_fee: Number(r[16] || 0),
        notes: r[17] || '',
        is_default: Boolean(r[18]),
        is_active: Boolean(r[19]),
        created_at: Number(r[20] || 0),
        updated_at: Number(r[21] || 0),
      }));
    } catch (err) {
      console.error('[SQLite] Error getting brokers:', err);
      return [];
    }
  }

  getBroker(id: string): BrokeragePlatform | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(`SELECT * FROM brokerage_platforms WHERE id = ?;`);
      stmt.bind([id]);
      if (stmt.step()) {
        const r = stmt.getAsObject() as any;
        stmt.free();
        return {
          id: r.id,
          name_ar: r.name_ar,
          name_en: r.name_en,
          country: r.country,
          currency: r.currency,
          buy_commission_type: r.buy_commission_type,
          buy_commission_value: Number(r.buy_commission_value || 0),
          sell_commission_type: r.sell_commission_type,
          sell_commission_value: Number(r.sell_commission_value || 0),
          minimum_commission: Number(r.minimum_commission || 0),
          maximum_commission: Number(r.maximum_commission || 0),
          broker_fee: Number(r.broker_fee || 0),
          exchange_fee: Number(r.exchange_fee || 0),
          regulatory_fee: Number(r.regulatory_fee || 0),
          tax_rate: Number(r.tax_rate || 0),
          vat_rate: Number(r.vat_rate || 0),
          additional_fee: Number(r.additional_fee || 0),
          notes: r.notes || '',
          is_default: Boolean(r.is_default),
          is_active: Boolean(r.is_active),
          created_at: Number(r.created_at || 0),
          updated_at: Number(r.updated_at || 0),
        };
      }
      stmt.free();
      return null;
    } catch {
      return null;
    }
  }

  getDefaultBroker(): BrokeragePlatform {
    const all = this.getAllBrokers();
    const found = all.find((b) => b.is_default && b.is_active) || all[0];
    if (found) return found;

    return {
      id: 'broker_sahm',
      name_ar: 'منصة سهم (Sahm)',
      name_en: 'Sahm Capital',
      country: 'KSA / US',
      currency: 'USD',
      buy_commission_type: 'percentage',
      buy_commission_value: 0.15,
      sell_commission_type: 'percentage',
      sell_commission_value: 0.15,
      minimum_commission: 1.99,
      maximum_commission: 0,
      broker_fee: 0,
      exchange_fee: 0.005,
      regulatory_fee: 0.00278,
      tax_rate: 0,
      vat_rate: 15.0,
      additional_fee: 0,
      notes: 'منصة سهم للتداول المالي',
      is_default: true,
      is_active: true,
    };
  }

  upsertBroker(broker: Partial<BrokeragePlatform> & { name_ar: string; name_en: string }): BrokeragePlatform | null {
    if (!this.db) return null;
    try {
      const now = Date.now();
      const id = broker.id || `broker_${now}_${Math.random().toString(36).substring(2, 6)}`;

      if (broker.is_default) {
        this.db.run(`UPDATE brokerage_platforms SET is_default = 0;`);
      }

      const stmt = this.db.prepare(`
        INSERT INTO brokerage_platforms (
          id, name_ar, name_en, country, currency,
          buy_commission_type, buy_commission_value,
          sell_commission_type, sell_commission_value,
          minimum_commission, maximum_commission,
          broker_fee, exchange_fee, regulatory_fee,
          tax_rate, vat_rate, additional_fee,
          notes, is_default, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name_ar = excluded.name_ar,
          name_en = excluded.name_en,
          country = excluded.country,
          currency = excluded.currency,
          buy_commission_type = excluded.buy_commission_type,
          buy_commission_value = excluded.buy_commission_value,
          sell_commission_type = excluded.sell_commission_type,
          sell_commission_value = excluded.sell_commission_value,
          minimum_commission = excluded.minimum_commission,
          maximum_commission = excluded.maximum_commission,
          broker_fee = excluded.broker_fee,
          exchange_fee = excluded.exchange_fee,
          regulatory_fee = excluded.regulatory_fee,
          tax_rate = excluded.tax_rate,
          vat_rate = excluded.vat_rate,
          additional_fee = excluded.additional_fee,
          notes = excluded.notes,
          is_default = excluded.is_default,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at;
      `);

      stmt.run([
        id,
        broker.name_ar,
        broker.name_en,
        broker.country || 'KSA / US',
        broker.currency || 'USD',
        broker.buy_commission_type || 'percentage',
        broker.buy_commission_value !== undefined ? Number(broker.buy_commission_value) : 0.15,
        broker.sell_commission_type || 'percentage',
        broker.sell_commission_value !== undefined ? Number(broker.sell_commission_value) : 0.15,
        broker.minimum_commission !== undefined ? Number(broker.minimum_commission) : 1.99,
        broker.maximum_commission !== undefined ? Number(broker.maximum_commission) : 0,
        broker.broker_fee !== undefined ? Number(broker.broker_fee) : 0,
        broker.exchange_fee !== undefined ? Number(broker.exchange_fee) : 0.005,
        broker.regulatory_fee !== undefined ? Number(broker.regulatory_fee) : 0.00278,
        broker.tax_rate !== undefined ? Number(broker.tax_rate) : 0,
        broker.vat_rate !== undefined ? Number(broker.vat_rate) : 15.0,
        broker.additional_fee !== undefined ? Number(broker.additional_fee) : 0,
        broker.notes || '',
        broker.is_default ? 1 : 0,
        broker.is_active !== undefined ? (broker.is_active ? 1 : 0) : 1,
        now,
        now,
      ]);
      stmt.free();

      this.recordAuditLog('default_user', 'UPSERT_BROKER', 'brokerage_platforms', id, JSON.stringify(broker));
      this.saveToDisk();
      return this.getBroker(id);
    } catch (err) {
      console.error('[SQLite] Error upserting broker:', err);
      return null;
    }
  }

  deleteBroker(id: string): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM brokerage_platforms WHERE id = ?;`);
      stmt.run([id]);
      stmt.free();
      this.recordAuditLog('default_user', 'DELETE_BROKER', 'brokerage_platforms', id);
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error deleting broker:', err);
      return false;
    }
  }

  setDefaultBroker(id: string): boolean {
    if (!this.db) return false;
    try {
      this.db.run(`UPDATE brokerage_platforms SET is_default = 0;`);
      const stmt = this.db.prepare(`UPDATE brokerage_platforms SET is_default = 1 WHERE id = ?;`);
      stmt.run([id]);
      stmt.free();
      this.recordAuditLog('default_user', 'SET_DEFAULT_BROKER', 'brokerage_platforms', id);
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error setting default broker:', err);
      return false;
    }
  }

  // ==========================================
  // PORTFOLIO & POSITIONS
  // ==========================================

  getPortfolioPositions(userId = 'default_user'): PortfolioPosition[] {
    if (!this.db) return [];
    try {
      const query = `
        SELECT 
          p.id, p.user_id, p.symbol, p.broker_id, p.quantity,
          p.average_buy_price, p.total_cost, p.total_fees, p.opened_at,
          p.status, p.created_at, p.updated_at,
          s.name as company_name, b.name_ar as broker_name,
          q.current_price
        FROM portfolio_positions p
        LEFT JOIN stocks s ON p.symbol = s.symbol
        LEFT JOIN brokerage_platforms b ON p.broker_id = b.id
        LEFT JOIN stock_quotes q ON p.symbol = q.symbol
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC;
      `;
      const stmt = this.db.prepare(query);
      stmt.bind([userId]);
      const results: PortfolioPosition[] = [];
      while (stmt.step()) {
        const r = stmt.get();
        const quantity = Number(r[4] || 0);
        const avgBuyPrice = Number(r[5] || 0);
        const totalCost = Number(r[6] || 0);
        const currentPrice = Number(r[14] || avgBuyPrice);
        const marketValue = quantity * currentPrice;
        const unrealizedProfit = marketValue - totalCost;
        const unrealizedProfitPercent = totalCost > 0 ? (unrealizedProfit / totalCost) * 100 : 0;

        results.push({
          id: r[0] as string,
          userId: r[1] as string,
          symbol: r[2] as string,
          brokerId: r[3] as string,
          quantity,
          averageBuyPrice: avgBuyPrice,
          totalCost,
          totalFees: Number(r[7] || 0),
          openedAt: Number(r[8] || 0),
          status: (r[9] as 'OPEN' | 'CLOSED') || 'OPEN',
          createdAt: Number(r[10] || 0),
          updatedAt: Number(r[11] || 0),
          companyName: (r[12] as string) || (r[2] as string),
          brokerName: (r[13] as string) || 'Sahm',
          currentPrice,
          marketValue,
          unrealizedProfit,
          unrealizedProfitPercent,
        });
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('[SQLite] Error getting portfolio positions:', err);
      return [];
    }
  }

  upsertPortfolioPosition(pos: {
    id?: string;
    userId?: string;
    symbol: string;
    brokerId?: string;
    quantity: number;
    averageBuyPrice: number;
    totalCost?: number;
    totalFees?: number;
    status?: 'OPEN' | 'CLOSED';
  }): PortfolioPosition | null {
    if (!this.db) return null;
    try {
      const now = Date.now();
      const id = pos.id || `pos_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const userId = pos.userId || 'default_user';
      const totalCost = pos.totalCost !== undefined ? pos.totalCost : pos.quantity * pos.averageBuyPrice;

      const stmt = this.db.prepare(`
        INSERT INTO portfolio_positions (
          id, user_id, symbol, broker_id, quantity,
          average_buy_price, total_cost, total_fees, opened_at,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          quantity = excluded.quantity,
          average_buy_price = excluded.average_buy_price,
          total_cost = excluded.total_cost,
          total_fees = excluded.total_fees,
          status = excluded.status,
          updated_at = excluded.updated_at;
      `);

      stmt.run([
        id,
        userId,
        pos.symbol.toUpperCase(),
        pos.brokerId || 'broker_sahm',
        pos.quantity,
        pos.averageBuyPrice,
        totalCost,
        pos.totalFees || 0,
        now,
        pos.status || 'OPEN',
        now,
        now,
      ]);
      stmt.free();

      this.recordAuditLog(userId, 'UPSERT_PORTFOLIO_POSITION', 'portfolio_positions', id, JSON.stringify(pos));
      this.saveToDisk();

      const positions = this.getPortfolioPositions(userId);
      return positions.find((p) => p.id === id) || null;
    } catch (err) {
      console.error('[SQLite] Error upserting portfolio position:', err);
      return null;
    }
  }

  deletePortfolioPosition(id: string, userId = 'default_user'): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`DELETE FROM portfolio_positions WHERE id = ? AND user_id = ?;`);
      stmt.run([id, userId]);
      stmt.free();
      this.recordAuditLog(userId, 'DELETE_PORTFOLIO_POSITION', 'portfolio_positions', id);
      this.saveToDisk();
      return true;
    } catch (err) {
      console.error('[SQLite] Error deleting portfolio position:', err);
      return false;
    }
  }

  // ==========================================
  // TRADES & LEDGER
  // ==========================================

  getTrades(userId = 'default_user'): TradeRecord[] {
    if (!this.db) return [];
    try {
      const query = `
        SELECT 
          t.id, t.user_id, t.symbol, t.broker_id, t.type,
          t.quantity, t.price, t.gross_amount, t.commission,
          t.broker_fee, t.exchange_fee, t.regulatory_fee,
          t.tax, t.vat, t.additional_fees, t.total_fees,
          t.net_amount, t.executed_at, b.name_ar as broker_name
        FROM trades t
        LEFT JOIN brokerage_platforms b ON t.broker_id = b.id
        WHERE t.user_id = ?
        ORDER BY t.executed_at DESC
        LIMIT 500;
      `;
      const stmt = this.db.prepare(query);
      stmt.bind([userId]);
      const results: TradeRecord[] = [];
      while (stmt.step()) {
        const r = stmt.get();
        results.push({
          id: r[0] as string,
          userId: r[1] as string,
          symbol: r[2] as string,
          brokerId: r[3] as string,
          type: r[4] as 'BUY' | 'SELL',
          quantity: Number(r[5] || 0),
          price: Number(r[6] || 0),
          grossAmount: Number(r[7] || 0),
          commission: Number(r[8] || 0),
          brokerFee: Number(r[9] || 0),
          exchangeFee: Number(r[10] || 0),
          regulatoryFee: Number(r[11] || 0),
          tax: Number(r[12] || 0),
          vat: Number(r[13] || 0),
          additionalFees: Number(r[14] || 0),
          totalFees: Number(r[15] || 0),
          netAmount: Number(r[16] || 0),
          executedAt: Number(r[17] || 0),
          brokerName: (r[18] as string) || 'Sahm',
        });
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('[SQLite] Error getting trades:', err);
      return [];
    }
  }

  addTrade(trade: Omit<TradeRecord, 'id'>): TradeRecord | null {
    if (!this.db) return null;
    try {
      const now = trade.executedAt || Date.now();
      const id = `trade_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const userId = trade.userId || 'default_user';

      const stmt = this.db.prepare(`
        INSERT INTO trades (
          id, user_id, symbol, broker_id, type,
          quantity, price, gross_amount, commission,
          broker_fee, exchange_fee, regulatory_fee,
          tax, vat, additional_fees, total_fees,
          net_amount, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      stmt.run([
        id,
        userId,
        trade.symbol.toUpperCase(),
        trade.brokerId || 'broker_sahm',
        trade.type,
        trade.quantity,
        trade.price,
        trade.grossAmount,
        trade.commission || 0,
        trade.brokerFee || 0,
        trade.exchangeFee || 0,
        trade.regulatoryFee || 0,
        trade.tax || 0,
        trade.vat || 0,
        trade.additionalFees || 0,
        trade.totalFees || 0,
        trade.netAmount,
        now,
      ]);
      stmt.free();

      this.recordAuditLog(userId, 'CREATE_TRADE', 'trades', id, JSON.stringify(trade));
      this.saveToDisk();

      return {
        id,
        userId,
        ...trade,
        executedAt: now,
      };
    } catch (err) {
      console.error('[SQLite] Error adding trade:', err);
      return null;
    }
  }

  // ==========================================
  // USER SETTINGS & AUDIT LOGS
  // ==========================================

  getUserSettings(): Record<string, string> {
    if (!this.db) return {};
    try {
      const res = this.db.exec(`SELECT key, value FROM user_settings;`);
      if (!res || res.length === 0) return {};
      const settings: Record<string, string> = {};
      for (const row of res[0].values) {
        settings[row[0] as string] = row[1] as string;
      }
      return settings;
    } catch {
      return {};
    }
  }

  updateUserSetting(key: string, value: string): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
      `);
      stmt.run([key, value, Date.now()]);
      stmt.free();
      this.saveToDisk();
      return true;
    } catch {
      return false;
    }
  }

  recordAuditLog(userId: string, action: string, entity: string, entityId?: string, metadata?: string): void {
    if (!this.db) return;
    try {
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity, entity_id, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `);
      stmt.run([id, userId, action, entity, entityId || null, Date.now(), metadata || null]);
      stmt.free();
    } catch (err) {
      console.error('[SQLite] Failed to record audit log:', err);
    }
  }

  getAuditLogs(limit = 100): any[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT id, user_id, action, entity, entity_id, timestamp, metadata
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT ${limit};
      `);
      if (!res || res.length === 0) return [];
      return res[0].values.map((r: any[]) => ({
        id: r[0],
        userId: r[1],
        action: r[2],
        entity: r[3],
        entityId: r[4],
        timestamp: r[5],
        metadata: r[6],
      }));
    } catch {
      return [];
    }
  }

  recordImportJob(filename: string, fileType: string, importedRows: number, successfulRows: number, failedRows: number): void {
    if (!this.db) return;
    try {
      const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stmt = this.db.prepare(`
        INSERT INTO import_jobs (id, user_id, filename, file_type, imported_rows, successful_rows, failed_rows, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);
      stmt.run([id, 'default_user', filename, fileType, importedRows, successfulRows, failedRows, Date.now()]);
      stmt.free();
    } catch (err) {
      console.error('[SQLite] Failed to record import job:', err);
    }
  }

  getImportJobs(limit = 20): any[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec(`
        SELECT id, filename, file_type, imported_rows, successful_rows, failed_rows, imported_at
        FROM import_jobs
        ORDER BY imported_at DESC
        LIMIT ${limit};
      `);
      if (!res || res.length === 0) return [];
      return res[0].values.map((r: any[]) => ({
        id: r[0],
        filename: r[1],
        fileType: r[2],
        importedRows: r[3],
        successfulRows: r[4],
        failedRows: r[5],
        importedAt: r[6],
      }));
    } catch {
      return [];
    }
  }

  // ==========================================
  // ALERT HISTORY
  // ==========================================

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
    } catch {
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
    } catch {
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
    } catch {
      return false;
    }
  }

  clearAlertHistory(): boolean {
    if (!this.db) return false;
    try {
      this.db.run(`DELETE FROM alert_history;`);
      this.saveToDisk();
      return true;
    } catch {
      return false;
    }
  }

  // Compatibility helper
  getAllStocks(): SqliteStockRecord[] {
    const items = this.getWatchlist();
    return items.map((w) => ({
      symbol: w.symbol,
      name: w.companyName,
      sector: w.sector,
      exchange: w.exchange,
      price: w.price,
      upperAlert: w.upperAlert,
      lowerAlert: w.lowerAlert,
      alertsEnabled: w.alertsEnabled,
      buyPrice: w.buyPrice,
      shares: w.shares,
      brokerId: w.brokerId,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  getStock(symbol: string): SqliteStockRecord | null {
    const items = this.getWatchlist();
    const found = items.find((i) => i.symbol.toUpperCase() === symbol.toUpperCase());
    if (!found) return null;
    return {
      symbol: found.symbol,
      name: found.companyName,
      sector: found.sector,
      exchange: found.exchange,
      price: found.price,
      upperAlert: found.upperAlert,
      lowerAlert: found.lowerAlert,
      alertsEnabled: found.alertsEnabled,
      buyPrice: found.buyPrice,
      shares: found.shares,
      brokerId: found.brokerId,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  upsertStock(stock: any): boolean {
    return this.addOrUpdateWatchlistItem(stock);
  }

  deleteStock(symbol: string): boolean {
    return this.deleteWatchlistItem(symbol);
  }

  clearAllStocks(): boolean {
    return this.clearWatchlist();
  }

  syncAllStocks(stocks: any[]): { success: boolean; count: number; timestamp: number } {
    if (!this.db) return { success: false, count: 0, timestamp: Date.now() };
    try {
      this.clearWatchlist();
      let count = 0;
      for (const s of stocks) {
        if (s && s.symbol) {
          this.addOrUpdateWatchlistItem(s);
          count++;
        }
      }
      return { success: true, count, timestamp: Date.now() };
    } catch {
      return { success: false, count: 0, timestamp: Date.now() };
    }
  }

  getStatus(): { initialized: boolean; totalStocks: number; totalAlerts: number; totalBrokers: number; dbPath: string } {
    if (!this.db) {
      return { initialized: false, totalStocks: 0, totalAlerts: 0, totalBrokers: 0, dbPath: this.dbPath };
    }
    try {
      const stockRes = this.db.exec(`SELECT COUNT(*) FROM watchlist_items;`);
      const alertRes = this.db.exec(`SELECT COUNT(*) FROM alert_history;`);
      const brokerRes = this.db.exec(`SELECT COUNT(*) FROM brokerage_platforms;`);
      const totalStocks = Number(stockRes[0]?.values[0]?.[0] || 0);
      const totalAlerts = Number(alertRes[0]?.values[0]?.[0] || 0);
      const totalBrokers = Number(brokerRes[0]?.values[0]?.[0] || 0);
      return {
        initialized: true,
        totalStocks,
        totalAlerts,
        totalBrokers,
        dbPath: this.dbPath,
      };
    } catch {
      return { initialized: true, totalStocks: 0, totalAlerts: 0, totalBrokers: 0, dbPath: this.dbPath };
    }
  }
}

export const sqliteDb = new SqliteDatabase();
