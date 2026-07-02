import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from '../lib/navigation';
import { CreditCard, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function GuestPayment() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    if (orderId) {
      loadOrder(orderId);
    } else {
      navigate('/packages');
    }
  }, []);

  const loadOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('guest_orders')
        .select(`
          *,
          bundle:bundles(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/packages');
        return;
      }
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!order) return;

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
          email: order.email,
          amount: order.total_amount,
          orderId: order.id,
          isGuest: true,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Payment</h1>
          <p className="text-gray-300">Complete your order payment</p>
        </div>

        {paymentStatus === 'success' && (
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-8 mb-6 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-bold text-white text-2xl mb-2">Payment Successful!</h3>
            <p className="text-gray-300 mb-2">Your order has been confirmed.</p>
            <p className="text-emerald-400 font-semibold mb-6">
              Order confirmation will be sent to {order.email}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/packages"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition border border-white/20"
              >
                Back to Packages
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-blue-600 transition"
              >
                Create Account <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-6 mb-6 flex items-center space-x-4">
            <AlertCircle className="w-12 h-12 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-200 text-lg">Payment Failed</h3>
              <p className="text-red-300">Please try again or contact support.</p>
            </div>
          </div>
        )}

        {paymentStatus !== 'success' && (
          <>
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 pb-6 border-b border-white/10">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bundle</span>
                  <span className="font-semibold text-white">{order.bundle?.name || order.bundle_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span className="font-semibold text-white">{order.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="font-semibold text-white">{order.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="font-semibold text-white">{order.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity</span>
                  <span className="font-semibold text-white">x{order.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Delivery Address</span>
                  <span className="font-semibold text-white text-right max-w-xs">
                    {order.delivery_address}
                  </span>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-center">
                <span className="text-xl font-bold text-white">Total Amount</span>
                <span className="text-3xl font-bold text-emerald-400">
                  GH₵ {Number(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <CreditCard className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Payment Method</h2>
              </div>

              <div className="space-y-4">
                <button
                  onClick={initiatePayment}
                  disabled={processing || paymentStatus !== 'idle'}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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


              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
