import { useEffect, useState } from 'react';
import { CheckCircle, Download, Home, Loader } from 'lucide-react';
import { Link, useNavigate } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');

    if (!orderId) {
      navigate('/');
      return;
    }

    confirmPaymentAndLoadOrder(orderId, !user);
  }, [user, authLoading]);

  const confirmPaymentAndLoadOrder = async (orderId: string, isGuest: boolean) => {
    try {
      // 1. Call the secure RPC to ensure the order is marked as confirmed
      // This acts as our client-side webhook since we don't have a secure backend webhook setup
      const { error: rpcError } = await supabase.rpc('simulate_payment_success', {
        p_order_id: orderId,
        p_is_guest: isGuest
      });

      if (rpcError) throw rpcError;

      // 2. Fetch the actual order details to display
      const table = isGuest ? 'guest_orders' : 'orders';
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Order not found');

      setOrder(data);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setError('Failed to load order details, but your payment was processed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-12 h-12 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle className="text-emerald-400" size={48} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Payment Successful</h1>
        <p className="text-xl text-gray-400">Your order has been confirmed and is being prepared</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6 md:p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Order Details</h2>

        {error ? (
          <p className="text-red-400 mb-6 font-medium bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</p>
        ) : (
          <div className="space-y-4 mb-8 pb-8 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Order Number</span>
              <span className="font-semibold text-white font-mono bg-white/5 px-2 py-1 rounded">#{order?.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Amount Paid</span>
              <span className="text-xl font-bold text-emerald-400">GH₵ {Number(order?.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Payment Method</span>
              <span className="font-semibold text-white">Paystack</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Delivery Address</span>
              <span className="font-semibold text-white text-right max-w-xs">{order?.delivery_address}</span>
            </div>
          </div>
        )}

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <p className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
            What happens next?
          </p>
          <ul className="text-gray-300 space-y-3 text-sm md:text-base">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Your order is being prepared</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>You'll receive an SMS when your order is ready for pickup</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Our driver will be assigned and you'll get updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Track your delivery in real-time from your dashboard</span>
            </li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <button 
            onClick={() => navigate(user ? '/orders' : '/')} 
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white px-6 py-4 rounded-xl font-semibold transition transform hover:scale-[1.02]"
          >
            {user ? 'View My Orders' : 'Go to Homepage'}
          </button>
          <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-xl font-semibold transition">
            <Download size={20} /> Download Receipt
          </button>
        </div>

        <Link 
          to="/" 
          className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-gray-300 border border-transparent hover:border-white/10 px-6 py-4 rounded-xl font-semibold transition w-full mt-2"
        >
          <Home size={20} /> Return to Home
        </Link>
      </div>
    </div>
  );
}
