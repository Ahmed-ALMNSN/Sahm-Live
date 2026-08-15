import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { marketService } from './server/src/services/MarketService.js';
import { appStorage } from './server/src/database/storage.js';
import { sqliteDb } from './server/src/database/sqlite.js';

async function startServer() {
  // Initialize SQLite Database
  await sqliteDb.init();

  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Trust proxy for reverse proxy environments (Cloud Run / Nginx)
  app.set('trust proxy', 1);

  // Security Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Don't interfere with Vite scripts, external fonts, charts in development
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate Limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 600, // Limit each IP to 600 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false,
    },
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down.',
      },
    },
  });

  app.use('/api', apiLimiter);

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'sahm-live-stock-monitor',
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  });

  // Single Quote
  app.get('/api/quote/:symbol', async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.trim().toUpperCase();
      if (!symbol || !/^[A-Z0-9.\-=]+$/.test(symbol)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SYMBOL',
            message: 'Invalid stock symbol format',
          },
        });
      }

      const quote = await marketService.getQuote(symbol);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STOCK_NOT_FOUND',
            message: `Market data unavailable for symbol ${symbol}`,
          },
        });
      }

      res.json(quote);
    } catch (err: any) {
      console.error('Error fetching single quote:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to retrieve stock quote',
        },
      });
    }
  });

  // Batch Quotes
  app.post('/api/quotes/batch', async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      if (!Array.isArray(symbols)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Body must contain a "symbols" array of ticker strings',
          },
        });
      }

      if (symbols.length === 0) {
        return res.json({ quotes: [] });
      }

      if (symbols.length > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BATCH_LIMIT_EXCEEDED',
            message: 'Max 100 symbols allowed per batch request',
          },
        });
      }

      const quotesMap = await marketService.getQuotes(symbols);
      const quotesArray = Object.values(quotesMap);

      res.json({
        quotes: quotesArray,
        count: quotesArray.length,
        requestedCount: symbols.length,
      });
    } catch (err: any) {
      console.error('Error fetching batch quotes:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_FETCH_FAILED',
          message: 'Failed to retrieve batch stock quotes',
        },
      });
    }
  });

  // Historical Chart Data
  app.get('/api/chart/:symbol', async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.trim().toUpperCase();
      const range = (req.query.range as string) || '1M';
      const interval = (req.query.interval as string) || '1d';

      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SYMBOL', message: 'Symbol is required' },
        });
      }

      const chartData = await marketService.getChart(symbol, range, interval);
      res.json({
        symbol,
        range,
        data: chartData,
      });
    } catch (err: any) {
      console.error('Error fetching chart:', err);
      res.status(500).json({
        success: false,
        error: { code: 'CHART_FETCH_ERROR', message: 'Failed to fetch historical chart data' },
      });
    }
  });

  // Company Profile
  app.get('/api/profile/:symbol', async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.trim().toUpperCase();
      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SYMBOL', message: 'Symbol is required' },
        });
      }

      const profile = await marketService.getCompanyProfile(symbol);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: `Profile not found for ${symbol}` },
        });
      }

      res.json(profile);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      res.status(500).json({
        success: false,
        error: { code: 'PROFILE_FETCH_ERROR', message: 'Failed to fetch company profile' },
      });
    }
  });

  // --- SQLite Stock & Database Endpoints ---

  // Get all stocks stored in SQLite (containing symbol, name, sector, exchange, alerts)
  app.get('/api/stocks', (req: Request, res: Response) => {
    try {
      const stocks = sqliteDb.getAllStocks();
      res.json({ success: true, count: stocks.length, stocks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_GET_ERROR', message: err.message } });
    }
  });

  // Get single stock from SQLite
  app.get('/api/stocks/:symbol', (req: Request, res: Response) => {
    try {
      const stock = sqliteDb.getStock(req.params.symbol);
      if (!stock) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stock not found in SQLite database' } });
      }
      res.json({ success: true, stock });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_GET_ERROR', message: err.message } });
    }
  });

  // Create or Update stock in SQLite
  app.post('/api/stocks', (req: Request, res: Response) => {
    try {
      const { symbol, name, sector, exchange, price, upperAlert, lowerAlert, alertsEnabled } = req.body;
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SYMBOL', message: 'Valid symbol required' } });
      }

      const success = sqliteDb.upsertStock({
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        sector: sector || 'General',
        exchange: exchange || 'US',
        price: price !== undefined ? Number(price) : undefined,
        upperAlert: upperAlert !== undefined ? (upperAlert === null ? null : Number(upperAlert)) : undefined,
        lowerAlert: lowerAlert !== undefined ? (lowerAlert === null ? null : Number(lowerAlert)) : undefined,
        alertsEnabled: alertsEnabled !== undefined ? Boolean(alertsEnabled) : true,
      });

      res.json({ success, symbol: symbol.toUpperCase() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_SAVE_ERROR', message: err.message } });
    }
  });

  // Bulk save stocks to SQLite (from file upload / initial sync)
  app.post('/api/stocks/bulk', (req: Request, res: Response) => {
    try {
      const { stocks } = req.body;
      if (!Array.isArray(stocks)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'stocks array expected' } });
      }

      let insertedCount = 0;
      for (const s of stocks) {
        if (s && s.symbol) {
          sqliteDb.upsertStock({
            symbol: s.symbol.toUpperCase(),
            name: s.companyName || s.name || s.symbol,
            sector: s.sector || 'General',
            exchange: s.exchange || 'US',
            price: s.price !== undefined ? Number(s.price) : undefined,
            upperAlert: s.upperAlert !== undefined ? (s.upperAlert === null ? null : Number(s.upperAlert)) : undefined,
            lowerAlert: s.lowerAlert !== undefined ? (s.lowerAlert === null ? null : Number(s.lowerAlert)) : undefined,
            alertsEnabled: s.alertsEnabled !== undefined ? Boolean(s.alertsEnabled) : true,
          });
          insertedCount++;
        }
      }

      res.json({ success: true, count: insertedCount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_BULK_ERROR', message: err.message } });
    }
  });

  // Delete single stock from SQLite (Permanent deletion)
  app.delete('/api/stocks/:symbol', (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.toUpperCase();
      const success = sqliteDb.deleteStock(symbol);
      res.json({ success, symbol });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_DELETE_ERROR', message: err.message } });
    }
  });

  // Delete all stocks from SQLite (Permanent deletion)
  app.delete('/api/stocks', (req: Request, res: Response) => {
    try {
      const success = sqliteDb.clearAllStocks();
      res.json({ success, message: 'All stocks permanently deleted from SQLite' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_CLEAR_ERROR', message: err.message } });
    }
  });

  // SQLite Status and Metadata
  app.get('/api/sqlite/status', (req: Request, res: Response) => {
    try {
      const status = sqliteDb.getStatus();
      res.json({ success: true, database: 'SQLite (sql.js / sahm_stocks.sqlite)', ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_STATUS_ERROR', message: err.message } });
    }
  });

  // Alert History Endpoints (backed by SQLite)
  app.get('/api/alerts/history', (req: Request, res: Response) => {
    const history = sqliteDb.getAlertHistory();
    res.json({ history });
  });

  app.post('/api/alerts/history', (req: Request, res: Response) => {
    const { symbol, companyName, type, targetPrice, triggeredPrice } = req.body;
    if (!symbol || !type || targetPrice === undefined || triggeredPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ALERT_RECORD', message: 'Missing required alert history fields' },
      });
    }

    const item = sqliteDb.addAlertHistory({
      symbol: symbol.toUpperCase(),
      companyName,
      type,
      targetPrice: Number(targetPrice),
      triggeredPrice: Number(triggeredPrice),
    });

    res.json({ success: true, item });
  });

  app.delete('/api/alerts/history/:id', (req: Request, res: Response) => {
    const deleted = sqliteDb.deleteAlertHistory(req.params.id);
    res.json({ success: deleted });
  });

  app.delete('/api/alerts/history', (req: Request, res: Response) => {
    const cleared = sqliteDb.clearAlertHistory();
    res.json({ success: cleared });
  });

  // Watchlist Endpoints
  app.get('/api/watchlist', (req: Request, res: Response) => {
    const stocks = sqliteDb.getAllStocks();
    const watchlist = stocks.map(s => s.symbol);
    res.json({ watchlist, stocks });
  });

  app.post('/api/watchlist', (req: Request, res: Response) => {
    const { symbols } = req.body;
    if (Array.isArray(symbols)) {
      for (const sym of symbols) {
        if (sym) {
          sqliteDb.upsertStock({
            symbol: sym.trim().toUpperCase(),
            name: sym.trim().toUpperCase(),
            sector: 'General',
          });
        }
      }
      res.json({ success: true, count: symbols.length });
    } else {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_WATCHLIST', message: 'symbols array expected' },
      });
    }
  });

  // Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isProd ? 'An unexpected error occurred' : err.message,
      },
    });
  });

  // --- Client Serving / Vite Middleware ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sahm Live Stock Monitor server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
