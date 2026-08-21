import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  PieChart,
  SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { PortfolioPosition, BrokeragePlatform, StockItem, Language } from '../types.js';
import { apiService } from '../services/api.js';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionUpdated?: () => void;
  watchlistStocks?: StockItem[];
  lang?: Language;
}

type ChartMetric = 'profit_dollar' | 'profit_pct' | 'daily_change' | 'value_vs_cost';

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  onPositionUpdated,
  watchlistStocks = [],
  lang = 'ar',
}) => {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [brokers, setBrokers] = useState<BrokeragePlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('profit_dollar');
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'table'>('overview');
  const [newSymbol, setNewSymbol] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newBuyPrice, setNewBuyPrice] = useState(150);
  const [newBrokerId, setNewBrokerId] = useState('broker_sahm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAr = lang === 'ar';

  const loadData = async () => {
    setLoading(true);
    try {
      const [posData, brokerData] = await Promise.all([
        apiService.fetchPortfolioPositions(),
        apiService.fetchBrokers(),
      ]);
      setPositions(posData || []);
      setBrokers(brokerData.brokers || []);
      if (brokerData.defaultBroker?.id) {
        setNewBrokerId(brokerData.defaultBroker.id);
      }
    } catch {
      setErrorMsg(isAr ? 'تعذر تحميل بيانات المحفظة' : 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsAdding(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Enrich positions with real-time watchlist quotes if available
  const enrichedPositions = useMemo(() => {
    return positions.map((p) => {
      const liveStock = watchlistStocks.find((s) => s.symbol.toUpperCase() === p.symbol.toUpperCase());
      const currentPrice = liveStock?.price ?? p.currentPrice ?? p.averageBuyPrice;
      const totalCost = p.quantity * p.averageBuyPrice;
      const marketValue = p.quantity * currentPrice;
      const unrealizedProfit = marketValue - totalCost;
      const unrealizedProfitPercent = totalCost > 0 ? (unrealizedProfit / totalCost) * 100 : 0;
      
      const dailyChangePerShare = liveStock?.change ?? 0;
      const dailyChangePercent = liveStock?.changePercent ?? 0;
      const dailyChangeTotalDollar = p.quantity * dailyChangePerShare;

      return {
        ...p,
        currentPrice,
        totalCost,
        marketValue,
        unrealizedProfit,
        unrealizedProfitPercent,
        dailyChangePerShare,
        dailyChangePercent,
        dailyChangeTotalDollar,
        companyName: liveStock?.companyName || p.companyName || p.symbol,
      };
    });
  }, [positions, watchlistStocks]);

  // Chart data mapping
  const chartData = useMemo(() => {
    return enrichedPositions.map((p) => ({
      symbol: p.symbol,
      companyName: p.companyName,
      profitDollar: Number(p.unrealizedProfit.toFixed(2)),
      profitPercent: Number(p.unrealizedProfitPercent.toFixed(2)),
      dailyChange: Number(p.dailyChangeTotalDollar.toFixed(2)),
      dailyChangePct: Number(p.dailyChangePercent.toFixed(2)),
      marketValue: Number(p.marketValue.toFixed(2)),
      totalCost: Number(p.totalCost.toFixed(2)),
      currentPrice: p.currentPrice,
      buyPrice: p.averageBuyPrice,
      quantity: p.quantity,
    }));
  }, [enrichedPositions]);

  // Portfolio Totals
  const totalCost = enrichedPositions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalMarketValue = enrichedPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalUnrealizedProfit = totalMarketValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalUnrealizedProfit / totalCost) * 100 : 0;
  const totalDailyChangeDollar = enrichedPositions.reduce((sum, p) => sum + p.dailyChangeTotalDollar, 0);
  const totalDailyChangePct = totalCost > 0 ? (totalDailyChangeDollar / totalCost) * 100 : 0;

  if (!isOpen) return null;

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رمز السهم' : 'Please enter a stock symbol');
      return;
    }

    try {
      await apiService.savePortfolioPosition({
        symbol: newSymbol.trim().toUpperCase(),
        quantity: Number(newQuantity),
        averageBuyPrice: Number(newBuyPrice),
        brokerId: newBrokerId,
      });
      setNewSymbol('');
      setIsAdding(false);
      await loadData();
      if (onPositionUpdated) onPositionUpdated();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر حفظ المركز في المحفظة' : 'Failed to save portfolio position'));
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المركز من المحفظة؟' : 'Are you sure you want to delete this position?')) {
      await apiService.deletePortfolioPosition(id);
      await loadData();
      if (onPositionUpdated) onPositionUpdated();
    }
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#161b22]/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono text-white min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
            <span className="font-bold text-sm text-emerald-400">{data.symbol}</span>
            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{data.companyName}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'الكمية:' : 'Qty:'}</span>
              <span className="font-bold text-white">{data.quantity}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
              <span className="font-bold text-slate-200">${data.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'القيمة السوقية:' : 'Market Value:'}</span>
              <span className="font-bold text-white">${data.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">{isAr ? 'الربح / الخسارة:' : 'P&L:'}</span>
              <span className={`font-bold flex items-center gap-0.5 ${data.profitDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.profitDollar >= 0 ? '+' : ''}${data.profitDollar} ({data.profitPercent >= 0 ? '+' : ''}{data.profitPercent}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isAr ? 'تغير اليوم:' : 'Daily Change:'}</span>
              <span className={`font-bold ${data.dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.dailyChange >= 0 ? '+' : ''}${data.dailyChange} ({data.dailyChangePct >= 0 ? '+' : ''}{data.dailyChangePct}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161b22]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {isAr ? 'المحفظة الاستثمارية والرسم البياني للأرباح' : 'Investment Portfolio & Profit Analytics'}
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {enrichedPositions.length} {isAr ? 'مراكز' : 'Positions'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'تحليل الأرباح والخسائر والتغيرات اليومية اللحظية للمحفظة' : 'Track real-time P&L, daily returns, and capital allocation'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Portfolio Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Cost */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                {isAr ? 'رأس المال المستثمر' : 'Invested Capital'}
              </span>
              <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Current Market Value */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                {isAr ? 'القيمة السوقية الحالية' : 'Current Market Value'}
              </span>
              <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
                ${totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Unrealized Profit */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border ${
                totalUnrealizedProfit >= 0
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
                  : 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
              }`}
            >
              <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1 font-medium">
                {isAr ? 'إجمالي الأرباح / الخسائر' : 'Total Profit / Loss'}
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span
                  className={`text-base sm:text-lg font-mono font-bold ${
                    totalUnrealizedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {totalUnrealizedProfit >= 0 ? '+' : '-'}${Math.abs(totalUnrealizedProfit).toFixed(2)}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  ({totalUnrealizedProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Daily Change */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border ${
                totalDailyChangeDollar >= 0
                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
                  : 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-800/60'
              }`}
            >
              <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1 font-medium">
                {isAr ? 'التغير اليومي اللحظي' : 'Today\'s Daily Movement'}
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span
                  className={`text-base sm:text-lg font-mono font-bold ${
                    totalDailyChangeDollar >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {totalDailyChangeDollar >= 0 ? '+' : '-'}${Math.abs(totalDailyChangeDollar).toFixed(2)}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  ({totalDailyChangeDollar >= 0 ? '+' : ''}{totalDailyChangePct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* MAIN INTERACTIVE RECHARTS VISUALIZATION */}
          {enrichedPositions.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#161b22]/90 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              {/* Chart Header & Metric Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isAr ? 'الرسم البياني لأداء وتوزيع المحفظة' : 'Portfolio Performance & Allocation Chart'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {chartMetric === 'profit_dollar'
                        ? (isAr ? 'توزيع الأرباح والخسائر غير المحققة بالدولار ($)' : 'Unrealized Profit & Loss in USD ($)')
                        : chartMetric === 'profit_pct'
                        ? (isAr ? 'نسبة العائد الاستثماري لكل سهم (%)' : 'Percentage Return per Position (%)')
                        : chartMetric === 'daily_change'
                        ? (isAr ? 'مساهمة كل سهم في التغير اليومي اللحظي ($)' : 'Today\'s Daily Dollar Movement per Stock')
                        : (isAr ? 'مقارنة القيمة السوقية الحالية برأس المال المستثمر ($)' : 'Current Market Value vs Invested Capital ($)')}
                    </p>
                  </div>
                </div>

                {/* Metric Selector Buttons */}
                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-[#0d1117] p-1 rounded-xl overflow-x-auto no-scrollbar text-xs">
                  <button
                    onClick={() => setChartMetric('profit_dollar')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      chartMetric === 'profit_dollar'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isAr ? 'الأرباح ($)' : 'P&L ($)'}
                  </button>
                  <button
                    onClick={() => setChartMetric('profit_pct')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      chartMetric === 'profit_pct'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isAr ? 'العائد (%)' : 'Return (%)'}
                  </button>
                  <button
                    onClick={() => setChartMetric('daily_change')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      chartMetric === 'daily_change'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isAr ? 'تغير اليوم ($)' : 'Daily ($)'}
                  </button>
                  <button
                    onClick={() => setChartMetric('value_vs_cost')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      chartMetric === 'value_vs_cost'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isAr ? 'القيمة والتكلفة' : 'Value vs Cost'}
                  </button>
                </div>
              </div>

              {/* Chart Render Container */}
              <div className="h-60 sm:h-64 w-full pt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'value_vs_cost' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `$${val}`} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="totalCost" name={isAr ? 'التكلفة' : 'Cost'} fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="marketValue" name={isAr ? 'القيمة' : 'Value'} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(val) => chartMetric === 'profit_pct' ? `${val}%` : `$${val}`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                      <Bar
                        dataKey={
                          chartMetric === 'profit_dollar'
                            ? 'profitDollar'
                            : chartMetric === 'profit_pct'
                            ? 'profitPercent'
                            : 'dailyChange'
                        }
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry, index) => {
                          const val =
                            chartMetric === 'profit_dollar'
                              ? entry.profitDollar
                              : chartMetric === 'profit_pct'
                              ? entry.profitPercent
                              : entry.dailyChange;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={val >= 0 ? '#10b981' : '#ef4444'}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Chart Legend / Footnote */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 px-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>{isAr ? 'أرباح ومكاسب صاعدة' : 'Profits / Positive Gain'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>{isAr ? 'خسائر وتراجع' : 'Losses / Negative Return'}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {isAr ? 'محدث لحظياً مع أسعار السوق' : 'Realtime updated'}
                </span>
              </div>
            </div>
          )}

          {/* Add New Position Form */}
          {isAdding ? (
            <form onSubmit={handleAddPosition} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4 animate-slide-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'إضافة مركز جديد إلى المحفظة' : 'Add New Position'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    {isAr ? 'رمز السهم' : 'Symbol'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AAPL"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    {isAr ? 'سعر الشراء ($)' : 'Buy Price ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    {isAr ? 'الكمية (عدد الأسهم)' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    {isAr ? 'المنصة المالية' : 'Broker'}
                  </label>
                  <select
                    value={newBrokerId}
                    onChange={(e) => setNewBrokerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0d1117] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {isAr ? b.name_ar : b.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-xs"
                >
                  {isAr ? 'حفظ المركز' : 'Save Position'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isAr ? 'تفاصيل المراكز المفتوحة' : 'Holdings & Positions Breakdown'} ({enrichedPositions.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة مركز جديد' : 'Add Position'}</span>
              </button>
            </div>
          )}

          {/* Positions Table */}
          {enrichedPositions.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'لا توجد مراكز مفتوحة في المحفظة حالياً. أضف أسهمك لتفعيل الرسم البياني والتحليل اللحظي.' : 'No open positions in your portfolio. Add stocks to start tracking live profits.'}
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة أول مركز' : 'Add First Position'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-[#161b22] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'السهم' : 'Symbol'}</th>
                    <th className="py-3 px-4">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="py-3 px-4">{isAr ? 'سعر الشراء' : 'Buy Price'}</th>
                    <th className="py-3 px-4">{isAr ? 'السعر الحالي' : 'Current'}</th>
                    <th className="py-3 px-4">{isAr ? 'التكلفة' : 'Cost'}</th>
                    <th className="py-3 px-4">{isAr ? 'القيمة السوقية' : 'Market Value'}</th>
                    <th className="py-3 px-4">{isAr ? 'الأرباح / الخسائر' : 'Total P&L'}</th>
                    <th className="py-3 px-4">{isAr ? 'تغير اليوم' : 'Daily Chg'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {enrichedPositions.map((p) => {
                    const profit = p.unrealizedProfit;
                    const profitPct = p.unrealizedProfitPercent;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{p.symbol}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[130px]">{p.companyName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">{p.quantity}</td>
                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">${p.averageBuyPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">${(p.currentPrice || p.averageBuyPrice).toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">${p.totalCost.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ${p.marketValue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-bold ${
                              profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              p.dailyChangeTotalDollar >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.dailyChangeTotalDollar >= 0 ? '+' : ''}${p.dailyChangeTotalDollar.toFixed(2)} ({p.dailyChangePercent >= 0 ? '+' : ''}{p.dailyChangePercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePosition(p.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                            title={isAr ? 'حذف المركز' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

