import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from '../lib/navigation';
import { ArrowLeft, Calendar, MapPin, User, Mail, Phone } from 'lucide-react';

export default function GuestCheckout() {
  const [bundle, setBundle] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(700);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bundleId = urlParams.get('bundle');
    if (bundleId) {
      loadBundle(bundleId);
      loadSettings();
    } else {
      navigate('/packages');
    }
  }, []);

  const loadBundle = async (bundleId: string) => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', bundleId)
        .eq('available', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/packages');
        return;
      }
      setBundle(data);
    } catch (error) {
      console.error('Error loading bundle:', error);
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) {
        setDeliveryFee(Number(data.delivery_charge));
        setFreeDeliveryThreshold(Number(data.free_delivery_threshold || 700));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle) return;

    setError('');
    setSubmitting(true);

    try {
      const subtotal = Number(bundle.price) * quantity;
      const isFreeDelivery = subtotal >= freeDeliveryThreshold;
      const finalDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
      const totalAmount = subtotal + finalDeliveryFee;

      const { data: orderData, error: orderError } = await supabase
        .from('guest_orders')
        .insert({
          bundle_id: bundle.id,
          full_name: fullName,
          email,
          phone,
          quantity,
          total_amount: totalAmount,
          delivery_fee: finalDeliveryFee,
          delivery_address: deliveryAddress,
          delivery_date: deliveryDate || null,
          delivery_time: deliveryTime || null,
          notes: notes || null,
          status: 'pending',
          payment_status: 'pending',
          pickup_pin: Math.floor(1000 + Math.random() * 9000).toString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      navigate(`/guest-payment?order=${orderData.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Failed to create order. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!bundle) return null;

  const subtotal = Number(bundle.price) * quantity;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const finalDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const totalAmount = subtotal + finalDeliveryFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          to="/packages"
          className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Packages
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Guest Checkout</h1>
        <p className="text-gray-300 mb-8">No account needed - just fill in your details and pay</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Details</h2>

            <div className="mb-6 pb-6 border-b border-white/10">
              <h3 className="font-semibold text-white mb-2">{bundle.name}</h3>
              <p className="text-gray-400 text-sm mb-3">{bundle.description}</p>
              <p className="text-2xl font-bold text-emerald-400">
                GH₵ {Number(bundle.price).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="+233 XX XXX XXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Delivery Address
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Enter your delivery address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Preferred Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Preferred Time</label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="" className="bg-slate-800">Select time</option>
                  <option value="Morning (8am-12pm)" className="bg-slate-800">Morning (8am-12pm)</option>
                  <option value="Afternoon (12pm-4pm)" className="bg-slate-800">Afternoon (12pm-4pm)</option>
                  <option value="Evening (4pm-8pm)" className="bg-slate-800">Evening (4pm-8pm)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Special Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={2}
                  placeholder="Any special instructions?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : `Proceed to Payment - GH₵ ${totalAmount.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-400/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-300">
                  <span>Bundle Price</span>
                  <span>GH₵ {Number(bundle.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Quantity</span>
                  <span>x{quantity}</span>
                </div>
                <div className="flex justify-between text-gray-300 border-t border-white/10 pt-2 mt-2">
                  <span>Delivery Fee</span>
                  <span className="text-white font-medium">
                    {isFreeDelivery ? <span className="line-through text-gray-500 mr-2">GH₵ {deliveryFee.toFixed(2)}</span> : null}
                    GH₵ {finalDeliveryFee.toFixed(2)}
                  </span>
                </div>
                {isFreeDelivery && (
                  <div className="flex justify-between text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-md mt-1">
                    <span>🎉 Free Delivery Applied!</span>
                    <span>-GH₵ {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between text-lg font-bold text-white">
                  <span>Total Amount</span>
                  <span className="text-emerald-400">GH₵ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {bundle.items && bundle.items.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">What's included:</p>
                  <ul className="space-y-1">
                    {bundle.items.map((item: string, index: number) => (
                      <li key={index}>+ {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-400/20 rounded-2xl p-6 text-center">
              <p className="text-gray-300 text-sm mb-3">
                Want to track your orders and manage subscriptions?
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                Create a free account <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
