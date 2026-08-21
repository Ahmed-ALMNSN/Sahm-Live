import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Plus,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  ShieldCheck,
  Zap,
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
  Legend,
} from 'recharts';
import { PortfolioPosition, StockItem, Language } from '../types.js';
import { apiService } from '../services/api.js';

interface PortfolioChartSectionProps {
  watchlistStocks: StockItem[];
  lang?: Language;
  onOpenPortfolioModal: () => void;
}

type ChartMetric = 'profit_dollar' | 'profit_pct' | 'daily_change' | 'value_vs_cost';
type ChartType = 'bar' | 'area';

export const PortfolioChartSection: React.FC<PortfolioChartSectionProps> = ({
  watchlistStocks = [],
  lang = 'ar',
  onOpenPortfolioModal,
}) => {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('profit_dollar');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const isAr = lang === 'ar';

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchPortfolioPositions();
      setPositions(data);
    } catch (err) {
      console.error('Error fetching portfolio positions for chart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // Enrich with live quotes from watchlistStocks
  const enrichedPositions = useMemo(() => {
    return positions.map((p) => {
      const liveStock = watchlistStocks.find(
        (s) => s.symbol.toUpperCase() === p.symbol.toUpperCase()
      );
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

  // Chart data
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
      quantity: p.quantity,
      currentPrice: p.currentPrice,
      buyPrice: p.averageBuyPrice,
    }));
  }, [enrichedPositions]);

  // Portfolio Totals
  const totalCost = enrichedPositions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalMarketValue = enrichedPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalUnrealizedProfit = totalMarketValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalUnrealizedProfit / totalCost) * 100 : 0;
  const totalDailyChangeDollar = enrichedPositions.reduce((sum, p) => sum + p.dailyChangeTotalDollar, 0);
  const totalDailyChangePct = totalCost > 0 ? (totalDailyChangeDollar / totalCost) * 100 : 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#161b22]/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono text-white min-w-[200px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-bold text-sm text-emerald-400">{data.symbol}</span>
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{data.companyName}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'الكمية:' : 'Qty:'}</span>
              <span className="font-bold text-white">{data.quantity}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
              <span className="font-bold text-slate-200">
                ${data.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">{isAr ? 'القيمة السوقية:' : 'Market Value:'}</span>
              <span className="font-bold text-white">
                ${data.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-700">
              <span className="text-slate-400">{isAr ? 'الأرباح / الخسائر:' : 'P&L:'}</span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  data.profitDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.profitDollar >= 0 ? '+' : ''}${data.profitDollar} ({data.profitPercent >= 0 ? '+' : ''}
                {data.profitPercent}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isAr ? 'تغير اليوم:' : 'Daily Change:'}</span>
              <span
                className={`font-bold ${
                  data.dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.dailyChange >= 0 ? '+' : ''}${data.dailyChange} ({data.dailyChangePct >= 0 ? '+' : ''}
                {data.dailyChangePct}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-[#11141a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs mb-5 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{isAr ? 'الرسم البياني لأرباح وأداء المحفظة الاستثمارية' : 'Portfolio Profit & Performance Chart'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {enrichedPositions.length} {isAr ? 'مراكز نشطة' : 'Positions'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'تحليل بياني لحظي للأرباح والخسائر والعوائد الاستثمارية ورأس المال المستثمر'
                : 'Real-time interactive visualization of unrealized P&L, returns, and allocation'}
            </p>
          </div>
        </div>

        {/* Action Controls & Metric Filter */}
        <div className="flex items-center flex-wrap gap-1.5">
          <div className="flex items-center bg-slate-100 dark:bg-[#1c2128] p-1 rounded-xl text-xs">
            <button
              onClick={() => setChartMetric('profit_dollar')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartMetric === 'profit_dollar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'الأرباح ($)' : 'P&L ($)'}
            </button>
            <button
              onClick={() => setChartMetric('profit_pct')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartMetric === 'profit_pct'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'العائد (%)' : 'Return (%)'}
            </button>
            <button
              onClick={() => setChartMetric('daily_change')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartMetric === 'daily_change'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'تغير اليوم ($)' : 'Daily ($)'}
            </button>
            <button
              onClick={() => setChartMetric('value_vs_cost')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                chartMetric === 'value_vs_cost'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? 'القيمة مقابل التكلفة' : 'Value vs Cost'}
            </button>
          </div>

          <button
            onClick={fetchPositions}
            disabled={loading}
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <button
            onClick={onOpenPortfolioModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isAr ? 'إدارة المحفظة' : 'Manage Portfolio'}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>

      {/* KPI Flash Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b22] border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
            {isAr ? 'رأس المال المستثمر' : 'Invested Cost'}
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b22] border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
            {isAr ? 'القيمة السوقية اللحظية' : 'Current Market Value'}
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
            ${totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            totalUnrealizedProfit >= 0
              ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
              : 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
          }`}
        >
          <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-0.5 font-medium">
            {isAr ? 'إجمالي الأرباح / الخسائر' : 'Total Unrealized P&L'}
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`text-base sm:text-lg font-mono font-bold ${
                totalUnrealizedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {totalUnrealizedProfit >= 0 ? '+' : ''}${totalUnrealizedProfit.toFixed(2)}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
              ({totalUnrealizedProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            totalDailyChangeDollar >= 0
              ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
              : 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-800/60'
          }`}
        >
          <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-0.5 font-medium">
            {isAr ? 'حركة وتغير اليوم' : "Today's Dollar Change"}
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

      {/* Main Interactive Recharts Area */}
      {chartData.length > 0 ? (
        <div className="h-64 sm:h-72 w-full pt-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'value_vs_cost' ? (
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  formatter={(value) =>
                    value === 'totalCost' ? (isAr ? 'رأس المال المستثمر' : 'Cost') : isAr ? 'القيمة السوقية الحالية' : 'Market Value'
                  }
                />
                <Bar dataKey="totalCost" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="marketValue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => (chartMetric === 'profit_pct' ? `${val}%` : `$${val}`)}
                />
                <Tooltip content={<CustomTooltip />} />
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
                    return <Cell key={`cell-${index}`} fill={val >= 0 ? '#10b981' : '#ef4444'} />;
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400 mb-2">
            {isAr ? 'لا توجد مراكز في المحفظة حالياً.' : 'No portfolio positions to display.'}
          </p>
          <button
            onClick={onOpenPortfolioModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة أسهم إلى المحفظة' : 'Add Stocks to Portfolio'}</span>
          </button>
        </div>
      )}

      {/* Stock Mini-Badges Summary */}
      {enrichedPositions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {enrichedPositions.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#161b22] border border-slate-200 dark:border-slate-800/80 text-[11px] font-mono shrink-0"
            >
              <span className="font-bold text-slate-800 dark:text-slate-200">{p.symbol}</span>
              <span className="text-slate-400">${(p.currentPrice || p.averageBuyPrice).toFixed(2)}</span>
              <span
                className={`font-semibold ${
                  p.unrealizedProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {p.unrealizedProfit >= 0 ? '+' : ''}${p.unrealizedProfit.toFixed(0)} ({p.unrealizedProfitPercent >= 0 ? '+' : ''}{p.unrealizedProfitPercent.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
