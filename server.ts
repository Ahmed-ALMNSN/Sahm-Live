import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { marketService } from './server/src/services/MarketService.js';
import { analysisService } from './server/src/services/AnalysisService.js';
import { sqliteDb } from './server/src/database/sqlite.js';
import { TradingCalculationService } from './server/src/services/TradingCalculationService.js';

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
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Rate Limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
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

  // --- HEALTH & STATUS ---
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'sahm-live-stock-monitor',
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  });

  app.get('/api/sqlite/status', (req: Request, res: Response) => {
    try {
      const status = sqliteDb.getStatus();
      res.json({ success: true, database: 'SQLite (sql.js / sahm_stocks.sqlite)', ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SQLITE_STATUS_ERROR', message: err.message } });
    }
  });

  // --- MARKET DATA & REAL-TIME QUOTES ---

  // Single Quote (Support both /api/quote/:symbol and /api/stocks/:symbol/quote)
  const handleSingleQuote = async (req: Request, res: Response) => {
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

      // Upsert to DB
      sqliteDb.upsertStockQuote(quote);

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
  };

  app.get('/api/quote/:symbol', handleSingleQuote);
  app.get('/api/stocks/:symbol/quote', handleSingleQuote);

  // Batch Quotes (and sync into SQLite DB)
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
        return res.json({ quotes: [], count: 0 });
      }

      const cleanSymbols = symbols
        .map((s) => (typeof s === 'string' ? s.trim().toUpperCase() : ''))
        .filter(Boolean)
        .slice(0, 150);

      const quotesMap = await marketService.getQuotes(cleanSymbols);
      const quotesArray = Object.values(quotesMap);

      // Persist all latest fetched quotes to DB
      if (quotesArray.length > 0) {
        sqliteDb.upsertBatchStockQuotes(quotesArray);
      }

      res.json({
        quotes: quotesArray,
        count: quotesArray.length,
        requestedCount: cleanSymbols.length,
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

  // Scientific Stock Analysis
  const handleAnalysis = async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.trim().toUpperCase();
      if (!symbol || !/^[A-Z0-9.\-=]+$/.test(symbol)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SYMBOL', message: 'Valid stock symbol required' },
        });
      }

      const analysisData = await analysisService.getFullAnalysisData(symbol);
      if (!analysisData) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_AVAILABLE', message: `Analysis data unavailable for ${symbol}` },
        });
      }

      res.json({ success: true, data: analysisData });
    } catch (err: any) {
      console.error(`Error in analysis for ${req.params.symbol}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'ANALYSIS_SERVER_ERROR', message: 'Failed to generate scientific stock analysis' },
      });
    }
  };

  app.get('/api/analysis/:symbol', handleAnalysis);
  app.get('/api/stocks/:symbol/analysis', handleAnalysis);

  // --- WATCHLIST & STOCKS CRUD (DB AS SINGLE SOURCE OF TRUTH) ---

  // Get current watchlist (Returns items from SQLite)
  app.get('/api/watchlist', (req: Request, res: Response) => {
    try {
      const items = sqliteDb.getWatchlist();
      const defaultBroker = sqliteDb.getDefaultBroker();
      const brokers = sqliteDb.getAllBrokers();
      const brokerMap = new Map(brokers.map(b => [b.id, b]));

      // Format items with calculated position data
      const enriched = items.map((item) => {
        const broker = brokerMap.get(item.brokerId) || defaultBroker;
        let calculated = {};
        if (item.buyPrice && item.shares && item.shares > 0) {
          const calc = TradingCalculationService.calculate({
            symbol: item.symbol,
            buyPrice: item.buyPrice,
            shares: item.shares,
            currentPrice: item.price || item.buyPrice,
            broker,
          });
          calculated = {
            costBasis: calc.totalCost,
            currentValue: calc.grossSellAmount,
            grossProfit: calc.grossProfit,
            netProfit: calc.netProfit,
            profitPercent: calc.profitPercent,
            totalFees: calc.totalFees,
            breakEvenPrice: calc.breakEvenPrice,
          };
        }
        return {
          ...item,
          ...calculated,
        };
      });

      res.json({
        success: true,
        count: enriched.length,
        items: enriched,
        stocks: enriched, // For compatibility
        watchlist: enriched.map((i) => i.symbol),
      });
    } catch (err: any) {
      console.error('Error fetching watchlist:', err);
      res.status(500).json({ success: false, error: { code: 'WATCHLIST_FETCH_ERROR', message: err.message } });
    }
  });

  // Add or update single stock in watchlist
  app.post('/api/watchlist', (req: Request, res: Response) => {
    try {
      const { symbol, companyName, sector, exchange, industry, upperAlert, lowerAlert, alertsEnabled, buyPrice, shares, brokerId } = req.body;
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SYMBOL', message: 'Valid symbol required' } });
      }

      const cleanSymbol = symbol.trim().toUpperCase();
      const success = sqliteDb.addOrUpdateWatchlistItem({
        symbol: cleanSymbol,
        companyName,
        sector,
        exchange,
        industry,
        upperAlert: upperAlert !== undefined ? (upperAlert === null ? null : Number(upperAlert)) : undefined,
        lowerAlert: lowerAlert !== undefined ? (lowerAlert === null ? null : Number(lowerAlert)) : undefined,
        alertsEnabled: alertsEnabled !== undefined ? Boolean(alertsEnabled) : true,
        buyPrice: buyPrice !== undefined ? (buyPrice === null ? null : Number(buyPrice)) : undefined,
        shares: shares !== undefined ? (shares === null ? null : Number(shares)) : undefined,
        brokerId,
      });

      res.json({ success, symbol: cleanSymbol });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'WATCHLIST_SAVE_ERROR', message: err.message } });
    }
  });

  // Batch add/update watchlist
  app.post('/api/watchlist/bulk', (req: Request, res: Response) => {
    try {
      const { stocks } = req.body;
      if (!Array.isArray(stocks)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'stocks array expected' } });
      }

      let count = 0;
      for (const s of stocks) {
        if (s && s.symbol) {
          sqliteDb.addOrUpdateWatchlistItem(s);
          count++;
        }
      }
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'WATCHLIST_BULK_ERROR', message: err.message } });
    }
  });

  // Import Watchlist with Job Audit
  app.post('/api/watchlist/import', (req: Request, res: Response) => {
    try {
      const { stocks, filename, fileType } = req.body;
      if (!Array.isArray(stocks)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'stocks array required' } });
      }

      const result = sqliteDb.importWatchlistStocks(stocks, filename || 'import.csv', fileType || 'csv');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'IMPORT_ERROR', message: err.message } });
    }
  });

  // Delete single stock from watchlist permanently
  app.delete('/api/watchlist/:symbol', (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol?.trim().toUpperCase();
      const success = sqliteDb.deleteWatchlistItem(symbol);
      res.json({ success, symbol, message: `Stock ${symbol} permanently deleted from database` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message } });
    }
  });

  // Clear all stocks from watchlist permanently
  app.delete('/api/watchlist', (req: Request, res: Response) => {
    try {
      const success = sqliteDb.clearWatchlist();
      res.json({ success, message: 'All stocks permanently deleted from database' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CLEAR_ERROR', message: err.message } });
    }
  });

  // Clear all alerts from watchlist items (reset upper and lower alerts to null)
  const handleClearAlerts = (req: Request, res: Response) => {
    try {
      const success = sqliteDb.clearAllAlerts();
      res.json({ success, message: 'All alert thresholds cleared and reset to null/zero' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CLEAR_ALERTS_ERROR', message: err.message } });
    }
  };

  app.post('/api/watchlist/clear-alerts', handleClearAlerts);
  app.delete('/api/watchlist/alerts', handleClearAlerts);
  app.post('/api/stocks/clear-alerts', handleClearAlerts);

  // Compatibility routes for /api/stocks
  app.get('/api/stocks', (req: Request, res: Response) => {
    const items = sqliteDb.getWatchlist();
    res.json({ success: true, count: items.length, stocks: items });
  });

  app.post('/api/stocks', (req: Request, res: Response) => {
    const success = sqliteDb.addOrUpdateWatchlistItem(req.body);
    res.json({ success, symbol: req.body.symbol?.toUpperCase() });
  });

  app.post(['/api/stocks/sync', '/api/stocks/save-all'], (req: Request, res: Response) => {
    const { stocks } = req.body;
    if (!Array.isArray(stocks)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'stocks array expected' } });
    }
    const result = sqliteDb.syncAllStocks(stocks);
    res.json({
      success: result.success,
      count: result.count,
      timestamp: result.timestamp,
      message: 'All stocks committed to SQLite successfully',
    });
  });

  app.delete('/api/stocks/:symbol', (req: Request, res: Response) => {
    const success = sqliteDb.deleteWatchlistItem(req.params.symbol);
    res.json({ success, symbol: req.params.symbol?.toUpperCase() });
  });

  app.delete('/api/stocks', (req: Request, res: Response) => {
    const success = sqliteDb.clearWatchlist();
    res.json({ success, message: 'All stocks cleared' });
  });

  // --- BROKERAGE PLATFORMS ---

  app.get('/api/brokers', (req: Request, res: Response) => {
    try {
      const brokers = sqliteDb.getAllBrokers();
      const defaultBroker = sqliteDb.getDefaultBroker();
      res.json({ success: true, count: brokers.length, brokers, defaultBroker });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_FETCH_ERROR', message: err.message } });
    }
  });

  app.get('/api/brokers/:id', (req: Request, res: Response) => {
    try {
      const broker = sqliteDb.getBroker(req.params.id);
      if (!broker) {
        return res.status(404).json({ success: false, error: { code: 'BROKER_NOT_FOUND', message: 'Broker not found' } });
      }
      res.json({ success: true, broker });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_FETCH_ERROR', message: err.message } });
    }
  });

  app.post('/api/brokers', (req: Request, res: Response) => {
    try {
      const broker = sqliteDb.upsertBroker(req.body);
      if (!broker) {
        return res.status(400).json({ success: false, error: { code: 'BROKER_CREATE_ERROR', message: 'Failed to create broker' } });
      }
      res.json({ success: true, broker });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_CREATE_ERROR', message: err.message } });
    }
  });

  app.put('/api/brokers/:id', (req: Request, res: Response) => {
    try {
      const broker = sqliteDb.upsertBroker({ ...req.body, id: req.params.id });
      if (!broker) {
        return res.status(400).json({ success: false, error: { code: 'BROKER_UPDATE_ERROR', message: 'Failed to update broker' } });
      }
      res.json({ success: true, broker });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_UPDATE_ERROR', message: err.message } });
    }
  });

  app.delete('/api/brokers/:id', (req: Request, res: Response) => {
    try {
      const success = sqliteDb.deleteBroker(req.params.id);
      res.json({ success, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_DELETE_ERROR', message: err.message } });
    }
  });

  app.post('/api/brokers/:id/default', (req: Request, res: Response) => {
    try {
      const success = sqliteDb.setDefaultBroker(req.params.id);
      res.json({ success, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BROKER_DEFAULT_ERROR', message: err.message } });
    }
  });

  // --- TRADING CALCULATOR API ---

  app.post('/api/trading/calculate', (req: Request, res: Response) => {
    try {
      const {
        symbol,
        buyPrice,
        shares,
        sellPrice,
        currentPrice,
        brokerId,
        broker,
        customBuyCommission,
        customSellCommission,
        customTaxRate,
        customVatRate,
        customAdditionalFees,
      } = req.body;

      let selectedBroker = broker;
      if (!selectedBroker) {
        if (brokerId) {
          selectedBroker = sqliteDb.getBroker(brokerId);
        }
        if (!selectedBroker) {
          selectedBroker = sqliteDb.getDefaultBroker();
        }
      }

      const result = TradingCalculationService.calculate({
        symbol: symbol || '',
        buyPrice: Number(buyPrice || 0),
        shares: Number(shares || 0),
        sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
        currentPrice: currentPrice !== undefined ? Number(currentPrice) : undefined,
        broker: selectedBroker,
        customBuyCommission: customBuyCommission !== undefined ? Number(customBuyCommission) : undefined,
        customSellCommission: customSellCommission !== undefined ? Number(customSellCommission) : undefined,
        customTaxRate: customTaxRate !== undefined ? Number(customTaxRate) : undefined,
        customVatRate: customVatRate !== undefined ? Number(customVatRate) : undefined,
        customAdditionalFees: customAdditionalFees !== undefined ? Number(customAdditionalFees) : undefined,
      });

      res.json({ success: true, result });
    } catch (err: any) {
      console.error('Calculation error:', err);
      res.status(500).json({ success: false, error: { code: 'CALCULATION_ERROR', message: err.message } });
    }
  });

  // --- PORTFOLIO POSITIONS ---

  app.get('/api/portfolio/positions', (req: Request, res: Response) => {
    try {
      const positions = sqliteDb.getPortfolioPositions();
      res.json({ success: true, count: positions.length, positions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PORTFOLIO_ERROR', message: err.message } });
    }
  });

  app.post('/api/portfolio/positions', (req: Request, res: Response) => {
    try {
      const pos = sqliteDb.upsertPortfolioPosition(req.body);
      res.json({ success: Boolean(pos), position: pos });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PORTFOLIO_SAVE_ERROR', message: err.message } });
    }
  });

  app.put('/api/portfolio/positions/:id', (req: Request, res: Response) => {
    try {
      const pos = sqliteDb.upsertPortfolioPosition({ ...req.body, id: req.params.id });
      res.json({ success: Boolean(pos), position: pos });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PORTFOLIO_UPDATE_ERROR', message: err.message } });
    }
  });

  app.delete('/api/portfolio/positions/:id', (req: Request, res: Response) => {
    try {
      const success = sqliteDb.deletePortfolioPosition(req.params.id);
      res.json({ success, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PORTFOLIO_DELETE_ERROR', message: err.message } });
    }
  });

  // --- TRADES LEDGER ---

  app.get('/api/trades', (req: Request, res: Response) => {
    try {
      const trades = sqliteDb.getTrades();
      res.json({ success: true, count: trades.length, trades });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'TRADES_ERROR', message: err.message } });
    }
  });

  app.post('/api/trades', (req: Request, res: Response) => {
    try {
      const trade = sqliteDb.addTrade(req.body);
      res.json({ success: Boolean(trade), trade });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'TRADE_ADD_ERROR', message: err.message } });
    }
  });

  // --- SETTINGS & AUDIT LOGS ---

  app.get('/api/settings', (req: Request, res: Response) => {
    try {
      const settings = sqliteDb.getUserSettings();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SETTINGS_ERROR', message: err.message } });
    }
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    try {
      const entries = req.body;
      if (typeof entries === 'object' && entries !== null) {
        for (const [k, v] of Object.entries(entries)) {
          sqliteDb.updateUserSetting(k, String(v));
        }
      }
      res.json({ success: true, settings: sqliteDb.getUserSettings() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SETTINGS_SAVE_ERROR', message: err.message } });
    }
  });

  app.get('/api/audit-logs', (req: Request, res: Response) => {
    try {
      const logs = sqliteDb.getAuditLogs();
      res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUDIT_LOG_ERROR', message: err.message } });
    }
  });

  app.get('/api/import-jobs', (req: Request, res: Response) => {
    try {
      const jobs = sqliteDb.getImportJobs();
      res.json({ success: true, count: jobs.length, jobs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'IMPORT_JOBS_ERROR', message: err.message } });
    }
  });

  // --- ALERT HISTORY ---

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

  // Global Error Handler
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
    console.log(`Sahm Live Stock Monitor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
