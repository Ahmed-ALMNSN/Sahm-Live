import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Building2,
  DollarSign,
  Percent,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { BrokeragePlatform } from '../types.js';
import { apiService } from '../services/api.js';

interface BrokerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrokersUpdated?: () => void;
}

export const BrokerManagementModal: React.FC<BrokerManagementModalProps> = ({
  isOpen,
  onClose,
  onBrokersUpdated,
}) => {
  const [brokers, setBrokers] = useState<BrokeragePlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Partial<BrokeragePlatform> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBrokers = async () => {
    setLoading(true);
    try {
      const res = await apiService.fetchBrokers();
      setBrokers(res.brokers || []);
    } catch {
      setErrorMsg('تعذر تحميل بيانات منصات التداول');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBrokers();
      setEditingBroker(null);
      setIsCreatingNew(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetDefault = async (id: string) => {
    await apiService.setDefaultBroker(id);
    await loadBrokers();
    if (onBrokersUpdated) onBrokersUpdated();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المنصة المالية؟')) {
      await apiService.deleteBroker(id);
      await loadBrokers();
      if (onBrokersUpdated) onBrokersUpdated();
    }
  };

  const handleSaveBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBroker || !editingBroker.name_ar || !editingBroker.name_en) {
      setErrorMsg('يرجى إدخال اسم المنصة بالعربية والإنجليزية');
      return;
    }

    try {
      await apiService.saveBroker(editingBroker as any);
      setEditingBroker(null);
      setIsCreatingNew(false);
      await loadBrokers();
      if (onBrokersUpdated) onBrokersUpdated();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ المنصة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                إدارة المنصات والوسطاء الماليين
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تخصيص العمولات والرسوم الضريبية لمنصة سهم وكافة الوسطاء
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form when Editing or Creating */}
          {(editingBroker || isCreatingNew) ? (
            <form onSubmit={handleSaveBroker} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingBroker?.id ? 'تعديل منصة تداول' : 'إضافة منصة مالية جديدة'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBroker(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  إلغاء التعديل
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم بالعربية *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: منصة سهم"
                    value={editingBroker?.name_ar || ''}
                    onChange={(e) => setEditingBroker({ ...editingBroker, name_ar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم بالإنجليزية *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sahm Capital"
                    value={editingBroker?.name_en || ''}
                    onChange={(e) => setEditingBroker({ ...editingBroker, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع عمولة الشراء</label>
                  <select
                    value={editingBroker?.buy_commission_type || 'percentage'}
                    onChange={(e) => setEditingBroker({ ...editingBroker, buy_commission_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="percentage">نسبة مئوية من قيمة الصفقة (%)</option>
                    <option value="per_share">مبلغ ثابت لكل سهم ($/Share)</option>
                    <option value="fixed">مبلغ ثابت لكل صفقة ($ Fixed)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">قيمة عمولة الشراء</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingBroker?.buy_commission_value ?? 0.15}
                    onChange={(e) => setEditingBroker({ ...editingBroker, buy_commission_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع عمولة البيع</label>
                  <select
                    value={editingBroker?.sell_commission_type || 'percentage'}
                    onChange={(e) => setEditingBroker({ ...editingBroker, sell_commission_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="percentage">نسبة مئوية من قيمة الصفقة (%)</option>
                    <option value="per_share">مبلغ ثابت لكل سهم ($/Share)</option>
                    <option value="fixed">مبلغ ثابت لكل صفقة ($ Fixed)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">قيمة عمولة البيع</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingBroker?.sell_commission_value ?? 0.15}
                    onChange={(e) => setEditingBroker({ ...editingBroker, sell_commission_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">الحد الأدنى للعمولة ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingBroker?.minimum_commission ?? 1.99}
                    onChange={(e) => setEditingBroker({ ...editingBroker, minimum_commission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingBroker?.vat_rate ?? 15.0}
                    onChange={(e) => setEditingBroker({ ...editingBroker, vat_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات توضيحية</label>
                  <input
                    type="text"
                    placeholder="ملاحظات حول الحساب والرسوم..."
                    value={editingBroker?.notes || ''}
                    onChange={(e) => setEditingBroker({ ...editingBroker, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBroker(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-sm"
                >
                  حفظ المنصة
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                المنصات المتوفرة ({brokers.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingBroker({
                    name_ar: '',
                    name_en: '',
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
                    notes: '',
                    is_default: false,
                    is_active: true,
                  });
                  setIsCreatingNew(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة منصة جديدة</span>
              </button>
            </div>
          )}

          {/* Broker Cards Grid */}
          <div className="space-y-3">
            {brokers.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all ${
                  b.is_default
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        b.is_default
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b.name_ar.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{b.name_ar}</h4>
                        {b.is_default && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>الافتراضية</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{b.name_en}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {!b.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        تعيين كافتراضية
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBroker(b);
                        setIsCreatingNew(false);
                      }}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {b.id !== 'broker_sahm' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">عمولة الشراء</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {b.buy_commission_value} {b.buy_commission_type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">عمولة البيع</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {b.sell_commission_value} {b.sell_commission_type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">الحد الأدنى</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      ${b.minimum_commission || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">ضريبة القيمة المضافة</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {b.vat_rate || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
