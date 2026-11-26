import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, ToggleLeft, ToggleRight, X, Percent, Users, CheckCircle2, AlertTriangle, Wallet, Lock } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  ambassador_name?: string | null;
  ambassador_phone?: string | null;
  commission_per_order?: number;
  commission_paid?: number;
  created_at: string;
}

interface AmbassadorOrderStats {
  confirmedOrders: number;
  referredRevenue: number;
}

interface FormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: string;
  max_uses: string;
  expires_at: string;
  ambassador_name: string;
  ambassador_phone: string;
  commission_per_order: string;
}

const INITIAL_FORM: FormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  ambassador_name: '',
  ambassador_phone: '',
  commission_per_order: '',
};

export default function PromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [orderStatsByCode, setOrderStatsByCode] = useState<Record<string, AmbassadorOrderStats>>({});
  const [defaultBuyerDiscount, setDefaultBuyerDiscount] = useState(10);
  const [defaultCommission, setDefaultCommission] = useState(15);
  const [minPayoutAmount, setMinPayoutAmount] = useState(45);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const [promosRes, regOrdersRes, guestOrdersRes, settingsRes] = await Promise.all([
        supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('promo_code, total_amount, status')
          .not('promo_code', 'is', null)
          .not('status', 'in', '("pending","cancelled")'),
        supabase
          .from('guest_orders')
          .select('promo_code, total_amount, status')
          .not('promo_code', 'is', null)
          .not('status', 'in', '("pending","cancelled")'),
        supabase
          .from('system_settings')
          .select('referral_buyer_discount, referral_commission_per_order, referral_min_payout_amount')
          .eq('id', 1)
          .maybeSingle(),
      ]);

      if (promosRes.error) throw promosRes.error;
      setPromoCodes(promosRes.data || []);

      if (settingsRes.data) {
        if (settingsRes.data.referral_buyer_discount != null) {
          setDefaultBuyerDiscount(Number(settingsRes.data.referral_buyer_discount));
        }
        if (settingsRes.data.referral_commission_per_order != null) {
          setDefaultCommission(Number(settingsRes.data.referral_commission_per_order));
        }
        if (settingsRes.data.referral_min_payout_amount != null) {
          setMinPayoutAmount(Number(settingsRes.data.referral_min_payout_amount));
        }
      }

      const statsMap: Record<string, AmbassadorOrderStats> = {};
      const accumulate = (rows: any[] | null) => {
        if (!rows) return;
        for (const row of rows) {
          const codeKey = String(row.promo_code || '').trim().toUpperCase();
          if (!codeKey) continue;
          if (!statsMap[codeKey]) {
            statsMap[codeKey] = { confirmedOrders: 0, referredRevenue: 0 };
          }
          statsMap[codeKey].confirmedOrders += 1;
          statsMap[codeKey].referredRevenue += Number(row.total_amount || 0);
        }
      };
      accumulate(regOrdersRes.data);
      accumulate(guestOrdersRes.data);
      setOrderStatsByCode(statsMap);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      setError('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code.trim()) {
      setError('Promo code is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (formData.discount_value <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }

    setSubmitting(true);

    try {
      const insertData = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at || null,
        is_active: true,
        current_uses: 0,
        ambassador_name: formData.ambassador_name.trim() || null,
        ambassador_phone: formData.ambassador_phone.trim() || null,
        commission_per_order: formData.commission_per_order ? parseFloat(formData.commission_per_order) : 0,
        commission_paid: 0,
      };

      const { data, error: insertError } = await supabase
        .from('promo_codes')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      setPromoCodes([data, ...promoCodes]);
      setFormData(INITIAL_FORM);
      setShowModal(false);
      setSuccess('Promo code created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      setError(error.message || 'Failed to create promo code');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPromoCodes(
        promoCodes.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
      );
    } catch (error) {
      console.error('Error toggling promo code:', error);
      setError('Failed to update promo code');
    }
  };

  const deletePromoCode = async (id: string) => {
    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);

      if (error) throw error;

      setPromoCodes(promoCodes.filter((p) => p.id !== id));
      setDeleteId(null);
      setSuccess('Promo code deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting promo code:', error);
      setError('Failed to delete promo code');
    }
  };

  const markCommissionPaid = async (promo: PromoCode, totalEarned: number, owed: number) => {
    if (owed < minPayoutAmount) {
      setError(`Payout blocked: ${promo.code} has GH₵ ${owed.toFixed(2)} owed, which is below the GH₵ ${minPayoutAmount.toFixed(2)} minimum payout threshold.`);
      return;
    }

    try {
      const { error: payErr } = await supabase
        .from('promo_codes')
        .update({ commission_paid: totalEarned })
        .eq('id', promo.id);

      if (payErr) throw payErr;
      setPromoCodes(
        promoCodes.map((p) => (p.id === promo.id ? { ...p, commission_paid: totalEarned } : p))
      );
      setSuccess(`Marked GH₵ ${totalEarned.toFixed(2)} paid for ${promo.code}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating commission payout:', err);
      setError('Failed to mark commission as paid');
    }
  };

  const openCreateModal = () => {
    setFormData({
      ...INITIAL_FORM,
      discount_type: 'fixed',
      discount_value: defaultBuyerDiscount,
      commission_per_order: defaultCommission.toString(),
    });
    setError('');
    setShowModal(true);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (code: PromoCode) => {
    if (isExpired(code.expires_at)) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Expired
        </span>
      );
    }
    if (!code.is_active) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const payoutTotals = promoCodes.reduce(
    (acc, promo) => {
      const stats = orderStatsByCode[promo.code.toUpperCase()] || { confirmedOrders: 0, referredRevenue: 0 };
      const rate = Number(promo.commission_per_order || 0);
      const earned = stats.confirmedOrders * rate;
      const paid = Number(promo.commission_paid || 0);
      const owed = Math.max(0, earned - paid);
      acc.paidOrders += stats.confirmedOrders;
      acc.totalEarned += earned;
      acc.totalOwed += owed;
      if (owed >= minPayoutAmount && owed > 0) {
        acc.eligibleCount += 1;
        acc.eligibleOwed += owed;
      } else if (owed > 0) {
        acc.accumulatingCount += 1;
      }
      return acc;
    },
    { paidOrders: 0, totalEarned: 0, totalOwed: 0, eligibleCount: 0, eligibleOwed: 0, accumulatingCount: 0 }
  );

  return (
    <div>
      {/* Unpaid Referral & Ambassador Commissions Alert Banner */}
      {payoutTotals.eligibleCount > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-base">
                Ready for Payout (Reached GH₵ {minPayoutAmount.toFixed(2)} Min): GH₵ {payoutTotals.eligibleOwed.toFixed(2)}
              </h3>
              <p className="text-sm text-amber-800 mt-0.5">
                {payoutTotals.eligibleCount} referrer(s) have met the GH₵ {minPayoutAmount.toFixed(2)} minimum threshold and are eligible for MoMo payout.
                {payoutTotals.accumulatingCount > 0 && ` (${payoutTotals.accumulatingCount} more still accumulating below threshold.)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-amber-200 shrink-0">
            <Wallet className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-extrabold text-amber-900">
              {payoutTotals.paidOrders} Paid Referred Orders
            </span>
          </div>
        </div>
      ) : payoutTotals.totalOwed > 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-500 shrink-0" />
            <p className="text-sm text-slate-700">
              <strong>GH₵ {payoutTotals.totalOwed.toFixed(2)}</strong> in accumulating commissions across {payoutTotals.accumulatingCount} referrer(s) — payout unlocks once a referrer reaches the <strong>GH₵ {minPayoutAmount.toFixed(2)}</strong> minimum threshold (configured in Admin Settings).
            </p>
          </div>
        </div>
      ) : null}

      {/* Commission Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Referred Orders</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{payoutTotals.paidOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Commission Earned</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">GH₵ {payoutTotals.totalEarned.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible for Payout</p>
          <p className={`text-2xl font-extrabold mt-1 ${payoutTotals.eligibleOwed > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            GH₵ {payoutTotals.eligibleOwed.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Payout Threshold</p>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">GH₵ {minPayoutAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end mb-8">
        <button
          onClick={openCreateModal}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create Promo Code</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData(INITIAL_FORM);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                    placeholder="e.g., SAVE20"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-semibold px-3 py-2 rounded-lg transition"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  placeholder="e.g., Summer discount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                    placeholder="e.g., 20"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Min Order Amount (Optional)
                </label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  placeholder="e.g., 100"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Max Uses (Optional)
                </label>
                <input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-green-700 uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  <span>Campus Ambassador Payouts (Optional)</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ambassador Name / Hall
                  </label>
                  <input
                    type="text"
                    value={formData.ambassador_name}
                    onChange={(e) => setFormData({ ...formData, ambassador_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50 text-sm"
                    placeholder="e.g., Kofi Mensah (Unity Hall)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      MoMo Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.ambassador_phone}
                      onChange={(e) => setFormData({ ...formData, ambassador_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50 text-sm"
                      placeholder="0244123456"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Commission / Order (GH₵)
                    </label>
                    <input
                      type="number"
                      value={formData.commission_per_order}
                      onChange={(e) => setFormData({ ...formData, commission_per_order: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50 text-sm"
                      placeholder="e.g., 15"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData(INITIAL_FORM);
                    setError('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-900 font-semibold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Promo Code</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this promo code? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deletePromoCode(deleteId)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-900 font-semibold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {promoCodes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-100">
          <Percent className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No promo codes yet</h3>
          <p className="text-gray-600 mb-4">Create your first promo code to get started.</p>
          <button
            onClick={openCreateModal}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Promo Code
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Discount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Ambassador & Commission</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Usage</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Expires</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <code className="bg-slate-50 text-gray-900 text-sm font-mono font-bold px-2 py-1 rounded">
                        {promo.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {promo.description}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {promo.discount_type === 'percentage' ? (
                          <div className="flex items-center gap-1">
                            <span>{promo.discount_value}%</span>
                            <Percent className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <span>GH₵ {promo.discount_value.toFixed(2)}</span>
                        )}
                      </div>
                      {promo.min_order_amount && (
                        <p className="text-xs text-gray-600 mt-1">
                          Min: GH₵ {promo.min_order_amount.toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const stats = orderStatsByCode[promo.code.toUpperCase()] || { confirmedOrders: 0, referredRevenue: 0 };
                        const rate = Number(promo.commission_per_order || 0);
                        const earned = stats.confirmedOrders * rate;
                        const paid = Number(promo.commission_paid || 0);
                        const owed = Math.max(0, earned - paid);

                        return (
                          <div className="space-y-1 text-xs">
                            {promo.ambassador_name ? (
                              <p className="font-semibold text-gray-900">
                                {promo.ambassador_name}
                                {promo.ambassador_phone ? ` (${promo.ambassador_phone})` : ''}
                              </p>
                            ) : (
                              <p className="text-gray-400">General promo</p>
                            )}
                            <p className="text-gray-600">
                              Paid Orders: <span className="font-bold text-gray-900">{stats.confirmedOrders}</span>
                              {stats.referredRevenue > 0 && (
                                <span className="text-gray-500"> (GH₵ {stats.referredRevenue.toFixed(0)})</span>
                              )}
                            </p>
                            {rate > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={owed >= minPayoutAmount && owed > 0 ? 'text-amber-700 font-bold' : owed > 0 ? 'text-slate-700 font-semibold' : 'text-green-700 font-semibold'}>
                                    Owed: GH₵ {owed.toFixed(2)}
                                  </span>
                                  <span className="text-gray-400">/ Earned: GH₵ {earned.toFixed(2)}</span>
                                </div>
                                {owed > 0 && owed >= minPayoutAmount && (
                                  <button
                                    type="button"
                                    onClick={() => markCommissionPaid(promo, earned, owed)}
                                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Mark Paid
                                  </button>
                                )}
                                {owed > 0 && owed < minPayoutAmount && (
                                  <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>
                                      Needs GH₵ {(minPayoutAmount - owed).toFixed(2)} more (min GH₵ {minPayoutAmount.toFixed(0)})
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {promo.current_uses}
                          {promo.max_uses ? ` / ${promo.max_uses}` : ''}
                        </p>
                        {promo.max_uses && (
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min((promo.current_uses / promo.max_uses) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(promo)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {promo.expires_at
                        ? new Date(promo.expires_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleActive(promo.id, promo.is_active)}
                          className="text-gray-400 hover:text-gray-600 transition"
                          title={promo.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {promo.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteId(promo.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete promo code"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
