import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Language, 
  Theme, 
  StockItem, 
  AlertNotification, 
  AlertHistoryItem, 
  ParsedStockData 
} from './types.js';
import { getTranslation } from './i18n/index.js';
import { Navbar } from './components/Navbar.js';
import { KpiCards } from './components/KpiCards.js';
import { LiveStockTable } from './components/LiveStockTable.js';
import { FileUploadModal } from './components/FileUploadModal.js';
import { AddStockModal } from './components/AddStockModal.js';
import { StockDetailsModal } from './components/StockDetailsModal.js';
import { AlertHistoryDrawer } from './components/AlertHistoryDrawer.js';
import { AlertNotificationBanner } from './components/AlertNotificationBanner.js';
import { StockReportModal } from './components/StockReportModal.js';
import { alertEngine } from './utils/alertEngine.js';
import { apiService } from './services/api.js';

const DEFAULT_STOCKS: StockItem[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 245.00,
    lowerAlert: 215.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    sector: 'Technology',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 540.00,
    lowerAlert: 470.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Semiconductors',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 160.00,
    lowerAlert: 120.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com Inc.',
    sector: 'Consumer Cyclical',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 235.00,
    lowerAlert: 195.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    sector: 'Communication Services',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 215.00,
    lowerAlert: 175.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla Inc.',
    sector: 'Automotive',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 320.00,
    lowerAlert: 240.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'META',
    companyName: 'Meta Platforms Inc.',
    sector: 'Communication Services',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 680.00,
    lowerAlert: 580.00,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'ABEV',
    companyName: 'Ambev S.A.',
    sector: 'Consumer Staples',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 3.50,
    lowerAlert: 2.60,
    alertsEnabled: true,
    lastUpdated: 0,
  },
  {
    symbol: 'GRAB',
    companyName: 'Grab Holdings',
    sector: 'Technology',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    previousClose: 0,
    dayHigh: 0,
    dayLow: 0,
    volume: 0,
    upperAlert: 4.60,
    lowerAlert: 3.20,
    alertsEnabled: true,
    lastUpdated: 0,
  }
];

export default function App() {
  // 1. Language state
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('sahm_lang') as Language) || 'ar';
  });

  // 2. Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('sahm_theme') as Theme) || 'dark';
  });

  // 3. Stocks watchlist state
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem('sahm_watchlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_STOCKS;
  });

  // 4. Alert History & Toasts
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [activeToasts, setActiveToasts] = useState<AlertNotification[]>([]);
  const [triggeredCountToday, setTriggeredCountToday] = useState(0);
  const [actionToast, setActionToast] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // 5. Refresh Interval & Timing
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('sahm_refresh_interval');
    return saved ? parseInt(saved, 10) : 5000;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number | null>(null);

  // 6. Notifications permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    alertEngine.getNotificationPermission()
  );

  // 7. Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  // Ref lock to prevent overlapping quote batches
  const isFetchingRef = useRef(false);
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  const t = getTranslation(lang);

  // Sync Language and Direction on DOM
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('sahm_lang', lang);
  }, [lang]);

  // Sync Theme on DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sahm_theme', theme);
  }, [theme]);

  // Sync Watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('sahm_watchlist', JSON.stringify(stocks));
  }, [stocks]);

  // Save refresh interval
  useEffect(() => {
    localStorage.setItem('sahm_refresh_interval', refreshInterval.toString());
  }, [refreshInterval]);

  // Initial load: Fetch stocks & alert history from SQLite backend
  useEffect(() => {
    // Load stocks from SQLite
    apiService.fetchSqliteStocks().then((sqliteStocks) => {
      if (Array.isArray(sqliteStocks) && sqliteStocks.length > 0) {
        setStocks(prev => {
          const map = new Map<string, StockItem>(prev.map(p => [p.symbol, p]));
          const merged: StockItem[] = sqliteStocks.map((s: any) => {
            const existing = map.get(s.symbol);
            return {
              symbol: s.symbol,
              companyName: s.name || existing?.companyName || s.symbol,
              sector: s.sector || existing?.sector || 'General',
              exchange: s.exchange || existing?.exchange || 'US',
              price: existing?.price || s.price || 0,
              change: existing?.change || 0,
              changePercent: existing?.changePercent || 0,
              open: existing?.open || 0,
              previousClose: existing?.previousClose || 0,
              dayHigh: existing?.dayHigh || 0,
              dayLow: existing?.dayLow || 0,
              volume: existing?.volume || 0,
              upperAlert: s.upperAlert !== undefined ? s.upperAlert : (existing?.upperAlert ?? null),
              lowerAlert: s.lowerAlert !== undefined ? s.lowerAlert : (existing?.lowerAlert ?? null),
              alertsEnabled: s.alertsEnabled !== undefined ? Boolean(s.alertsEnabled) : (existing?.alertsEnabled ?? true),
              lastUpdated: existing?.lastUpdated || 0,
            };
          });
          return merged;
        });
      }
    });

    // Load alert history from SQLite
    apiService.fetchAlertHistory().then((hist) => {
      if (Array.isArray(hist)) {
        setAlertHistory(hist);
        const todayStr = new Date().toDateString();
        const countToday = hist.filter(h => new Date(h.timestamp).toDateString() === todayStr).length;
        setTriggeredCountToday(countToday);
      }
    });
  }, []);

  // Request browser notification permission
  const handleRequestNotifications = async () => {
    const perm = await alertEngine.requestNotificationPermission();
    setNotificationPermission(perm);
  };

  // Main Market Data Fetch Function
  const fetchMarketQuotes = useCallback(async () => {
    if (isFetchingRef.current) return;
    const currentList = stocksRef.current;
    if (!currentList || currentList.length === 0) return;

    isFetchingRef.current = true;
    setIsRefreshing(true);

    try {
      const symbols = currentList.map(s => s.symbol);
      const quotesMap = await apiService.fetchBatchQuotes(symbols);

      const newTriggeredAlerts: AlertNotification[] = [];
      const updatedList = currentList.map(item => {
        const quote = quotesMap[item.symbol.toUpperCase()];
        if (!quote) return item;

        // Check if price flashed
        let flash: 'up' | 'down' | null = null;
        if (item.price > 0 && quote.price !== item.price) {
          flash = quote.price > item.price ? 'up' : 'down';
        }

        const candidateStock: StockItem = {
          ...item,
          companyName: quote.companyName || item.companyName || item.symbol,
          sector: quote.sector || item.sector || 'General',
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          open: quote.open || item.open,
          previousClose: quote.previousClose || item.previousClose,
          dayHigh: quote.high || item.dayHigh,
          dayLow: quote.low || item.dayLow,
          volume: quote.volume || item.volume,
          marketCap: quote.marketCap ?? item.marketCap,
          peRatio: quote.peRatio ?? item.peRatio,
          exchange: quote.exchange || item.exchange,
          currency: quote.currency || item.currency,
          marketState: quote.marketState || item.marketState,
          provider: quote.provider || item.provider,
          lastPrice: item.price > 0 ? item.price : quote.price,
          lastUpdated: quote.timestamp || Date.now(),
          flashStatus: flash,
        };

        // Run crossing alert evaluation
        const { updatedStock, triggeredAlerts } = alertEngine.evaluateStockAlerts(candidateStock);

        if (triggeredAlerts.length > 0) {
          newTriggeredAlerts.push(...triggeredAlerts);
        }

        return updatedStock;
      });

      setStocks(updatedList);
      setLastUpdatedTime(Date.now());

      // Process newly triggered crossing alerts
      if (newTriggeredAlerts.length > 0) {
        for (const alert of newTriggeredAlerts) {
          // Play Audio chime
          alertEngine.playAlertChime(alert.type);

          // Browser notification
          alertEngine.sendBrowserNotification(alert, lang, (sym) => {
            setSelectedStockSymbol(sym);
          });

          // Record in SQLite backend API
          apiService.recordAlertHistory({
            symbol: alert.symbol,
            companyName: alert.companyName,
            type: alert.type,
            targetPrice: alert.targetPrice,
            triggeredPrice: alert.triggeredPrice,
          });

          // Add to local history list
          const histItem: AlertHistoryItem = {
            id: alert.id,
            symbol: alert.symbol,
            companyName: alert.companyName,
            type: alert.type,
            targetPrice: alert.targetPrice,
            triggeredPrice: alert.triggeredPrice,
            timestamp: alert.timestamp,
            date: new Date(alert.timestamp).toISOString(),
          };
          setAlertHistory(prev => [histItem, ...prev]);
          setTriggeredCountToday(c => c + 1);
        }

        // Add to active toast banner (keep max 3 simultaneously)
        setActiveToasts(prev => [...newTriggeredAlerts, ...prev].slice(0, 3));
      }

    } catch (err) {
      console.error('Error during market quotes polling:', err);
    } finally {
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [lang]);

  // Polling loop
  useEffect(() => {
    // Initial fetch
    fetchMarketQuotes();

    const intervalId = setInterval(() => {
      fetchMarketQuotes();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchMarketQuotes, refreshInterval]);

  // Flash animation cleaner
  useEffect(() => {
    const timer = setTimeout(() => {
      setStocks(prev => prev.map(s => s.flashStatus ? { ...s, flashStatus: null } : s));
    }, 1200);
    return () => clearTimeout(timer);
  }, [stocks]);

  // Handlers
  const handleToggleLang = () => {
    setLang(l => (l === 'ar' ? 'en' : 'ar'));
  };

  const handleToggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleUpdateAlerts = (
    symbol: string, 
    upperAlert: number | null, 
    lowerAlert: number | null, 
    alertsEnabled: boolean
  ) => {
    setStocks(prev => prev.map(stock => {
      if (stock.symbol === symbol) {
        const updated = {
          ...stock,
          upperAlert,
          lowerAlert,
          alertsEnabled,
          upperCrossedState: false,
          lowerCrossedState: false,
        };
        // Persist to SQLite
        apiService.saveSqliteStock({
          symbol: stock.symbol,
          name: stock.companyName,
          sector: stock.sector,
          upperAlert,
          lowerAlert,
          alertsEnabled,
        });
        return updated;
      }
      return stock;
    }));
  };

  const showActionToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast_${Date.now()}`;
    setActionToast({ id, message, type });
    setTimeout(() => {
      setActionToast(curr => (curr?.id === id ? null : curr));
    }, 4000);
  };

  const handleDeleteStock = (symbol: string) => {
    const symUpper = symbol.trim().toUpperCase();
    if (!symUpper) return;

    // 1. Permanent removal from React state
    setStocks(prev => {
      const filtered = prev.filter(s => s.symbol.toUpperCase() !== symUpper);
      localStorage.setItem('sahm_watchlist', JSON.stringify(filtered));
      return filtered;
    });

    // 2. Permanent deletion from SQLite database in backend
    apiService.deleteSqliteStock(symUpper);

    // 3. Clear any active toast for that symbol
    setActiveToasts(prev => prev.filter(t => t.symbol.toUpperCase() !== symUpper));

    // 4. Show confirmation
    const msg = lang === 'ar' 
      ? `تم الحذف النهائي للسهم (${symUpper}) من المراقبة بنجاح`
      : `Stock (${symUpper}) permanently deleted from watchlist`;
    showActionToast(msg, 'info');
  };

  const handleClearAllStocks = () => {
    setStocks([]);
    localStorage.setItem('sahm_watchlist', JSON.stringify([]));
    setActiveToasts([]);
    apiService.clearAllSqliteStocks();

    const msg = lang === 'ar' 
      ? 'تم الحذف النهائي لجميع الأسهم من المراقبة بنجاح'
      : 'All stocks permanently deleted from watchlist';
    showActionToast(msg, 'info');
  };

  const handleAddStock = (symbol: string, upperAlert: number | null, lowerAlert: number | null) => {
    const symUpper = symbol.trim().toUpperCase();
    if (!symUpper) return;

    setStocks(prev => {
      const existing = prev.find(s => s.symbol.toUpperCase() === symUpper);
      const newStock: StockItem = {
        symbol: symUpper,
        companyName: existing?.companyName || symUpper,
        sector: existing?.sector || 'General',
        exchange: existing?.exchange || 'US',
        price: existing?.price || 0,
        change: existing?.change || 0,
        changePercent: existing?.changePercent || 0,
        open: existing?.open || 0,
        previousClose: existing?.previousClose || 0,
        dayHigh: existing?.dayHigh || 0,
        dayLow: existing?.dayLow || 0,
        volume: existing?.volume || 0,
        upperAlert: upperAlert !== null ? upperAlert : (existing?.upperAlert ?? null),
        lowerAlert: lowerAlert !== null ? lowerAlert : (existing?.lowerAlert ?? null),
        alertsEnabled: true,
        lastUpdated: 0,
      };

      // PREPEND: Put the new stock at the very TOP of the list, retaining ALL previous stocks
      const otherStocks = prev.filter(s => s.symbol.toUpperCase() !== symUpper);
      const updatedList = [newStock, ...otherStocks];

      // Save to SQLite
      apiService.saveSqliteStock({
        symbol: symUpper,
        name: newStock.companyName,
        sector: newStock.sector,
        exchange: newStock.exchange,
        price: newStock.price,
        upperAlert: newStock.upperAlert,
        lowerAlert: newStock.lowerAlert,
        alertsEnabled: true,
      });

      localStorage.setItem('sahm_watchlist', JSON.stringify(updatedList));
      return updatedList;
    });

    const msg = lang === 'ar'
      ? `تمت إضافة السهم (${symUpper}) في أعلى القائمة مع الاحتفاظ بكافة الأسهم السابقة`
      : `Stock (${symUpper}) added to top of watchlist. All previous stocks retained`;
    showActionToast(msg, 'success');

    // Immediately trigger fetch for the new stock
    setTimeout(() => fetchMarketQuotes(), 100);
  };

  const handleImportStocks = (parsed: ParsedStockData[], filename: string) => {
    if (!parsed || parsed.length === 0) return;

    setStocks(prev => {
      const existingMap = new Map<string, StockItem>(prev.map(s => [s.symbol.toUpperCase(), s]));
      const newItems: StockItem[] = [];
      let updatedCount = 0;

      for (const p of parsed) {
        const sym = p.symbol.trim().toUpperCase();
        if (!sym) continue;

        if (existingMap.has(sym)) {
          // Update existing stock's alert levels if provided, while keeping live market stats
          const old = existingMap.get(sym)!;
          const updated: StockItem = {
            ...old,
            companyName: p.companyName || old.companyName,
            sector: p.sector || old.sector,
            upperAlert: p.upperAlert !== undefined && p.upperAlert !== null ? p.upperAlert : old.upperAlert,
            lowerAlert: p.lowerAlert !== undefined && p.lowerAlert !== null ? p.lowerAlert : old.lowerAlert,
          };
          existingMap.set(sym, updated);
          updatedCount++;
        } else {
          // New stock to be prepended on top
          newItems.push({
            symbol: sym,
            companyName: p.companyName || sym,
            sector: p.sector || 'General',
            industry: p.industry,
            price: p.price || 0,
            change: 0,
            changePercent: 0,
            open: 0,
            previousClose: 0,
            dayHigh: 0,
            dayLow: 0,
            volume: 0,
            upperAlert: p.upperAlert ?? null,
            lowerAlert: p.lowerAlert ?? null,
            alertsEnabled: true,
            lastUpdated: 0,
          });
        }
      }

      // PREPEND: Put all new items on top, retaining all previous stocks
      const combined = [...newItems, ...Array.from(existingMap.values())];

      // Bulk persist to SQLite
      apiService.bulkSaveSqliteStocks(combined);
      localStorage.setItem('sahm_watchlist', JSON.stringify(combined));

      const msg = lang === 'ar'
        ? `تم بنجاح استيراد ${newItems.length} سهم جديد في أعلى القائمة والاحتفاظ بـ ${existingMap.size} سهم سابق من (${filename})`
        : `Successfully imported ${newItems.length} new stocks on top, retaining ${existingMap.size} previous stocks from (${filename})`;
      showActionToast(msg, 'success');

      return combined;
    });

    setTimeout(() => fetchMarketQuotes(), 200);
  };

  const handleTestTriggerAlert = (stock: StockItem) => {
    const isUpper = Math.random() > 0.5;
    const testTarget = isUpper 
      ? (stock.price > 0 ? stock.price * 1.02 : 250) 
      : (stock.price > 0 ? stock.price * 0.98 : 200);
    const testPrice = isUpper ? testTarget + 1.25 : testTarget - 1.25;

    const mockAlert: AlertNotification = {
      id: `test_${stock.symbol}_${Date.now()}`,
      symbol: stock.symbol,
      companyName: stock.companyName,
      type: isUpper ? 'UPPER' : 'LOWER',
      targetPrice: Number(testTarget.toFixed(2)),
      triggeredPrice: Number(testPrice.toFixed(2)),
      timestamp: Date.now(),
    };

    alertEngine.playAlertChime(mockAlert.type);
    alertEngine.sendBrowserNotification(mockAlert, lang, (sym) => setSelectedStockSymbol(sym));
    
    apiService.recordAlertHistory({
      symbol: mockAlert.symbol,
      companyName: mockAlert.companyName,
      type: mockAlert.type,
      targetPrice: mockAlert.targetPrice,
      triggeredPrice: mockAlert.triggeredPrice,
    });

    const histItem: AlertHistoryItem = {
      id: mockAlert.id,
      symbol: mockAlert.symbol,
      companyName: mockAlert.companyName,
      type: mockAlert.type,
      targetPrice: mockAlert.targetPrice,
      triggeredPrice: mockAlert.triggeredPrice,
      timestamp: mockAlert.timestamp,
      date: new Date().toISOString(),
    };
    setAlertHistory(prev => [histItem, ...prev]);
    setTriggeredCountToday(c => c + 1);
    setActiveToasts(prev => [mockAlert, ...prev].slice(0, 3));
  };

  const handleClearAlertHistory = () => {
    apiService.clearAlertHistory();
    setAlertHistory([]);
    setTriggeredCountToday(0);
  };

  const handleDeleteHistoryItem = (id: string) => {
    apiService.deleteAlertHistory(id);
    setAlertHistory(prev => prev.filter(h => h.id !== id));
  };

  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const selectedStock = stocks.find(s => s.symbol === selectedStockSymbol) || null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0a0b0d] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenAdd={() => setIsAddModalOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        historyCount={alertHistory.length}
        onManualRefresh={fetchMarketQuotes}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        marketState={stocks[0]?.marketState || 'REGULAR'}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-2.5 sm:px-5 lg:px-8 py-3.5 sm:py-6">
        
        {/* KPI Financial Overview Cards */}
        <KpiCards
          stocks={stocks}
          triggeredCountToday={triggeredCountToday}
          lastUpdatedTime={lastUpdatedTime}
          refreshInterval={refreshInterval}
          lang={lang}
        />

        {/* Live Real-Time Stock Table */}
        <LiveStockTable
          stocks={stocks}
          lang={lang}
          onUpdateAlerts={handleUpdateAlerts}
          onDeleteStock={handleDeleteStock}
          onClearAllStocks={handleClearAllStocks}
          onSelectStock={(sym) => setSelectedStockSymbol(sym)}
          onTestTriggerAlert={handleTestTriggerAlert}
        />

      </main>

      {/* Technical Dashboard Telemetry Footer */}
      <footer className="min-h-9 py-2.5 bg-white dark:bg-[#0a0b0d] border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between px-3 sm:px-6 lg:px-8 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono select-none gap-2 safe-bottom transition-colors duration-200">
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-4">
          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-500 dark:text-slate-400">ENGINE:</span> ONLINE (ACTIVE FEED)
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
          <span className="hidden sm:inline">
            <span className="text-slate-500 dark:text-slate-400">FEED:</span> LIVE US EQUITIES
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
          <span className="hidden md:inline">
            <span className="text-slate-500 dark:text-slate-400">INTERVAL:</span> {refreshInterval / 1000}s
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300">SAHM LIVE MONITOR v2.5</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span>
        </div>
      </footer>

      {/* Upload File Modal (.csv, .xlsx, .xls, .json) */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        lang={lang}
        onImportStocks={handleImportStocks}
      />

      {/* Add Stock Manually Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        lang={lang}
        existingSymbols={stocks.map(s => s.symbol)}
        onAddStock={handleAddStock}
      />

      {/* Stock Details & Interactive Chart Modal */}
      <StockDetailsModal
        stock={selectedStock}
        isOpen={Boolean(selectedStockSymbol)}
        onClose={() => setSelectedStockSymbol(null)}
        lang={lang}
        onUpdateAlerts={handleUpdateAlerts}
      />

      {/* Alert History Drawer */}
      <AlertHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        lang={lang}
        history={alertHistory}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearHistory={handleClearAlertHistory}
        onSelectStock={(sym) => setSelectedStockSymbol(sym)}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
      />

      {/* Stock Executive Report Modal (Print & PDF Export) */}
      <StockReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        stocks={stocks}
        lang={lang}
      />

      {/* Floating Action Toast Banner */}
      {actionToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
          <div className="bg-[#161b22] border border-emerald-500/50 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-3 text-white text-xs font-mono backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{actionToast.message}</span>
            <button
              onClick={() => setActionToast(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Real-Time Crossing Notification Banners */}
      <AlertNotificationBanner
        notifications={activeToasts}
        onDismiss={handleDismissToast}
        onSelectStock={(sym) => setSelectedStockSymbol(sym)}
        lang={lang}
      />

    </div>
  );
}
