import { useState, useEffect } from 'react';
import { Gift, Copy, Share2, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Referral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_id: string | null;
  referred_email: string | null;
  reward_status: 'pending' | 'given' | null;
  created_at: string;
}

export default function Referrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReferrals(data || []);

      if (data && data.length > 0) {
        setReferralCode(data[0].referral_code);
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
    setGenerating(true);
    try {
      const newCode = generateRandomCode();

      const { error } = await supabase.from('referrals').insert({
        referrer_id: user?.id,
        referral_code: newCode,
      });

      if (error) throw error;

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

  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter((r) => r.referred_id !== null).length;
  const rewardsEarned = referrals.filter((r) => r.reward_status === 'given').length;

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
              Share your referral code with friends. When they sign up using your code, they become your referral. Once they place their first order, you earn a reward!
            </p>
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Your Referrals</h2>

        {referrals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-2">No referrals yet</p>
            <p className="text-slate-500 text-sm">
              {referralCode
                ? 'Share your referral code to start earning rewards!'
                : 'Generate a referral code to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
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
                        {referral.reward_status === 'given' && (
                          <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                            <Gift size={14} />
                            Reward Given
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
