import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { StockScientificAnalysisModal } from './components/StockScientificAnalysisModal.js';
import { AlertHistoryDrawer } from './components/AlertHistoryDrawer.js';
import { AlertNotificationBanner } from './components/AlertNotificationBanner.js';
import { StockReportModal } from './components/StockReportModal.js';
import { CalculatorModal } from './components/CalculatorModal.js';
import { PortfolioModal } from './components/PortfolioModal.js';
import { BrokerManagementModal } from './components/BrokerManagementModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
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

  // 3. Stocks watchlist state - Single Source of Truth is Database
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // 4. Alert History & Toasts
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [activeToasts, setActiveToasts] = useState<AlertNotification[]>([]);
  const [triggeredCountToday, setTriggeredCountToday] = useState(0);
  const [actionToast, setActionToast] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // 5. Refresh Interval & Timing (Default 2 seconds for high-frequency live monitoring)
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('sahm_refresh_interval');
    return saved ? parseInt(saved, 10) : 2000;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number | null>(null);

  // 6. Notifications permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    alertEngine.getNotificationPermission()
  );

  // 7. Save & Persistence Sync State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  // 8. Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [calculatorStockSymbol, setCalculatorStockSymbol] = useState<string | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isBrokersModalOpen, setIsBrokersModalOpen] = useState(false);
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
    apiService.saveSettings({ language: lang });
  }, [lang]);

  // Sync Theme on DOM (Dark / Light)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sahm_theme', theme);
    apiService.saveSettings({ theme: theme });
  }, [theme]);

  // Save refresh interval
  useEffect(() => {
    localStorage.setItem('sahm_refresh_interval', refreshInterval.toString());
    apiService.saveSettings({ refresh_interval: refreshInterval.toString() });
  }, [refreshInterval]);

  // -------------------------------------------------------------
  // DATABASE AS SINGLE SOURCE OF TRUTH: Initial Load from SQLite
  // -------------------------------------------------------------
  useEffect(() => {
    const initializeDatabaseData = async () => {
      try {
        const [dbStocks, dbHistory, dbSettings] = await Promise.all([
          apiService.fetchWatchlist(),
          apiService.fetchAlertHistory(),
          apiService.fetchSettings(),
        ]);

        // If settings returned theme or lang, sync
        if (dbSettings) {
          if (dbSettings.theme && (dbSettings.theme === 'light' || dbSettings.theme === 'dark')) {
            setTheme(dbSettings.theme as Theme);
          }
          if (dbSettings.language && (dbSettings.language === 'ar' || dbSettings.language === 'en')) {
            setLang(dbSettings.language as Language);
          }
        }

        if (Array.isArray(dbStocks) && dbStocks.length > 0) {
          const loadedStocks: StockItem[] = dbStocks.map((s: any) => ({
            symbol: s.symbol,
            companyName: s.name || s.companyName || s.symbol,
            sector: s.sector || 'General',
            exchange: s.exchange || 'US',
            price: s.price || 0,
            change: 0,
            changePercent: 0,
            open: 0,
            previousClose: 0,
            dayHigh: 0,
            dayLow: 0,
            volume: 0,
            upperAlert: s.upperAlert !== undefined && s.upperAlert !== null ? Number(s.upperAlert) : null,
            lowerAlert: s.lowerAlert !== undefined && s.lowerAlert !== null ? Number(s.lowerAlert) : null,
            alertsEnabled: s.alertsEnabled !== undefined ? Boolean(s.alertsEnabled) : true,
            lastUpdated: 0,
          }));
          setStocks(loadedStocks);
        } else {
          // If database is empty, bootstrap with default stocks and save to database
          setStocks(DEFAULT_STOCKS);
          apiService.syncAllStocks(DEFAULT_STOCKS);
        }

        if (Array.isArray(dbHistory)) {
          setAlertHistory(dbHistory);
          const todayStr = new Date().toDateString();
          const countToday = dbHistory.filter(h => new Date(h.timestamp).toDateString() === todayStr).length;
          setTriggeredCountToday(countToday);
        }
      } catch (err) {
        console.error('Error initializing data from database:', err);
        setStocks(DEFAULT_STOCKS);
      } finally {
        setIsDbLoaded(true);
      }
    };

    initializeDatabaseData();
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

          // Record in SQLite backend database
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
    if (!isDbLoaded) return;

    fetchMarketQuotes();

    const intervalId = setInterval(() => {
      fetchMarketQuotes();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchMarketQuotes, refreshInterval, isDbLoaded]);

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

  // Explicit Save & Commit to Database function
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const currentList = stocksRef.current || stocks;
      
      // Synchronize all stocks and alerts to persistent SQLite database
      const res = await apiService.syncAllStocks(currentList);
      
      setHasUnsavedChanges(false);
      setLastSavedTime(Date.now());
      
      const count = res?.count ?? currentList.length;
      const msg = lang === 'ar'
        ? `✅ تم حفظ واعتماد كافة الأسهم (${count}) والتنبيهات في قاعدة البيانات بنجاح`
        : `✅ All ${count} stocks and alert thresholds successfully saved to database`;
      showActionToast(msg, 'success');
    } catch (err) {
      console.error('Error saving all stocks:', err);
      showActionToast(lang === 'ar' ? 'تعذر الحفظ في قاعدة البيانات' : 'Failed to save to database', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S for instant saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lang, stocks]);

  const handleUpdateAlerts = (
    symbol: string, 
    upperAlert: number | null, 
    lowerAlert: number | null, 
    alertsEnabled: boolean
  ) => {
    setHasUnsavedChanges(true);
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
        // Persist directly to SQLite Single Source of Truth
        apiService.saveWatchlistItem({
          symbol: stock.symbol,
          companyName: stock.companyName,
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

    setHasUnsavedChanges(true);

    // 1. Permanent removal from React state
    setStocks(prev => prev.filter(s => s.symbol.toUpperCase() !== symUpper));

    // 2. Permanent deletion from SQLite database (Single Source of Truth)
    apiService.deleteWatchlistItem(symUpper);

    // 3. Clear any active toast for that symbol
    setActiveToasts(prev => prev.filter(t => t.symbol.toUpperCase() !== symUpper));

    // 4. Show confirmation
    const msg = lang === 'ar' 
      ? `تم الحذف النهائي للسهم (${symUpper}) من قاعدة البيانات بنجاح`
      : `Stock (${symUpper}) permanently deleted from database`;
    showActionToast(msg, 'info');
  };

  const handleClearAllStocks = () => {
    setHasUnsavedChanges(true);
    setStocks([]);
    setActiveToasts([]);
    apiService.clearWatchlist();

    const msg = lang === 'ar' 
      ? 'تم الحذف النهائي لجميع الأسهم من قاعدة البيانات بنجاح'
      : 'All stocks permanently deleted from database';
    showActionToast(msg, 'info');
  };

  const handleAddStock = (symbol: string, upperAlert: number | null, lowerAlert: number | null) => {
    const symUpper = symbol.trim().toUpperCase();
    if (!symUpper) return;

    setHasUnsavedChanges(true);

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

      // Save directly to SQLite
      apiService.saveWatchlistItem({
        symbol: symUpper,
        companyName: newStock.companyName,
        sector: newStock.sector,
        exchange: newStock.exchange,
        upperAlert: newStock.upperAlert,
        lowerAlert: newStock.lowerAlert,
        alertsEnabled: true,
      });

      return updatedList;
    });

    const msg = lang === 'ar'
      ? `تمت إضافة السهم (${symUpper}) في أعلى القائمة وحفظه في قاعدة البيانات`
      : `Stock (${symUpper}) added to top and persisted to database`;
    showActionToast(msg, 'success');

    // Immediately trigger fetch for the new stock
    setTimeout(() => fetchMarketQuotes(), 100);
  };

  const handleImportStocks = (parsed: ParsedStockData[], filename: string) => {
    if (!parsed || parsed.length === 0) return;

    setHasUnsavedChanges(true);

    setStocks(prev => {
      const existingMap = new Map<string, StockItem>(prev.map(s => [s.symbol.toUpperCase(), s]));
      const newItems: StockItem[] = [];

      for (const p of parsed) {
        const sym = p.symbol.trim().toUpperCase();
        if (!sym) continue;

        if (existingMap.has(sym)) {
          const old = existingMap.get(sym)!;
          const updated: StockItem = {
            ...old,
            companyName: p.companyName || old.companyName,
            sector: p.sector || old.sector,
            upperAlert: p.upperAlert !== undefined && p.upperAlert !== null ? p.upperAlert : old.upperAlert,
            lowerAlert: p.lowerAlert !== undefined && p.lowerAlert !== null ? p.lowerAlert : old.lowerAlert,
          };
          existingMap.set(sym, updated);
        } else {
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

      // Bulk persist to SQLite Single Source of Truth
      apiService.importWatchlist(combined, filename, filename.split('.').pop());

      const msg = lang === 'ar'
        ? `تم بنجاح استيراد ${newItems.length} سهم جديد والاحتفاظ بـ ${existingMap.size} سهم سابق في قاعدة البيانات`
        : `Successfully imported ${newItems.length} new stocks into database (${filename})`;
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

  const selectedStock = useMemo(() => {
    if (!selectedStockSymbol) return null;
    const found = stocks.find(s => s.symbol.toUpperCase() === selectedStockSymbol.toUpperCase());
    if (found) return found;
    return {
      symbol: selectedStockSymbol.toUpperCase(),
      companyName: selectedStockSymbol.toUpperCase(),
      sector: 'General',
      price: 100,
      change: 0,
      changePercent: 0,
      open: 100,
      previousClose: 100,
      dayHigh: 102,
      dayLow: 98,
      volume: 1000000,
      upperAlert: null,
      lowerAlert: null,
      alertsEnabled: true,
      lastUpdated: Date.now(),
    } as StockItem;
  }, [stocks, selectedStockSymbol]);

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
        onOpenCalculator={() => setIsCalculatorModalOpen(true)}
        onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
        onOpenBrokers={() => setIsBrokersModalOpen(true)}
        historyCount={alertHistory.length}
        onManualRefresh={fetchMarketQuotes}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        marketState={stocks[0]?.marketState || 'REGULAR'}
        onSaveAll={handleSaveAll}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
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
          onOpenCalculator={(stock) => {
            setCalculatorStockSymbol(stock.symbol);
            setIsCalculatorModalOpen(true);
          }}
        />

      </main>

      {/* Technical Dashboard Telemetry Footer */}
      <footer className="min-h-9 py-2.5 bg-white dark:bg-[#0a0b0d] border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between px-3 sm:px-6 lg:px-8 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono select-none gap-2 safe-bottom transition-colors duration-200">
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-4">
          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-500 dark:text-slate-400">DATABASE:</span> SQLITE (SINGLE SOURCE OF TRUTH)
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
          <span className="font-semibold text-slate-700 dark:text-slate-300">SAHM QUANT ENGINE v3.0</span>
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

      {/* Stock Details & Scientific Quantitative Investment Analysis Modal */}
      <ErrorBoundary fallbackTitle="تعذر فتح شاشة التحليل الكمي">
        <StockScientificAnalysisModal
          stock={selectedStock}
          isOpen={Boolean(selectedStockSymbol)}
          onClose={() => setSelectedStockSymbol(null)}
          lang={lang}
          onUpdateAlerts={handleUpdateAlerts}
        />
      </ErrorBoundary>

      {/* Quick Trading Calculator Modal */}
      <ErrorBoundary fallbackTitle="تعذر فتح حاسبة التداول">
        <CalculatorModal
          isOpen={isCalculatorModalOpen}
          onClose={() => {
            setIsCalculatorModalOpen(false);
            setCalculatorStockSymbol(null);
          }}
          lang={lang}
          initialSymbol={calculatorStockSymbol || selectedStockSymbol || undefined}
          watchlistStocks={stocks}
          onOpenScientificAnalysis={(sym) => {
            setIsCalculatorModalOpen(false);
            setCalculatorStockSymbol(null);
            setSelectedStockSymbol(sym);
          }}
        />
      </ErrorBoundary>

      {/* Portfolio & Positions Modal */}
      <ErrorBoundary fallbackTitle="تعذر فتح المحفظة الاستثمارية">
        <PortfolioModal
          isOpen={isPortfolioModalOpen}
          onClose={() => setIsPortfolioModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Broker Platforms Modal */}
      <ErrorBoundary fallbackTitle="تعذر فتح إدارة المنصات المالية">
        <BrokerManagementModal
          isOpen={isBrokersModalOpen}
          onClose={() => setIsBrokersModalOpen(false)}
        />
      </ErrorBoundary>

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
