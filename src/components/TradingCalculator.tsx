import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  DollarSign,
  Layers,
  ArrowRightLeft,
  Percent,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  ChevronDown,
  Sliders,
  RotateCcw,
  Briefcase,
  BookmarkPlus,
  Flame,
  Search,
  RefreshCw,
  AlertTriangle,
  XCircle,
  X,
  HelpCircle,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  PercentCircle,
  ExternalLink,
} from 'lucide-react';
import { BrokeragePlatform, TradeCalculationResult, StockItem } from '../types.js';
import { TradingCalculationService, TradeDecisionVerdict } from '../services/tradingCalculationService.js';
import { apiService } from '../services/api.js';
import { runScientificAnalysis, QuantitativeAnalysisResult } from '../utils/quantitativeEngine.js';
import { getClientFallbackChart } from '../utils/clientChartFallback.js';

interface TradingCalculatorProps {
  initialSymbol?: string;
  initialBuyPrice?: number;
  initialShares?: number;
  initialCurrentPrice?: number;
  watchlistStocks?: StockItem[];
  onSaveToWatchlist?: (data: { symbol: string; buyPrice: number; shares: number; brokerId: string }) => void;
  onSaveToPortfolio?: (data: { symbol: string; buyPrice: number; shares: number; brokerId: string }) => void;
  onOpenScientificAnalysis?: (symbol: string) => void;
}

const POPULAR_SYMBOLS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'PLTR', 'META', 'GOOGL'];

export const TradingCalculator: React.FC<TradingCalculatorProps> = ({
  initialSymbol = 'NVDA',
  initialBuyPrice,
  initialShares = 50,
  initialCurrentPrice,
  watchlistStocks = [],
  onSaveToWatchlist,
  onSaveToPortfolio,
  onOpenScientificAnalysis,
}) => {
  const [brokers, setBrokers] = useState<BrokeragePlatform[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('broker_sahm');
  
  // Dynamic stock input
  const [symbolInput, setSymbolInput] = useState<string>(initialSymbol || 'NVDA');
  const [symbol, setSymbol] = useState<string>(initialSymbol || 'NVDA');
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Scientific Analysis State
  const [fullAnalysisData, setFullAnalysisData] = useState<any>(null);
  const [calculatorViewTab, setCalculatorViewTab] = useState<'SCIENTIFIC_REASONING' | 'FEES_VERDICT'>('SCIENTIFIC_REASONING');

  // Trade Inputs
  const [buyPrice, setBuyPrice] = useState<number>(initialBuyPrice && initialBuyPrice > 0 ? initialBuyPrice : 140);
  const [shares, setShares] = useState<number>(initialShares > 0 ? initialShares : 50);
  const [sellPrice, setSellPrice] = useState<number>(
    initialCurrentPrice && initialCurrentPrice > 0
      ? initialCurrentPrice
      : initialBuyPrice && initialBuyPrice > 0
      ? Number((initialBuyPrice * 1.05).toFixed(2))
      : 147
  );
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    buyPrice > 0 ? Number((buyPrice * 0.96).toFixed(2)) : 134.4
  );
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number | undefined>(initialCurrentPrice);
  const [marketData, setMarketData] = useState<{
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    companyName?: string;
  } | null>(null);

  const [showAdvancedFees, setShowAdvancedFees] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Custom fee overrides (optional)
  const [customBuyComm, setCustomBuyComm] = useState<number | undefined>(undefined);
  const [customSellComm, setCustomSellComm] = useState<number | undefined>(undefined);
  const [customVatRate, setCustomVatRate] = useState<number | undefined>(undefined);

  // Load Brokers from API / SQLite
  useEffect(() => {
    let mounted = true;
    apiService.fetchBrokers().then((res) => {
      if (mounted && res.brokers && res.brokers.length > 0) {
        setBrokers(res.brokers);
        if (res.defaultBroker && res.defaultBroker.id) {
          setSelectedBrokerId(res.defaultBroker.id);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const lastSyncedSymbolRef = useRef<string | undefined>(undefined);
  const userManualOverrideRef = useRef<boolean>(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch full scientific analysis data
  const loadScientificAnalysisData = async (ticker: string) => {
    const cleanSym = ticker.trim().toUpperCase();
    if (!cleanSym) return;
    try {
      const data = await apiService.fetchFullAnalysis(cleanSym);
      setFullAnalysisData(data);
    } catch {
      // Handled in useMemo fallback
    }
  };

  // Fetch initial or changed stock quote
  const fetchLiveQuote = async (tickerToFetch: string) => {
    const cleanSym = tickerToFetch.trim().toUpperCase();
    if (!cleanSym) return;

    setIsFetchingQuote(true);
    setQuoteError(null);
    setSymbol(cleanSym);
    setSymbolInput(cleanSym);

    // Also trigger scientific analysis fetching
    loadScientificAnalysisData(cleanSym);

    try {
      const quote = await apiService.fetchQuote(cleanSym);
      if (quote && quote.price > 0) {
        setSymbol(cleanSym);
        setSymbolInput(cleanSym);
        setCurrentMarketPrice(quote.price);
        setMarketData({
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          high: quote.high || quote.price * 1.02,
          low: quote.low || quote.price * 0.98,
          companyName: quote.companyName || cleanSym,
        });

        // Update default buy/sell/stop prices if matching
        setBuyPrice(quote.price);
        setSellPrice(Number((quote.price * 1.05).toFixed(2)));
        setStopLossPrice(Number((quote.price * 0.96).toFixed(2)));
      } else {
        setQuoteError(`تعذر جلب بيانات السهم ${cleanSym}. يمكنك إدخال الأسعار يدوياً.`);
      }
    } catch {
      setQuoteError(`تعذر الاتصال بخادم الأسعار لـ ${cleanSym}. يمكنك إدخال الأسعار يدوياً.`);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  // Sync ONLY on explicit initialSymbol change from parent when opened
  useEffect(() => {
    if (initialSymbol && initialSymbol !== lastSyncedSymbolRef.current) {
      lastSyncedSymbolRef.current = initialSymbol;
      userManualOverrideRef.current = false;
      setSymbol(initialSymbol);
      setSymbolInput(initialSymbol);
      fetchLiveQuote(initialSymbol);
    } else if (!lastSyncedSymbolRef.current) {
      // First mount default
      const defaultSym = initialSymbol || (watchlistStocks.length > 0 ? watchlistStocks[0].symbol : 'NVDA');
      lastSyncedSymbolRef.current = defaultSym;
      setSymbol(defaultSym);
      setSymbolInput(defaultSym);
      fetchLiveQuote(defaultSym);
    }
  }, [initialSymbol]);

  const activeBroker = useMemo<BrokeragePlatform>(() => {
    const found = brokers.find((b) => b.id === selectedBrokerId);
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
      notes: 'منصة سهم الافتراضية',
      is_default: true,
      is_active: true,
    };
  }, [brokers, selectedBrokerId]);

  // Execute analytical trade calculation
  const calcResult = useMemo<TradeCalculationResult>(() => {
    return TradingCalculationService.calculate({
      symbol,
      buyPrice: Number(buyPrice || 0),
      shares: Number(shares || 0),
      sellPrice: Number(sellPrice || 0),
      currentPrice: currentMarketPrice,
      broker: activeBroker,
      customBuyCommission: customBuyComm,
      customSellCommission: customSellComm,
      customVatRate: customVatRate,
    });
  }, [symbol, buyPrice, shares, sellPrice, currentMarketPrice, activeBroker, customBuyComm, customSellComm, customVatRate]);

  // Execute Actionable Trade Decision Verdict
  const decisionVerdict = useMemo<TradeDecisionVerdict>(() => {
    return TradingCalculationService.evaluateTradeDecision(calcResult, {
      stopLossPrice,
      currentMarketPrice,
    });
  }, [calcResult, stopLossPrice, currentMarketPrice]);

  // Execute Scientific Quantitative Multi-Factor Analysis Engine
  const scientificAnalysis = useMemo<QuantitativeAnalysisResult | null>(() => {
    const safePrice = (currentMarketPrice && currentMarketPrice > 0) ? currentMarketPrice : (buyPrice > 0 ? buyPrice : 100);
    const targetStockItem = watchlistStocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());

    const syntheticStock: StockItem = {
      symbol: symbol.toUpperCase(),
      companyName: marketData?.companyName || targetStockItem?.companyName || symbol.toUpperCase(),
      sector: targetStockItem?.sector || 'General Market',
      industry: targetStockItem?.industry || 'Equities',
      price: safePrice,
      change: marketData?.change ?? (targetStockItem?.change || 0),
      changePercent: marketData?.changePercent ?? (targetStockItem?.changePercent || 0),
      open: targetStockItem?.open || safePrice,
      previousClose: targetStockItem?.previousClose || safePrice,
      dayHigh: marketData?.high || targetStockItem?.dayHigh || safePrice * 1.02,
      dayLow: marketData?.low || targetStockItem?.dayLow || safePrice * 0.98,
      volume: targetStockItem?.volume || 1500000,
      fiftyTwoWeekHigh: targetStockItem?.fiftyTwoWeekHigh || safePrice * 1.25,
      fiftyTwoWeekLow: targetStockItem?.fiftyTwoWeekLow || safePrice * 0.75,
      upperAlert: null,
      lowerAlert: null,
      alertsEnabled: true,
      lastUpdated: Date.now(),
    };

    const mergedData = fullAnalysisData ? { ...fullAnalysisData } : {
      symbol: symbol.toUpperCase(),
      companyName: syntheticStock.companyName,
      exchange: 'US Market',
      sector: syntheticStock.sector,
      industry: syntheticStock.industry,
      currency: 'USD',
      quote: {
        price: safePrice,
        change: syntheticStock.change,
        changePercent: syntheticStock.changePercent,
        open: syntheticStock.open,
        previousClose: syntheticStock.previousClose,
        high: syntheticStock.dayHigh,
        low: syntheticStock.dayLow,
        volume: syntheticStock.volume,
        fiftyTwoWeekHigh: syntheticStock.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: syntheticStock.fiftyTwoWeekLow,
        marketState: 'REGULAR',
        timestamp: Date.now(),
      },
      charts: {},
    };

    if (!mergedData.quote) {
      mergedData.quote = {
        price: safePrice,
        change: syntheticStock.change,
        changePercent: syntheticStock.changePercent,
        open: syntheticStock.open,
        previousClose: syntheticStock.previousClose,
        high: syntheticStock.dayHigh,
        low: syntheticStock.dayLow,
        volume: syntheticStock.volume,
        fiftyTwoWeekHigh: syntheticStock.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: syntheticStock.fiftyTwoWeekLow,
        marketState: 'REGULAR',
        timestamp: Date.now(),
      };
    } else if (safePrice > 0) {
      mergedData.quote.price = safePrice;
    }

    if (!mergedData.charts) mergedData.charts = {};
    const timeframes = ['1D', '5D', '1M', '3M', '6M', '1Y'];
    for (const tf of timeframes) {
      if (!mergedData.charts[tf] || !Array.isArray(mergedData.charts[tf]) || mergedData.charts[tf].length === 0) {
        mergedData.charts[tf] = getClientFallbackChart(syntheticStock, tf);
      }
    }

    try {
      return runScientificAnalysis(mergedData);
    } catch (err) {
      console.error('Scientific analysis calculation error:', err);
      return null;
    }
  }, [symbol, currentMarketPrice, buyPrice, marketData, fullAnalysisData, watchlistStocks]);

  // Apply Scientific Engine Recommendations to Trade Inputs
  const applyScientificEntry = () => {
    if (scientificAnalysis?.tradeSetup?.preferredEntryMin) {
      setBuyPrice(scientificAnalysis.tradeSetup.preferredEntryMin);
    } else if (currentMarketPrice && currentMarketPrice > 0) {
      setBuyPrice(currentMarketPrice);
    }
  };

  const applyScientificStopLoss = () => {
    if (scientificAnalysis?.tradeSetup?.stopLoss && scientificAnalysis.tradeSetup.stopLoss > 0) {
      setStopLossPrice(scientificAnalysis.tradeSetup.stopLoss);
    }
  };

  const applyScientificTarget1 = () => {
    if (scientificAnalysis?.tradeSetup?.target1 && scientificAnalysis.tradeSetup.target1 > 0) {
      setSellPrice(scientificAnalysis.tradeSetup.target1);
    }
  };

  const applyScientificTarget2 = () => {
    if (scientificAnalysis?.tradeSetup?.target2 && scientificAnalysis.tradeSetup.target2 > 0) {
      setSellPrice(scientificAnalysis.tradeSetup.target2);
    }
  };

  // Quick percentage helpers for targets
  const applyPercentTarget = (pct: number) => {
    const safeBase = buyPrice > 0 ? buyPrice : currentMarketPrice || 100;
    const newPrice = Number((safeBase * (1 + pct / 100)).toFixed(2));
    setSellPrice(newPrice);
  };

  // Quick percentage helpers for stop loss
  const applyPercentStop = (pct: number) => {
    const safeBase = buyPrice > 0 ? buyPrice : currentMarketPrice || 100;
    const newPrice = Number((safeBase * (1 - pct / 100)).toFixed(2));
    setStopLossPrice(newPrice);
  };

  const applyBreakEvenTarget = () => {
    if (calcResult.breakEvenPrice > 0) {
      setSellPrice(Number(calcResult.breakEvenPrice.toFixed(2)));
    }
  };

  const applyCurrentMarketAsBuy = () => {
    if (currentMarketPrice && currentMarketPrice > 0) {
      setBuyPrice(currentMarketPrice);
      setSellPrice(Number((currentMarketPrice * 1.05).toFixed(2)));
      setStopLossPrice(Number((currentMarketPrice * 0.96).toFixed(2)));
    }
  };

  const handleSymbolSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = symbolInput.trim().toUpperCase();
    if (clean) {
      userManualOverrideRef.current = true;
      setShowSearchSuggestions(false);
      fetchLiveQuote(clean);
    }
  };

  const handleSelectPill = (sym: string) => {
    userManualOverrideRef.current = true;
    setShowSearchSuggestions(false);
    setSymbolInput(sym);
    fetchLiveQuote(sym);
  };

  // Filter available stocks for auto-complete
  const searchSuggestions = useMemo(() => {
    const query = symbolInput.trim().toUpperCase();
    if (!query) return [];

    const pool = [
      ...watchlistStocks.map(s => ({ symbol: s.symbol, name: s.companyName || s.symbol, price: s.price })),
      ...POPULAR_SYMBOLS.map(sym => ({ symbol: sym, name: sym, price: 0 }))
    ];

    const uniqueMap = new Map<string, { symbol: string; name: string; price?: number }>();
    pool.forEach(item => {
      if (!uniqueMap.has(item.symbol)) {
        uniqueMap.set(item.symbol, item);
      }
    });

    return Array.from(uniqueMap.values())
      .filter(item => item.symbol.includes(query) || (item.name && item.name.toUpperCase().includes(query)))
      .slice(0, 6);
  }, [symbolInput, watchlistStocks]);

  const handleSaveWatchlist = () => {
    if (onSaveToWatchlist) {
      onSaveToWatchlist({
        symbol: symbol.toUpperCase(),
        buyPrice,
        shares,
        brokerId: selectedBrokerId,
      });
      setSaveSuccessMsg('تم حفظ وتحديث بيانات الصفقة في قائمة المتابعة بنجاح');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } else {
      apiService
        .saveWatchlistItem({
          symbol: symbol.toUpperCase(),
          buyPrice,
          shares,
          brokerId: selectedBrokerId,
        })
        .then(() => {
          setSaveSuccessMsg('تم حفظ الصفقة في قاعدة البيانات بنجاح');
          setTimeout(() => setSaveSuccessMsg(null), 3500);
        });
    }
  };

  const handleSavePortfolio = () => {
    if (onSaveToPortfolio) {
      onSaveToPortfolio({
        symbol: symbol.toUpperCase(),
        buyPrice,
        shares,
        brokerId: selectedBrokerId,
      });
      setSaveSuccessMsg('تمت إضافة المركز إلى المحفظة الاستثمارية بنجاح');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } else {
      apiService
        .savePortfolioPosition({
          symbol: symbol.toUpperCase(),
          quantity: shares,
          averageBuyPrice: buyPrice,
          totalCost: calcResult.totalCost,
          totalFees: calcResult.totalBuyFees,
          brokerId: selectedBrokerId,
        })
        .then(() => {
          setSaveSuccessMsg('تمت إضافة المركز إلى المحفظة الاستثمارية في قاعدة البيانات');
          setTimeout(() => setSaveSuccessMsg(null), 3500);
        });
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      
      {/* Header & Platform Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>حاسبة التداول واتخاذ القرار الاستثماري</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                Smart Decision Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حدد أي سهم بحرية واحصل على تقييم فوري لجدوى الشراء ونقطة التعادل بعد حساب كافة عمولات المنصات والضرائب
            </p>
          </div>
        </div>

        {/* Brokerage Platform Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">وسيط التداول:</label>
          <div className="relative">
            <select
              value={selectedBrokerId}
              onChange={(e) => setSelectedBrokerId(e.target.value)}
              className="appearance-none pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar} {b.is_default ? '★ (الافتراضية)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Dynamic Stock Selection & Search Bar */}
      <div 
        ref={searchContainerRef}
        className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 dark:from-slate-800/70 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3 relative"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-emerald-500" />
            <span>اختر أو ابحث عن السهم المراد تحليله:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-950/60 text-xs">
              [{symbol}]
            </span>
          </span>
          {marketData && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">السعر الحي الحالي:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">${marketData.price.toFixed(2)}</span>
              <span className={`font-bold ${marketData.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {marketData.change >= 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Input + Search Form */}
        <form onSubmit={handleSymbolSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={symbolInput}
              onFocus={() => setShowSearchSuggestions(true)}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setSymbolInput(val);
                setShowSearchSuggestions(true);
              }}
              placeholder="أدخل رمز السهم (مثال: NVDA, TSLA, AAPL, AMZN...)"
              className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            
            {symbolInput && (
              <button
                type="button"
                onClick={() => {
                  setSymbolInput('');
                  setShowSearchSuggestions(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-2.5 top-1/2 -translate-y-1/2"
                title="مسح الحقل"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Auto-complete Dropdown */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {searchSuggestions.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelectPill(item.symbol)}
                    className="w-full px-3.5 py-2 text-right hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        {item.symbol}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                        {item.name}
                      </span>
                    </div>
                    {item.price ? (
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ${item.price.toFixed(2)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isFetchingQuote || !symbolInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuote ? 'animate-spin' : ''}`} />
            <span>{isFetchingQuote ? 'جاري التحديث...' : 'تحديث السعر الحي'}</span>
          </button>

          {currentMarketPrice && currentMarketPrice > 0 && (
            <button
              type="button"
              onClick={applyCurrentMarketAsBuy}
              className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap cursor-pointer"
              title="تطبيق السعر السوقي الحالي كسعر شراء"
            >
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span>استخدام السعر الحالي</span>
            </button>
          )}

          {onOpenScientificAnalysis && (
            <button
              type="button"
              onClick={() => onOpenScientificAnalysis(symbol)}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap active:scale-95 cursor-pointer shadow-xs"
              title={`فتح صفحة السهم والتحليل العلمي الكامل لسهم ${symbol}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>صفحة السهم والتحليل العلمي</span>
            </button>
          )}
        </form>

        {quoteError && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}

        {/* Quick Stock Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-1">أسهم سريعة:</span>
          {Array.from(new Set([...(watchlistStocks.map(s => s.symbol)), ...POPULAR_SYMBOLS])).slice(0, 10).map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleSelectPill(sym)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                symbol === sym
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ======================= DUAL VIEW SWITCHER TABS ======================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setCalculatorViewTab('SCIENTIFIC_REASONING')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            calculatorViewTab === 'SCIENTIFIC_REASONING'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>التحليل العلمي والكمي للسهم ({symbol})</span>
        </button>

        <button
          type="button"
          onClick={() => setCalculatorViewTab('FEES_VERDICT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            calculatorViewTab === 'FEES_VERDICT'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>الجدوى المالية وتغطية العمولات ({activeBroker.name_ar})</span>
        </button>
      </div>

      {/* ======================= TAB 1: SCIENTIFIC REASONING & QUANTITATIVE ANALYSIS ======================= */}
      {calculatorViewTab === 'SCIENTIFIC_REASONING' && scientificAnalysis && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 space-y-4 animate-fadeIn">
          
          {/* Header Verdict & Score */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                {scientificAnalysis.decision === 'BUY_CANDIDATE' ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : scientificAnalysis.decision === 'WAIT' ? (
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center shadow-md">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {scientificAnalysis.decision === 'BUY_CANDIDATE'
                        ? 'مرشح للشراء (إشارة علمية مؤكدة)'
                        : scientificAnalysis.decision === 'WAIT'
                        ? 'انتظار وتأكيد الإشارة'
                        : 'توقف عن الشراء / تجنب'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {scientificAnalysis.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {scientificAnalysis.decisionReasonAr}
                  </p>
                </div>
              </div>
            </div>

            {/* Scientific Gauges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">الدرجة الكمية</span>
                <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {scientificAnalysis.investmentScore}/100
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">درجة الزخم</span>
                <span className="text-sm font-mono font-black text-cyan-600 dark:text-cyan-400">
                  {scientificAnalysis.momentumScore}/100
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">المخاطر</span>
                <span className={`text-sm font-mono font-black ${scientificAnalysis.riskScore > 60 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {scientificAnalysis.riskScore}/100
                </span>
              </div>
              {onOpenScientificAnalysis && (
                <button
                  type="button"
                  onClick={() => onOpenScientificAnalysis(symbol)}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>التحليل الشامل الكامل</span>
                </button>
              )}
            </div>
          </div>

          {/* Executive Advisory Synthesis Card */}
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{scientificAnalysis.summaryArabic.headline}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {scientificAnalysis.summaryArabic.body}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                <strong className="block text-[11px] font-bold mb-0.5 text-emerald-700 dark:text-emerald-300">
                  التوجيه السعري ونطاق الدخول:
                </strong>
                <span>{scientificAnalysis.summaryArabic.entryGuidance}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
                <strong className="block text-[11px] font-bold mb-0.5 text-rose-700 dark:text-rose-300">
                  الحماية والوقف العلمي:
                </strong>
                <span>{scientificAnalysis.summaryArabic.stopGuidance}</span>
              </div>
            </div>
          </div>

          {/* 6 Quantitative Real-Time Factors Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            
            {/* RSI */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">RSI (14)</span>
              <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {scientificAnalysis.technicals.rsi14.toFixed(1)}
              </div>
              <span className="text-[9px] text-slate-400 block truncate">
                {scientificAnalysis.technicals.rsi14 >= 70 ? 'تشبع شرائي' : (scientificAnalysis.technicals.rsi14 <= 30 ? 'تشبع بيعي' : 'متوازن')}
              </span>
            </div>

            {/* VWAP */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">متوسط VWAP</span>
              <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400">
                ${scientificAnalysis.technicals.vwap}
              </div>
              <span className="text-[9px] text-slate-400 block truncate">
                {scientificAnalysis.price >= scientificAnalysis.technicals.vwap ? 'أعلى المتوسط (+)' : 'أسفل المتوسط (-)'}
              </span>
            </div>

            {/* RVOL */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">الحجم النسبي RVOL</span>
              <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {scientificAnalysis.volumeDynamics.rvol}x
              </div>
              <span className="text-[9px] text-slate-400 block truncate">
                {scientificAnalysis.volumeDynamics.rvolDescriptionAr}
              </span>
            </div>

            {/* Velocity */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">السرعة اللحظية</span>
              <div className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                {scientificAnalysis.velocity.priceVelocity}%/س
              </div>
              <span className="text-[9px] text-slate-400 block truncate">
                {scientificAnalysis.velocity.change1d >= 0 ? 'صعود لحظي' : 'هبوط لحظي'}
              </span>
            </div>

            {/* Nearest Support */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">أقرب دعم فني</span>
              <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ${scientificAnalysis.levels.nearestSupport}
              </div>
              <span className="text-[9px] text-slate-400 block truncate">مستوى ارتداد</span>
            </div>

            {/* Nearest Resistance */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">أقرب مقاومة</span>
              <div className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                ${scientificAnalysis.levels.nearestResistance}
              </div>
              <span className="text-[9px] text-slate-400 block truncate">مستوى جني أرباح</span>
            </div>

          </div>

          {/* Quick Apply Scientific Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">تطبيق المستويات العلمية على الحاسبة:</span>
            
            <button
              type="button"
              onClick={applyScientificEntry}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition active:scale-95 cursor-pointer"
            >
              سعر الدخول (${scientificAnalysis.tradeSetup.preferredEntryMin})
            </button>

            <button
              type="button"
              onClick={applyScientificStopLoss}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-200 dark:hover:bg-rose-800 transition active:scale-95 cursor-pointer"
            >
              الوقف العلمي (${scientificAnalysis.tradeSetup.stopLoss})
            </button>

            <button
              type="button"
              onClick={applyScientificTarget1}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 hover:bg-cyan-200 dark:hover:bg-cyan-800 transition active:scale-95 cursor-pointer"
            >
              الهدف 1 (${scientificAnalysis.tradeSetup.target1})
            </button>

            <button
              type="button"
              onClick={applyScientificTarget2}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800 transition active:scale-95 cursor-pointer"
            >
              الهدف 2 (${scientificAnalysis.tradeSetup.target2})
            </button>
          </div>

        </div>
      )}

      {/* ======================= TAB 2: BROKERAGE FEES & VERDICT CARD ======================= */}
      {calculatorViewTab === 'FEES_VERDICT' && (
        <div className={`p-4 sm:p-5 rounded-2xl border ${decisionVerdict.badgeClass} bg-opacity-10 dark:bg-opacity-10 space-y-4 animate-fadeIn`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {decisionVerdict.verdict === 'BUY' ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : decisionVerdict.verdict === 'WAIT' ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                    نتيجة التحليل وقرار الشراء المقترح للسهم ({symbol})
                  </span>
                  <h3 className="text-base sm:text-lg font-black">{decisionVerdict.verdictAr}</h3>
                </div>
              </div>
            </div>

            {/* Trade Score Gauge */}
            <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">مؤشر الجدوى المالية</span>
                <span className="text-base font-black font-mono">{decisionVerdict.score} / 100</span>
              </div>
              <div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    decisionVerdict.score >= 70 ? 'bg-emerald-500' : decisionVerdict.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${decisionVerdict.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Verdict Summary & Action Guidance */}
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {decisionVerdict.summaryAr}
          </p>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5 text-slate-900 dark:text-white">توجيه التنفيذ المقترح:</strong>
              <span>{decisionVerdict.actionGuidanceAr}</span>
            </div>
          </div>

          {/* Action Decision Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">سعر نقطة التعادل</span>
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ${decisionVerdict.breakEvenPrice.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400">+{decisionVerdict.breakEvenGapPercent}% لتغطية الرسوم</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">صافي الربح المتوقع</span>
              <div className={`text-sm font-bold font-mono ${calcResult.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {calcResult.isProfitable ? '+' : ''}${calcResult.netProfit.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400">{calcResult.profitPercent.toFixed(2)}% صافي العائد</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">نسبة التهام العمولات</span>
              <div className={`text-sm font-bold font-mono ${decisionVerdict.isFeeDragDangerous ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {decisionVerdict.feeDragPercent}%
              </div>
              <span className="text-[9px] text-slate-400">من إجمالي الأرباح</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">نسبة العائد / المخاطرة</span>
              <div className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                1 : {decisionVerdict.riskRewardRatio}
              </div>
              <span className="text-[9px] text-slate-400">R:R Ratio</span>
            </div>
          </div>

          {/* Decision Reasons & Warnings list */}
          {(decisionVerdict.prosAr.length > 0 || decisionVerdict.warningsAr.length > 0) && (
            <div className="space-y-1.5 pt-1">
              {decisionVerdict.prosAr.map((p, i) => (
                <div key={i} className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
              {decisionVerdict.warningsAr.map((w, i) => (
                <div key={i} className="text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Inputs + Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Trade Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-4">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>مدخلات الصفقة المالية</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{symbol}</span>
            </div>

            {/* Buy Price */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                <span>سعر الشراء ($)</span>
                <span className="font-mono text-slate-500">Buy Price</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={buyPrice || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setBuyPrice(val);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Shares / Quantity */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                <span>عدد الأسهم</span>
                <span className="font-mono text-slate-500">Shares Quantity</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={shares || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setShares(val);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Layers className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Target Sell Price */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                <span>سعر البيع المستهدف ($)</span>
                <span className="font-mono text-slate-500">Target Sell Price</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sellPrice || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSellPrice(val);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Quick Target Presets */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[2, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPercentTarget(pct)}
                    className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition active:scale-95"
                  >
                    +{pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={applyBreakEvenTarget}
                  className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition active:scale-95"
                >
                  التعادل
                </button>
              </div>
            </div>

            {/* Stop Loss Price */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                <span>سعر وقف الخسارة ($)</span>
                <span className="font-mono text-slate-500">Stop Loss</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stopLossPrice || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setStopLossPrice(val);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Quick Stop Presets */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[2, 3, 5, 8].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPercentStop(pct)}
                    className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition active:scale-95"
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Collapsible Advanced Fee Overrides */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowAdvancedFees(!showAdvancedFees)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>تعديل رسوم الوسيط المخصصة (اختياري)</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFees ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedFees && (
                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">عمولة الشراء ($ أو %):</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`الافتراضي (${activeBroker.buy_commission_value})`}
                      value={customBuyComm ?? ''}
                      onChange={(e) => setCustomBuyComm(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">عمولة البيع ($ أو %):</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`الافتراضي (${activeBroker.sell_commission_value})`}
                      value={customSellComm ?? ''}
                      onChange={(e) => setCustomSellComm(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">نسبة ضريبة القيمة المضافة VAT (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder={`الافتراضي (${activeBroker.vat_rate}%)`}
                      value={customVatRate ?? ''}
                      onChange={(e) => setCustomVatRate(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveWatchlist}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>حفظ بيانات الصفقة في قائمة المتابعة</span>
              </button>

              <button
                type="button"
                onClick={handleSavePortfolio}
                className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Briefcase className="w-4 h-4 text-emerald-500" />
                <span>إضافة المركز إلى المحفظة الاستثمارية</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Detailed Analytics & Fee Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Executive Results Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي التكلفة ورأس المال المطلوب</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                ${calcResult.totalCost.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                سعر الشراء الفعلي: <strong className="font-mono text-slate-600 dark:text-slate-300">${calcResult.effectiveCostPerShare.toFixed(3)}</strong> / سهم
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">إجمالي حصيلة البيع الصافية</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                ${calcResult.netSellAmount.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                بعد خصم كافة عمولات البيع والضريبة
              </span>
            </div>
          </div>

          {/* Fee Itemization Breakdown Table */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>تفصيل كافة الرسوم والعمولات والضرائب ({activeBroker.name_ar})</span>
              </h4>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                المجموع: ${calcResult.totalFees.toFixed(2)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-mono">
                    <th className="py-2 px-2">بند الرسوم</th>
                    <th className="py-2 px-2">عند الشراء</th>
                    <th className="py-2 px-2">عند البيع</th>
                    <th className="py-2 px-2">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 font-mono text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-2 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">عمولة الوسيط التداولية</td>
                    <td className="py-2 px-2">${calcResult.buyCommission.toFixed(2)}</td>
                    <td className="py-2 px-2">${calcResult.sellCommission.toFixed(2)}</td>
                    <td className="py-2 px-2 font-bold text-slate-900 dark:text-slate-100">
                      ${(calcResult.buyCommission + calcResult.sellCommission).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">رسوم المنصة والتبادل</td>
                    <td className="py-2 px-2">${(calcResult.buyBrokerFee + calcResult.buyExchangeFee).toFixed(3)}</td>
                    <td className="py-2 px-2">${(calcResult.sellBrokerFee + calcResult.sellExchangeFee).toFixed(3)}</td>
                    <td className="py-2 px-2 font-bold">
                      ${(calcResult.buyBrokerFee + calcResult.buyExchangeFee + calcResult.sellBrokerFee + calcResult.sellExchangeFee).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">الرسوم التنظيمية (SEC / FINRA)</td>
                    <td className="py-2 px-2">${calcResult.buyRegulatoryFee.toFixed(3)}</td>
                    <td className="py-2 px-2">${calcResult.sellRegulatoryFee.toFixed(3)}</td>
                    <td className="py-2 px-2 font-bold">
                      ${(calcResult.buyRegulatoryFee + calcResult.sellRegulatoryFee).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">ضريبة القيمة المضافة (VAT)</td>
                    <td className="py-2 px-2">${calcResult.buyVat.toFixed(2)}</td>
                    <td className="py-2 px-2">${calcResult.sellVat.toFixed(2)}</td>
                    <td className="py-2 px-2 font-bold text-amber-600 dark:text-amber-400">
                      ${(calcResult.buyVat + calcResult.sellVat).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                    <td className="py-2 px-2 font-sans text-slate-900 dark:text-white">إجمالي الرسوم المستقطعة</td>
                    <td className="py-2 px-2 text-rose-500">${calcResult.totalBuyFees.toFixed(2)}</td>
                    <td className="py-2 px-2 text-rose-500">${calcResult.totalSellFees.toFixed(2)}</td>
                    <td className="py-2 px-2 text-rose-600 dark:text-rose-400">${calcResult.totalFees.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Break-Even Analytical Guarantee Note */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-emerald-400 block font-bold">قاعدة الأمان المالي وسعر التعادل:</strong>
              <p className="text-slate-300 leading-relaxed">
                لكي لا تتكبد أي خسارة على هذه الصفقة بعد دفع كافة العمولات ورسوم التداول وضريبة VAT لمنصة {activeBroker.name_ar}، يجب ألا يقل سعر البيع عن{' '}
                <span className="font-mono text-emerald-400 font-black">${calcResult.breakEvenPrice.toFixed(2)}</span>{' '}
                (فارق <span className="font-mono text-cyan-300 font-bold">+{(((calcResult.breakEvenPrice - buyPrice) / (buyPrice || 1)) * 100).toFixed(2)}%</span> عن سعر الشراء).
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
