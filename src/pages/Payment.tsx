import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/navigation';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export default function Payment() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    if (orderId) {
      loadOrder(orderId);
    } else {
      navigate('/');
    }
  }, []);

  const loadOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          bundle:bundles(*)
        `)
        .eq('id', orderId)
        .eq('student_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/orders');
        return;
      }
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!order || !user || !profile) return;

    setProcessing(true);
    setPaymentStatus('idle');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-payment`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email,
          amount: order.total_amount,
          orderId: order.id,
        }),
      });

      const data = await response.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      setProcessing(false);
    }
  };

  const simulatePayment = async () => {
    if (!order) return;

    setProcessing(true);
    setPaymentStatus('idle');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const { error: rpcError } = await supabase.rpc('simulate_payment_success', {
        p_order_id: order.id,
        p_is_guest: false
      });

      if (rpcError) throw rpcError;

      setPaymentStatus('success');

      setTimeout(() => {
        navigate('/orders');
      }, 2000);
    } catch (error) {
      console.error('Payment simulation error:', error);
      setPaymentStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Payment</h1>
        <p className="text-gray-400">Complete your order payment</p>
      </div>

      {paymentStatus === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-6 flex items-center space-x-4 shadow-lg shadow-emerald-500/5">
          <CheckCircle className="w-12 h-12 text-emerald-400" />
          <div className="text-left">
            <h3 className="font-bold text-emerald-400 text-lg">Payment Successful!</h3>
            <p className="text-emerald-500/80">Your order has been confirmed. Redirecting...</p>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6 flex items-center space-x-4 shadow-lg shadow-red-500/5">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <div className="text-left">
            <h3 className="font-bold text-red-400 text-lg">Payment Failed</h3>
            <p className="text-red-500/80">Please try again or contact support.</p>
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6 md:p-8 mb-6">
        <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

        <div className="space-y-4 pb-6 border-b border-white/10 text-sm md:text-base">
          <div className="flex justify-between">
            <span className="text-gray-400">Bundle</span>
            <span className="font-semibold text-white">{order.bundle.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Quantity</span>
            <span className="font-semibold text-white">×{order.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Delivery Address</span>
            <span className="font-semibold text-white text-right max-w-xs">
              {order.delivery_address}
            </span>
          </div>
        </div>

        <div className="pt-6 flex justify-between items-center">
          <span className="text-lg md:text-xl font-bold text-white">Total Amount</span>
          <span className="text-2xl md:text-3xl font-bold text-emerald-400">
            GH₵ {Number(order.total_amount).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex items-center space-x-3 mb-6">
          <CreditCard className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Payment Method</h2>
        </div>

        <div className="space-y-6">
          <button
            onClick={initiatePayment}
            disabled={processing || paymentStatus === 'success'}
            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <span>Pay with Paystack</span>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900 text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={simulatePayment}
            disabled={processing || paymentStatus === 'success'}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-4 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simulate Payment (Demo Mode)
          </button>

          <p className="text-xs text-gray-500 text-center px-4">
            Demo mode allows you to test the system without actual payment
          </p>
        </div>
      </div>
    </div>
  );
}
