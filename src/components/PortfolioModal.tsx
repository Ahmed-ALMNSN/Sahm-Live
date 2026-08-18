import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
} from 'lucide-react';
import { PortfolioPosition, BrokeragePlatform } from '../types.js';
import { apiService } from '../services/api.js';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionUpdated?: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  onPositionUpdated,
}) => {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [brokers, setBrokers] = useState<BrokeragePlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newBuyPrice, setNewBuyPrice] = useState(150);
  const [newBrokerId, setNewBrokerId] = useState('broker_sahm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg('تعذر تحميل بيانات المحفظة');
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

  if (!isOpen) return null;

  const totalCost = positions.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + (p.marketValue || p.totalCost || 0), 0);
  const totalUnrealizedProfit = totalMarketValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalUnrealizedProfit / totalCost) * 100 : 0;

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      setErrorMsg('يرجى إدخال رمز السهم');
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
      setErrorMsg(err?.message || 'تعذر حفظ المركز في المحفظة');
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المركز من المحفظة؟')) {
      await apiService.deletePortfolioPosition(id);
      await loadData();
      if (onPositionUpdated) onPositionUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                المحفظة الاستثمارية والمراكز المفتوحة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                متابعة الأرباح غير المحققة والتكلفة الإجمالية للصفقات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Portfolio Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-medium">إجمالي رأس المال المستثمر</span>
              <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-medium">القيمة السوقية الحالية</span>
              <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                ${totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div
              className={`p-4 rounded-2xl border ${
                totalUnrealizedProfit >= 0
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              }`}
            >
              <span className="text-xs text-slate-600 dark:text-slate-300 block mb-1 font-medium">الأرباح / الخسائر غير المحققة</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-mono font-bold ${
                    totalUnrealizedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {totalUnrealizedProfit >= 0 ? '+' : '-'}${Math.abs(totalUnrealizedProfit).toFixed(2)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  ({totalUnrealizedProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Add New Position Form */}
          {isAdding ? (
            <form onSubmit={handleAddPosition} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">إضافة مركز جديد إلى المحفظة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">رمز السهم</label>
                  <input
                    type="text"
                    required
                    placeholder="AAPL"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">سعر الشراء ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">الكمية (عدد الأسهم)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">المنصة المالية</label>
                  <select
                    value={newBrokerId}
                    onChange={(e) => setNewBrokerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                >
                  حفظ المركز
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                المراكز المفتوحة ({positions.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مركز جديد</span>
              </button>
            </div>
          )}

          {/* Positions Table */}
          {positions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
              لا توجد مراكز مفتوحة في المحفظة حاليًا
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4">السهم</th>
                    <th className="py-3 px-4">الكمية</th>
                    <th className="py-3 px-4">سعر الشراء</th>
                    <th className="py-3 px-4">إجمالي التكلفة</th>
                    <th className="py-3 px-4">القيمة السوقية</th>
                    <th className="py-3 px-4">الربح / الخسارة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {positions.map((p) => {
                    const profit = (p.marketValue || p.totalCost) - p.totalCost;
                    const profitPct = p.totalCost > 0 ? (profit / p.totalCost) * 100 : 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{p.symbol}</div>
                          <div className="text-[11px] text-slate-400">{p.companyName || p.brokerName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">{p.quantity}</td>
                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">${p.averageBuyPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">${p.totalCost.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ${(p.marketValue || p.totalCost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-bold ${
                              profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePosition(p.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                            title="حذف المركز"
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
