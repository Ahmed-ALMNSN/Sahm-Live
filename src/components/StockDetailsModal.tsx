import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Globe, 
  DollarSign, 
  BarChart2, 
  Bell, 
  Check, 
  RefreshCw, 
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Line 
} from 'recharts';
import { StockItem, ChartDataPoint, CompanyProfile, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { apiService } from '../services/api.js';

interface StockDetailsModalProps {
  stock: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onUpdateAlerts: (symbol: string, upperAlert: number | null, lowerAlert: number | null, alertsEnabled: boolean) => void;
}

export const StockDetailsModal: React.FC<StockDetailsModalProps> = ({
  stock,
  isOpen,
  onClose,
  lang,
  onUpdateAlerts,
}) => {
  const t = getTranslation(lang);

  const [selectedRange, setSelectedRange] = useState<string>('1M');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [showSma, setShowSma] = useState(true);

  // Local alert inputs
  const [upperVal, setUpperVal] = useState<string>('');
  const [lowerVal, setLowerVal] = useState<string>('');
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (stock && isOpen) {
      setUpperVal(stock.upperAlert !== null ? stock.upperAlert.toString() : '');
      setLowerVal(stock.lowerAlert !== null ? stock.lowerAlert.toString() : '');
      setAlertsEnabled(stock.alertsEnabled);
      loadChartData(stock.symbol, selectedRange);
      loadProfile(stock.symbol);
    }
  }, [stock?.symbol, isOpen, selectedRange]);

  const loadChartData = async (symbol: string, range: string) => {
    setIsLoadingChart(true);
    const data = await apiService.fetchChart(symbol, range);
    setChartData(data);
    setIsLoadingChart(false);
  };

  const loadProfile = async (symbol: string) => {
    const data = await apiService.fetchProfile(symbol);
    setProfile(data);
  };

  if (!isOpen || !stock) return null;

  const isPositive = stock.change >= 0;
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';

  const handleSaveAlerts = () => {
    const u = upperVal.trim() ? parseFloat(upperVal) : null;
    const l = lowerVal.trim() ? parseFloat(lowerVal) : null;
    onUpdateAlerts(
      stock.symbol,
      isNaN(u as any) ? null : u,
      isNaN(l as any) ? null : l,
      alertsEnabled
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const formatLargeNum = (num?: number) => {
    if (!num) return '-';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const timeRanges = ['1D', '5D', '1M', '3M', '6M', '1Y'];

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-white dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col font-sans animate-slide-in transition-colors duration-200">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#161b22] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-slate-900 dark:text-white tracking-wider">
                  {stock.symbol}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#0a0b0d] text-slate-600 dark:text-slate-400 font-mono border border-slate-300 dark:border-slate-700 uppercase">
                  {stock.exchange || 'US Market'}
                </span>
                {profile?.sector && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline font-sans">
                    • {profile.sector}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md font-sans">
                {profile?.name || stock.companyName || stock.symbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Price badge */}
            <div className="text-right rtl:text-left">
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                ${stock.price.toFixed(2)}
              </div>
              <div className={`text-xs font-bold font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}% ({isPositive ? '+' : ''}${stock.change.toFixed(2)})
              </div>
            </div>

            <button
              id="btn-close-stock-details"
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>        {/* Modal Body: 1 Column on Mobile, 2 Columns on Large Screens */}
        <div className="p-4 sm:p-5 overflow-y-auto bg-white dark:bg-[#0f1115]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            
            {/* Column 1 (Left): Interactive Price Chart & Description */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#161b22] rounded-xl p-4 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                      {t.stockDetails.chart}
                    </span>
                    
                    {/* SMA indicator toggle */}
                    <button
                      type="button"
                      onClick={() => setShowSma(!showSma)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium border transition-colors ml-2 ${
                        showSma 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                          : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      SMA 20/50
                    </button>
                  </div>

                  {/* Timeframe Range Tabs */}
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-[#0a0b0d] p-0.5 rounded border border-slate-300 dark:border-slate-700">
                    {timeRanges.map((range) => (
                      <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-all uppercase ${
                          selectedRange === range
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart Canvas */}
                <div className="h-64 sm:h-72 w-full relative">
                  {isLoadingChart && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs rounded">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    </div>
                  )}

                  {chartData.length === 0 && !isLoadingChart ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                      No historical data available for this timeframe
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="stockPriceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#64748b' }} 
                          axisLine={{ stroke: '#94a3b8' }} 
                          tickLine={false} 
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          tick={{ fontSize: 10, fill: '#64748b' }} 
                          axisLine={{ stroke: '#94a3b8' }} 
                          tickLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            borderColor: '#475569', 
                            borderRadius: '0.375rem', 
                            color: '#f8fafc',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                          formatter={(val: any, name: string) => [`$${Number(val).toFixed(2)}`, name === 'close' ? 'Price' : name.toUpperCase()]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="close" 
                          stroke={strokeColor} 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#stockPriceGrad)" 
                        />

                        {/* SMA Overlays */}
                        {showSma && (
                          <Line 
                            type="monotone" 
                            dataKey="sma20" 
                            stroke="#f59e0b" 
                            strokeWidth={1.5} 
                            dot={false} 
                          />
                        )}
                        {showSma && (
                          <Line 
                            type="monotone" 
                            dataKey="sma50" 
                            stroke="#8b5cf6" 
                            strokeWidth={1.5} 
                            dot={false} 
                          />
                        )}

                        {/* Upper Alert Reference Line */}
                        {stock.upperAlert && (
                          <ReferenceLine 
                            y={stock.upperAlert} 
                            stroke="#10b981" 
                            strokeDasharray="4 4" 
                            label={{ 
                              value: `Upper Alert $${stock.upperAlert}`, 
                              fill: '#10b981', 
                              fontSize: 10,
                              position: 'top'
                            }} 
                          />
                        )}

                        {/* Lower Alert Reference Line */}
                        {stock.lowerAlert && (
                          <ReferenceLine 
                            y={stock.lowerAlert} 
                            stroke="#f43f5e" 
                            strokeDasharray="4 4" 
                            label={{ 
                              value: `Lower Alert $${stock.lowerAlert}`, 
                              fill: '#f43f5e', 
                              fontSize: 10,
                              position: 'bottom'
                            }} 
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Company Description */}
              {profile?.description && (
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-[#161b22] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-mono mb-1">
                    {t.stockDetails.stats.description}
                  </h4>
                  <p className="line-clamp-4 hover:line-clamp-none transition-all leading-relaxed font-sans text-slate-600 dark:text-slate-400">
                    {profile.description}
                  </p>
                </div>
              )}
            </div>

            {/* Column 2 (Right): Key Overview Statistics & Alert Configuration */}
            <div className="space-y-4">
              
              {/* Key Statistics Grid */}
              <div className="bg-slate-50 dark:bg-[#161b22] rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 font-mono">
                  <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>{t.stockDetails.overview}</span>
                </h3>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.open}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                      ${stock.open ? stock.open.toFixed(2) : '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.previousClose}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                      ${stock.previousClose ? stock.previousClose.toFixed(2) : '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.dayHigh}</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      ${stock.dayHigh ? stock.dayHigh.toFixed(2) : '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.dayLow}</span>
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400 text-sm">
                      ${stock.dayLow ? stock.dayLow.toFixed(2) : '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.marketCap}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                      {formatLargeNum(stock.marketCap || profile?.marketCap)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.peRatio}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                      {stock.peRatio ? stock.peRatio.toFixed(2) : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.sector}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block text-xs font-sans">
                      {profile?.sector || stock.sector || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">{t.stockDetails.stats.provider}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold block text-xs uppercase">
                      {stock.provider || 'Market Engine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alert Configuration Module */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 space-y-3 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                      {t.stockDetails.alertsConfig}
                    </span>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-mono">{t.table.active}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1 font-mono">
                      {t.table.upperAlert} ↗
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 240.00"
                      value={upperVal}
                      onChange={(e) => setUpperVal(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 mb-1 font-mono">
                      {t.table.lowerAlert} ↘
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 210.00"
                      value={lowerVal}
                      onChange={(e) => setLowerVal(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-white dark:bg-[#0a0b0d] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-save-stock-alerts"
                  onClick={handleSaveAlerts}
                  className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 font-mono"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>{savedSuccess ? t.actions.save : t.stockDetails.saveAlerts}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
