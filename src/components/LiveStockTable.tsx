import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Trash2, 
  ExternalLink, 
  Bell, 
  BellOff, 
  AlertTriangle, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  AlertCircle
} from 'lucide-react';
import { StockItem, FilterType, SortField, SortDirection, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';

interface LiveStockTableProps {
  stocks: StockItem[];
  lang: Language;
  onUpdateAlerts: (symbol: string, upperAlert: number | null, lowerAlert: number | null, alertsEnabled: boolean) => void;
  onDeleteStock: (symbol: string) => void;
  onClearAllStocks?: () => void;
  onSelectStock: (symbol: string) => void;
  onTestTriggerAlert: (stock: StockItem) => void;
}

export const LiveStockTable: React.FC<LiveStockTableProps> = ({
  stocks,
  lang,
  onUpdateAlerts,
  onDeleteStock,
  onClearAllStocks,
  onSelectStock,
  onTestTriggerAlert,
}) => {
  const t = getTranslation(lang);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [stockToDelete, setStockToDelete] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const pageSize = 20;

  // Local editing states for alert inputs
  const [editingAlerts, setEditingAlerts] = useState<Record<string, { upper: string; lower: string }>>({});

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedStocks = useMemo(() => {
    let list = [...stocks];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s => 
        s.symbol.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.sector && s.sector.toLowerCase().includes(q)) ||
        (s.industry && s.industry.toLowerCase().includes(q))
      );
    }

    // Category filter
    switch (filterType) {
      case 'RISING':
        list = list.filter(s => s.changePercent > 0);
        break;
      case 'FALLING':
        list = list.filter(s => s.changePercent < 0);
        break;
      case 'ALERTS_ENABLED':
        list = list.filter(s => s.alertsEnabled && (s.upperAlert !== null || s.lowerAlert !== null));
        break;
      case 'UPPER_ALERT':
        list = list.filter(s => s.upperAlert !== null);
        break;
      case 'LOWER_ALERT':
        list = list.filter(s => s.lowerAlert !== null);
        break;
      case 'NO_ALERTS':
        list = list.filter(s => s.upperAlert === null && s.lowerAlert === null);
        break;
      case 'ALL':
      default:
        break;
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof StockItem] ?? 0;
      let valB: any = b[sortField as keyof StockItem] ?? 0;

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [stocks, searchQuery, filterType, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedStocks.length / pageSize) || 1;
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedStocks.slice(start, start + pageSize);
  }, [filteredAndSortedStocks, currentPage]);

  const handleAlertInputChange = (symbol: string, field: 'upper' | 'lower', value: string) => {
    setEditingAlerts(prev => ({
      ...prev,
      [symbol]: {
        upper: field === 'upper' ? value : (prev[symbol]?.upper ?? ''),
        lower: field === 'lower' ? value : (prev[symbol]?.lower ?? ''),
      },
    }));
  };

  const handleSaveAlerts = (stock: StockItem) => {
    const edit = editingAlerts[stock.symbol];
    const upperVal = edit?.upper !== undefined 
      ? (edit.upper.trim() === '' ? null : parseFloat(edit.upper)) 
      : stock.upperAlert;
    const lowerVal = edit?.lower !== undefined 
      ? (edit.lower.trim() === '' ? null : parseFloat(edit.lower)) 
      : stock.lowerAlert;

    onUpdateAlerts(
      stock.symbol, 
      isNaN(upperVal as any) ? null : upperVal, 
      isNaN(lowerVal as any) ? null : lowerVal, 
      stock.alertsEnabled
    );

    // Clear local edit tracking for this stock
    setEditingAlerts(prev => {
      const copy = { ...prev };
      delete copy[stock.symbol];
      return copy;
    });
  };

  const formatVolume = (vol: number) => {
    if (!vol) return '-';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  const filterButtons: { type: FilterType; label: string; count?: number }[] = [
    { type: 'ALL', label: t.filters.all, count: stocks.length },
    { type: 'RISING', label: t.filters.rising, count: stocks.filter(s => s.changePercent > 0).length },
    { type: 'FALLING', label: t.filters.falling, count: stocks.filter(s => s.changePercent < 0).length },
    { type: 'ALERTS_ENABLED', label: t.filters.alertsEnabled, count: stocks.filter(s => s.alertsEnabled && (s.upperAlert || s.lowerAlert)).length },
    { type: 'UPPER_ALERT', label: t.filters.upperAlert, count: stocks.filter(s => s.upperAlert !== null).length },
    { type: 'LOWER_ALERT', label: t.filters.lowerAlert, count: stocks.filter(s => s.lowerAlert !== null).length },
    { type: 'NO_ALERTS', label: t.filters.noAlerts, count: stocks.filter(s => s.upperAlert === null && s.lowerAlert === null).length },
  ];

  const confirmDelete = (symbol: string) => {
    onDeleteStock(symbol);
    setStockToDelete(null);
  };

  return (
    <div className="bg-[#161b22] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col font-sans">
      
      {/* Controls Bar: Search & Filter Tabs & Clear Options */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row gap-3.5 justify-between items-stretch lg:items-center bg-[#161b22]">
        
        {/* Search Field */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
          <input
            id="input-search-stocks"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t.actions.searchPlaceholder}
            className="w-full pl-9 pr-8 rtl:pl-8 rtl:pr-9 py-2 rounded-xl text-sm bg-[#0a0b0d] border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-sans transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-auto rtl:left-3 text-xs text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {filterButtons.map((btn) => (
            <button
              key={btn.type}
              id={`filter-${btn.type.toLowerCase()}`}
              onClick={() => {
                setFilterType(btn.type);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 font-sans ${
                filterType === btn.type
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-[#0a0b0d] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <span>{btn.label}</span>
              {btn.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  filterType === btn.type 
                    ? 'bg-emerald-500/30 text-emerald-200' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {btn.count}
                </span>
              )}
            </button>
          ))}

          {/* Optional Clear All Button */}
          {onClearAllStocks && stocks.length > 0 && (
            <button
              id="btn-clear-all-stocks"
              onClick={() => setIsConfirmingClearAll(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5 font-sans"
              title={t.actions.clearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.actions.clearAll}</span>
            </button>
          )}
        </div>

      </div>

      {/* Main Stock Data Table */}
      <div className="overflow-x-auto relative scroll-smooth">
        {/* Mobile Horizontal Scroll Indicator Prompt */}
        <div className="sm:hidden flex items-center justify-between px-3 py-1.5 bg-slate-900/80 text-[11px] text-slate-400 border-b border-slate-800 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {lang === 'ar' ? 'اسحب أفقياً لعرض كل البيانات' : 'Swipe horizontally for more columns'}
          </span>
          <span className="text-slate-500">↔</span>
        </div>
        
        <table className="w-full text-left rtl:text-right border-collapse min-w-[960px]">
          
          {/* Sticky Header */}
          <thead className="bg-[#1a202c] text-xs font-bold text-slate-300 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700 font-sans">
            <tr>
              <th className="py-3.5 px-3 w-12 text-center text-rose-400" title={t.actions.deleteStock}>
                {t.actions.deleteStock}
              </th>
              
              <th className="py-3.5 px-3 w-12 text-center">{t.table.alerts}</th>
              
              <th 
                className="py-3.5 px-3 cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.table.ticker}</span>
                  {sortField === 'symbol' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />)}
                </div>
              </th>

              <th 
                className="py-3.5 px-3 cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('companyName')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.table.company}</span>
                  {sortField === 'companyName' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />)}
                </div>
              </th>

              <th className="py-3.5 px-3">{t.table.sector}</th>

              <th 
                className="py-3.5 px-3 cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.table.price}</span>
                  {sortField === 'price' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />)}
                </div>
              </th>

              <th 
                className="py-3.5 px-3 cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('changePercent')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.table.changePercent}</span>
                  {sortField === 'changePercent' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />)}
                </div>
              </th>

              <th className="py-3.5 px-3">{t.table.dayRange}</th>

              <th 
                className="py-3.5 px-3 cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center gap-1.5">
                  <span>{t.table.volume}</span>
                  {sortField === 'volume' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />)}
                </div>
              </th>

              {/* Upper Alert Input Column */}
              <th className="py-3.5 px-3 text-emerald-400">
                <div className="flex items-center gap-1">
                  <span>{t.table.upperAlert}</span>
                  <span className="text-sm">↗</span>
                </div>
              </th>

              {/* Lower Alert Input Column */}
              <th className="py-3.5 px-3 text-rose-400">
                <div className="flex items-center gap-1">
                  <span>{t.table.lowerAlert}</span>
                  <span className="text-sm">↘</span>
                </div>
              </th>

              <th className="py-3.5 px-3 text-center">{t.table.status}</th>
              <th className="py-3.5 px-3 text-center w-24">{t.table.actions}</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800 text-sm">
            {paginatedStocks.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <SlidersHorizontal className="w-9 h-9 text-slate-500 opacity-60" />
                    <p className="font-bold text-base text-slate-200 font-sans">{t.table.noStocks}</p>
                    <p className="text-sm text-slate-400 max-w-md font-sans">{t.table.emptyListPrompt}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                const flashClass = stock.flashStatus === 'up' 
                  ? 'price-flash-up' 
                  : stock.flashStatus === 'down' 
                  ? 'price-flash-down' 
                  : '';

                const upperEditVal = editingAlerts[stock.symbol]?.upper !== undefined
                  ? editingAlerts[stock.symbol].upper
                  : (stock.upperAlert !== null ? stock.upperAlert.toString() : '');

                const lowerEditVal = editingAlerts[stock.symbol]?.lower !== undefined
                  ? editingAlerts[stock.symbol].lower
                  : (stock.lowerAlert !== null ? stock.lowerAlert.toString() : '');

                const hasEdits = editingAlerts[stock.symbol] !== undefined;

                return (
                  <tr 
                    key={stock.symbol}
                    id={`stock-row-${stock.symbol}`}
                    className={`hover:bg-slate-800/50 transition-colors border-b border-slate-800 ${flashClass}`}
                  >
                    
                    {/* Dedicated Delete Button (In front of each stock) */}
                    <td className="py-3 px-3 text-center">
                      <button
                        id={`btn-delete-stock-${stock.symbol}`}
                        onClick={() => setStockToDelete(stock.symbol)}
                        title={`${t.actions.deleteStock} ${stock.symbol}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Alert Enable Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        id={`toggle-alert-${stock.symbol}`}
                        onClick={() => onUpdateAlerts(stock.symbol, stock.upperAlert, stock.lowerAlert, !stock.alertsEnabled)}
                        title={stock.alertsEnabled ? t.table.active : t.table.disabled}
                        className={`p-2 rounded-lg transition-all ${
                          stock.alertsEnabled
                            ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40 hover:bg-amber-400/25'
                            : 'bg-[#0a0b0d] text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        {stock.alertsEnabled ? (
                          <Bell className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Ticker & Exchange */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => onSelectStock(stock.symbol)}
                          className="font-bold text-emerald-400 font-mono hover:text-emerald-300 text-left rtl:text-right flex items-center gap-1.5 group transition-colors tracking-wide text-sm sm:text-base"
                        >
                          <span>{stock.symbol}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {stock.exchange && (
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                            {stock.exchange}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company Name */}
                    <td className="py-3 px-3 max-w-[200px]">
                      <div className="flex flex-col truncate">
                        <span className="font-sans font-medium text-slate-200 truncate text-sm" title={stock.companyName}>
                          {stock.companyName || stock.symbol}
                        </span>
                      </div>
                    </td>

                    {/* Sector / Industry */}
                    <td className="py-3 px-3 max-w-[160px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-300 bg-slate-800/80 border border-slate-700/60 font-sans truncate" title={stock.sector}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{stock.sector || 'General'}</span>
                      </span>
                    </td>

                    {/* Current Price */}
                    <td className="py-3 px-3 font-mono font-bold text-white text-base">
                      {stock.price > 0 ? `$${stock.price.toFixed(2)}` : (
                        <span className="text-sm text-slate-400 font-normal">Loading...</span>
                      )}
                    </td>

                    {/* Change % & Change $ */}
                    <td className="py-3 px-3 font-mono">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold text-xs sm:text-sm ${
                        isPositive 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                        <span className="text-xs opacity-80 hidden sm:inline">
                          ({isPositive ? '+' : ''}${stock.change.toFixed(2)})
                        </span>
                      </div>
                    </td>

                    {/* Day Range (High / Low) */}
                    <td className="py-3 px-3 font-mono text-xs text-slate-300">
                      {stock.dayHigh > 0 && stock.dayLow > 0 ? (
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-emerald-400 font-mono font-semibold">H: ${stock.dayHigh.toFixed(2)}</span>
                          <span className="text-rose-400 font-mono font-semibold">L: ${stock.dayLow.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 font-mono text-xs sm:text-sm text-slate-300 font-semibold">
                      {formatVolume(stock.volume)}
                    </td>

                    {/* Upper Alert Input */}
                    <td className="py-3 px-3">
                      <div className="relative w-24">
                        <input
                          id={`input-upper-${stock.symbol}`}
                          type="number"
                          step="0.01"
                          placeholder={t.table.setAlert}
                          value={upperEditVal}
                          onChange={(e) => handleAlertInputChange(stock.symbol, 'upper', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveAlerts(stock)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#0a0b0d] border border-slate-700 text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                        />
                      </div>
                    </td>

                    {/* Lower Alert Input */}
                    <td className="py-3 px-3">
                      <div className="relative w-24">
                        <input
                          id={`input-lower-${stock.symbol}`}
                          type="number"
                          step="0.01"
                          placeholder={t.table.setAlert}
                          value={lowerEditVal}
                          onChange={(e) => handleAlertInputChange(stock.symbol, 'lower', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveAlerts(stock)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#0a0b0d] border border-slate-700 text-rose-400 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all font-bold"
                        />
                      </div>
                    </td>

                    {/* Alert Status Indicator */}
                    <td className="py-3 px-3 text-center font-sans">
                      {stock.upperCrossedState ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500 text-black shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t.table.crossedUpper}</span>
                        </span>
                      ) : stock.lowerCrossedState ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500 text-white shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t.table.crossedLower}</span>
                        </span>
                      ) : stock.alertsEnabled && (stock.upperAlert !== null || stock.lowerAlert !== null) ? (
                        <span className="text-xs font-semibold text-amber-400">
                          {t.table.normal}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Save Alert changes if modified */}
                        {hasEdits && (
                          <button
                            id={`btn-save-${stock.symbol}`}
                            onClick={() => handleSaveAlerts(stock)}
                            title={t.actions.save}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {/* Test Alert Button */}
                        <button
                          id={`btn-test-alert-${stock.symbol}`}
                          onClick={() => onTestTriggerAlert(stock)}
                          title={t.actions.testAlert}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        {/* Open Analysis View */}
                        <button
                          id={`btn-view-${stock.symbol}`}
                          onClick={() => onSelectStock(stock.symbol)}
                          title={t.actions.viewDetails}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* Quick Delete */}
                        <button
                          id={`btn-quick-delete-${stock.symbol}`}
                          onClick={() => setStockToDelete(stock.symbol)}
                          title={t.actions.deleteStock}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {/* Pagination Footer */}
      {filteredAndSortedStocks.length > pageSize && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-mono bg-[#161b22]">
          <div>
            {lang === 'ar' 
              ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(currentPage * pageSize, filteredAndSortedStocks.length)} من أصل ${filteredAndSortedStocks.length} سهم`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredAndSortedStocks.length)} of ${filteredAndSortedStocks.length} stocks`
            }
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-prev-page"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-[#0a0b0d] disabled:opacity-30 hover:bg-slate-800 transition-all text-slate-300"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <span className="font-bold text-slate-100 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              id="btn-next-page"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-[#0a0b0d] disabled:opacity-30 hover:bg-slate-800 transition-all text-slate-300"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Stock Delete Confirmation Modal */}
      {stockToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-sans">{t.actions.deleteStock}</h3>
            </div>
            
            <p className="text-sm text-slate-300 font-sans mb-6">
              {lang === 'ar' 
                ? `هل أنت متأكد من حذف السهم (${stockToDelete}) من قائمة المراقبة وقاعدة بيانات SQLite؟`
                : `Are you sure you want to delete (${stockToDelete}) from live monitoring and SQLite database?`
              }
            </p>

            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                onClick={() => setStockToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {t.actions.cancel}
              </button>
              <button
                id="btn-confirm-delete-stock"
                onClick={() => confirmDelete(stockToDelete)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20"
              >
                {t.actions.deleteStock}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-sans">{t.actions.clearAll}</h3>
            </div>
            
            <p className="text-sm text-slate-300 font-sans mb-6">
              {lang === 'ar' 
                ? 'هل أنت متأكد من رغبتك في حذف جميع الأسهم المراقبة من قاعدة البيانات SQLite؟'
                : 'Are you sure you want to delete ALL stocks from SQLite database and watchlist?'
              }
            </p>

            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {t.actions.cancel}
              </button>
              <button
                id="btn-confirm-clear-all"
                onClick={() => {
                  if (onClearAllStocks) onClearAllStocks();
                  setIsConfirmingClearAll(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20"
              >
                {t.actions.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
