import { useState, useEffect } from 'react';
import { Gift, Copy, Share2, Users, CheckCircle, Clock, AlertCircle, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Referral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_id: string | null;
  referred_email: string | null;
  reward_given?: boolean | null;
  reward_status?: 'pending' | 'given' | null;
  created_at: string;
}

export default function Referrals() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [buyerDiscount, setBuyerDiscount] = useState(10);
  const [commissionPerOrder, setCommissionPerOrder] = useState(15);
  const [minPayoutAmount, setMinPayoutAmount] = useState(45);
  const [confirmedReferralOrders, setConfirmedReferralOrders] = useState(0);
  const [commissionPaid, setCommissionPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferrals();
    }
  }, [user]);

  const loadReferrals = async () => {
    try {
      const [refRes, settingsRes] = await Promise.all([
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('system_settings')
          .select('referral_buyer_discount, referral_commission_per_order, referral_min_payout_amount')
          .eq('id', 1)
          .maybeSingle(),
      ]);

      if (refRes.error) throw refRes.error;
      const data = refRes.data || [];
      setReferrals(data);

      if (settingsRes.data) {
        if (settingsRes.data.referral_buyer_discount != null) {
          setBuyerDiscount(Number(settingsRes.data.referral_buyer_discount));
        }
        if (settingsRes.data.referral_commission_per_order != null) {
          setCommissionPerOrder(Number(settingsRes.data.referral_commission_per_order));
        }
        if (settingsRes.data.referral_min_payout_amount != null) {
          setMinPayoutAmount(Number(settingsRes.data.referral_min_payout_amount));
        }
      }

      const activeCode =
        (profile && (profile as any).referral_code) ||
        (data.length > 0 ? data[0].referral_code : null);

      if (activeCode) {
        setReferralCode(activeCode);
        const [promoRes, ordersCountRes, guestCountRes] = await Promise.all([
          supabase
            .from('promo_codes')
            .select('discount_value, commission_per_order, commission_paid')
            .eq('code', activeCode.toUpperCase())
            .maybeSingle(),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('promo_code', activeCode.toUpperCase())
            .not('status', 'in', '("pending","cancelled")'),
          supabase
            .from('guest_orders')
            .select('id', { count: 'exact', head: true })
            .eq('promo_code', activeCode.toUpperCase())
            .not('status', 'in', '("pending","cancelled")'),
        ]);

        if (promoRes.data) {
          if (promoRes.data.discount_value != null) setBuyerDiscount(Number(promoRes.data.discount_value));
          if (promoRes.data.commission_per_order != null) setCommissionPerOrder(Number(promoRes.data.commission_per_order));
          if (promoRes.data.commission_paid != null) setCommissionPaid(Number(promoRes.data.commission_paid));
        }

        const totalPaidOrders = (ordersCountRes.count || 0) + (guestCountRes.count || 0);
        setConfirmedReferralOrders(totalPaidOrders);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const newCode = generateRandomCode();

      const { error: rpcErr } = await supabase.rpc('generate_student_referral_code', {
        p_code: newCode,
      });

      if (rpcErr) {
        // Fallback if migration hasn't been pushed yet
        const [{ error: refErr }] = await Promise.all([
          supabase.from('referrals').insert({
            referrer_id: user.id,
            referral_code: newCode,
          }),
          supabase
            .from('profiles')
            .update({ referral_code: newCode })
            .eq('id', user.id),
        ]);
        if (refErr) throw refErr;
      }

      setReferralCode(newCode);
      await loadReferrals();
    } catch (error) {
      console.error('Error generating referral code:', error);
      alert('Failed to generate referral code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (referralCode) {
      try {
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleCopyLink = async () => {
    if (referralCode) {
      try {
        const referralUrl = `${window.location.origin}/register?ref=${referralCode}`;
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const invitedReferrals = referrals.filter((r) => r.referred_id !== null || r.referred_email !== null);
  const totalReferrals = invitedReferrals.length;
  const successfulReferrals = invitedReferrals.filter((r) => r.referred_id !== null).length;
  const rewardsEarned = invitedReferrals.filter((r) => r.reward_given === true || r.reward_status === 'given').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">Referral Program</h1>
        <p className="text-slate-400 mt-2">Earn rewards by inviting friends to join FoodBundle</p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Referral Code</h2>
            <p className="text-slate-400">Share this code with friends to earn rewards</p>
          </div>
          <Gift className="text-blue-400" size={32} />
        </div>

        {referralCode ? (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-blue-500/30">
              <p className="text-sm text-slate-400 mb-2">Your Code</p>
              <p className="text-3xl font-bold text-blue-400 font-mono tracking-widest">
                {referralCode}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyCode}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                {copied ? 'Copied!' : 'Copy Code'}
              </button>

              <button
                onClick={handleCopyLink}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50 text-white font-semibold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                {copied ? 'Link Copied!' : 'Copy Share Link'}
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-sm text-blue-300">
              <p className="font-semibold mb-1">Share this link:</p>
              <p className="font-mono text-xs break-all">
                {window.location.origin}/register?ref={referralCode}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 mb-4">No referral code yet. Generate one to get started!</p>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              {generating ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        )}
      </div>

      {/* Commission Payout Progress Card */}
      {(() => {
        const totalEarned = confirmedReferralOrders * commissionPerOrder;
        const unpaidOwed = Math.max(0, totalEarned - commissionPaid);
        const progressPct = minPayoutAmount > 0 ? Math.min(100, (unpaidOwed / minPayoutAmount) * 100) : 100;
        const remainingAmount = Math.max(0, minPayoutAmount - unpaidOwed);
        const isEligible = unpaidOwed >= minPayoutAmount && unpaidOwed > 0;

        return (
          <div className="bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-slate-900/60 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cash Commission & Payout Progress</h3>
                  <p className="text-xs text-slate-300">
                    Friends get <strong className="text-emerald-400">GH₵ {buyerDiscount.toFixed(2)} off</strong> · You earn <strong className="text-emerald-400">GH₵ {commissionPerOrder.toFixed(2)}</strong> per paid order
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400">Unpaid Commission</p>
                <p className="text-2xl font-extrabold text-emerald-400">
                  GH₵ {unpaidOwed.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ GH₵ {minPayoutAmount.toFixed(2)} min</span>
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">
                Paid Orders Referred: <strong className="text-white">{confirmedReferralOrders}</strong> · Paid Out So Far: <strong className="text-white">GH₵ {commissionPaid.toFixed(2)}</strong>
              </span>
              {isEligible ? (
                <span className="text-emerald-400 font-bold">
                  ✓ Minimum reached! Your payout is unlocked for admin MoMo transfer.
                </span>
              ) : (
                <span className="text-amber-300 font-medium">
                  Earn <strong>GH₵ {remainingAmount.toFixed(2)}</strong> more to reach the GH₵ {minPayoutAmount.toFixed(2)} payout minimum.
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-400">Total Referrals</h3>
            <Users className="text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-white">{totalReferrals}</p>
          <p className="text-sm text-slate-500 mt-2">Friends invited</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-400">Successful</h3>
            <CheckCircle className="text-emerald-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-white">{successfulReferrals}</p>
          <p className="text-sm text-slate-500 mt-2">Completed signups</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-400">Rewards Earned</h3>
            <Gift className="text-purple-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-white">{rewardsEarned}</p>
          <p className="text-sm text-slate-500 mt-2">Rewards given</p>
        </div>
      </div>

      {/* Info Banner */}
      {referralCode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-100">How it works</h3>
            <p className="text-amber-200/70 text-sm mt-1">
              Share your code or signup link with friends and parents. They get <strong>GH₵ {buyerDiscount.toFixed(2)} off</strong> when they apply your code at Student or Guest Checkout (or sign up with your link), and you earn <strong>GH₵ {commissionPerOrder.toFixed(2)}</strong> per paid order (payout unlocks at <strong>GH₵ {minPayoutAmount.toFixed(2)}</strong>) plus bonus points!
            </p>
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Your Referrals</h2>

        {invitedReferrals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-2">No referrals yet</p>
            <p className="text-slate-500 text-sm">
              {referralCode
                ? 'Share your referral code to start earning 200 bonus points per friend!'
                : 'Generate a referral code to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitedReferrals.map((referral) => (
              <div
                key={referral.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-6 hover:border-blue-500/30 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono bg-slate-900/50 border border-white/5 px-3 py-1 rounded-lg text-sm font-semibold text-white">
                        {referral.referral_code}
                      </p>
                      <div className="flex gap-2">
                        {referral.referred_id ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                            <CheckCircle size={14} />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold">
                            <Clock size={14} />
                            Pending
                          </span>
                        )}
                        {(referral.reward_given === true || referral.reward_status === 'given') && (
                          <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                            <Gift size={14} />
                            +200 Points Given
                          </span>
                        )}
                      </div>
                    </div>

                    {referral.referred_email && (
                      <p className="text-slate-400 text-sm">
                        <span className="font-medium text-slate-300">Email:</span> {referral.referred_email}
                      </p>
                    )}

                    <p className="text-slate-500 text-xs mt-2">
                      Created {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <p className="text-sm font-semibold text-white">
                        {referral.referred_id ? 'Signup Complete' : 'Awaiting Signup'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
