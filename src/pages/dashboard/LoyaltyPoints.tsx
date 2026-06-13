import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Gift, TrendingUp, Clock } from 'lucide-react';

interface LoyaltyPointEntry {
  id: string;
  student_id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'expired';
  points: number;
  reference: string;
  balance_after: number;
  created_at: string;
}

export default function LoyaltyPoints() {
  const { user } = useAuth();
  const [points, setPoints] = useState<LoyaltyPointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadPoints();
    }
  }, [user?.id]);

  const loadPoints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPoints(data as LoyaltyPointEntry[]);

      // Calculate current balance
      if (data && data.length > 0) {
        // Get the most recent balance_after
        const latestBalance = data[0].balance_after || 0;
        setCurrentBalance(latestBalance);
      } else {
        setCurrentBalance(0);
      }
    } catch (error) {
      console.error('Error loading loyalty points:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earned':
      case 'bonus':
        return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
      case 'redeemed':
        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'expired':
        return 'text-red-400 bg-red-500/10 border border-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border border-slate-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp size={16} />;
      case 'bonus':
        return <Gift size={16} />;
      case 'redeemed':
        return <Trophy size={16} />;
      case 'expired':
        return <Clock size={16} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earned':
        return 'Points Earned';
      case 'bonus':
        return 'Bonus Points';
      case 'redeemed':
        return 'Points Redeemed';
      case 'expired':
        return 'Points Expired';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Loyalty Points</h1>
        <p className="text-gray-400">Earn and redeem points with every purchase</p>
      </div>

      {/* Points Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-emerald-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 p-8 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Trophy size={40} className="text-white" />
          <div>
            <p className="text-blue-100 text-sm font-medium">CURRENT BALANCE</p>
            <p className="text-4xl font-display font-bold">{currentBalance.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-blue-100 text-sm">
          Earn 10 points per GH₵ 100 spent on orders
        </p>
      </div>

      {points.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-12 text-center">
          <Trophy size={48} className="mx-auto text-slate-500 mb-4" />
          <p className="text-gray-300 text-lg mb-4">No loyalty points yet</p>
          <p className="text-gray-500">
            Start ordering to earn loyalty points on every purchase!
          </p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {points.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(entry.type)}`}>
                        {getTypeIcon(entry.type)}
                        {getTypeLabel(entry.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${
                        entry.type === 'expired' ? 'text-red-400' :
                        (entry.type === 'redeemed' ? 'text-amber-400' : 'text-emerald-400')
                      }`}>
                        {entry.type === 'earned' || entry.type === 'bonus' ? '+' : '-'}
                        {entry.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {entry.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-white">
                        {entry.balance_after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {points.map((entry) => (
              <div key={entry.id} className="border border-white/10 rounded-xl p-4 bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                    {getTypeIcon(entry.type)}
                    {getTypeLabel(entry.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  <span className="font-medium text-gray-300">Reference:</span> {entry.reference}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold ${
                    entry.type === 'expired' ? 'text-red-400' :
                    (entry.type === 'redeemed' ? 'text-amber-400' : 'text-emerald-400')
                  }`}>
                    {entry.type === 'earned' || entry.type === 'bonus' ? '+' : '-'}
                    {entry.points}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance After</p>
                    <p className="text-lg font-bold text-white">{entry.balance_after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
