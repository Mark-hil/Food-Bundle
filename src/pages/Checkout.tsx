import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/navigation';
import { ArrowLeft, Calendar, MapPin, Gift } from 'lucide-react';
import { Link } from '../lib/navigation';

export default function Checkout() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [isSubscription, setIsSubscription] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bundleId = urlParams.get('bundle');
    const reorder = urlParams.get('reorder');
    const subscribeParam = urlParams.get('subscribe');
    
    if (subscribeParam === 'true') {
      setIsSubscription(true);
    }
    
    if (bundleId) {
      loadBundle(bundleId);
      if (reorder === 'true') {
        loadLastOrderAddress();
      }
    } else {
      navigate('/');
    }
    if (user) {
      loadLoyaltyPoints();
    }
  }, [user]);

  const loadBundle = async (bundleId: string) => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', bundleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/');
        return;
      }
      setBundle(data);
    } catch (error) {
      console.error('Error loading bundle:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadLastOrderAddress = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('delivery_address')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.delivery_address) {
        setDeliveryAddress(data.delivery_address);
      }
    } catch (error) {
      console.error('Error loading last order:', error);
    }
  };

  const loadLoyaltyPoints = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('balance')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.balance) {
        setLoyaltyPoints(Math.floor(data.balance));
      }
    } catch (error) {
      console.error('Error loading loyalty points:', error);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setPromoError('');
    setPromoSuccess('');

    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!promo) {
        setPromoError('Invalid or inactive promo code');
        return;
      }

      // Check expiration
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        setPromoError('This promo code has expired');
        return;
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        setPromoError('This promo code has reached its usage limit');
        return;
      }

      // Check minimum order amount
      const subtotal = Number(bundle!.price) * quantity * (isSubscription ? 3 : 1);
      if (promo.min_order_amount && subtotal < promo.min_order_amount) {
        setPromoError(
          `Minimum order amount of GH₵ ${promo.min_order_amount} required for this promo`
        );
        return;
      }

      // Calculate discount
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = subtotal * (promo.discount_value / 100);
      } else if (promo.discount_type === 'fixed') {
        discount = promo.discount_value;
      }
      // Cap discount at subtotal
      discount = Math.min(discount, subtotal);

      // Increment current_uses
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update({ current_uses: (promo.current_uses || 0) + 1 })
        .eq('id', promo.id);

      if (updateError) throw updateError;

      setPromoDiscount(discount);
      setPromoSuccess(`Promo applied! You save GH₵ ${discount.toFixed(2)}`);
      setPromoCode('');
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError('Failed to apply promo code');
    }
  };

  const applyLoyaltyPoints = () => {
    if (!usePoints) {
      setUsePoints(true);
      const maxPoints = Math.min(loyaltyPoints, Math.floor((Number(bundle!.price) * quantity) / 100) * 100);
      setPointsToUse(maxPoints);
      setPointsDiscount(maxPoints / 100);
    } else {
      setUsePoints(false);
      setPointsToUse(0);
      setPointsDiscount(0);
    }
  };

  const updatePointsAmount = (points: number) => {
    const capped = Math.min(points, loyaltyPoints);
    const subtotal = Number(bundle!.price) * quantity * (isSubscription ? 3 : 1);
    const maxDiscount = Math.min(capped / 100, subtotal);
    setPointsToUse(capped);
    setPointsDiscount(maxDiscount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle || !user) return;

    setError('');
    setSubmitting(true);

    try {
      const DELIVERY_FEE = 15;
      const deliveryCount = isSubscription ? 3 : 1;
      const baseDeliveryCost = DELIVERY_FEE * deliveryCount;
      const subDeliveryDiscount = isSubscription ? baseDeliveryCost * 0.20 : 0;
      const finalDeliveryCost = baseDeliveryCost - subDeliveryDiscount;

      const subtotal = Number(bundle.price) * quantity * (isSubscription ? 3 : 1);
      const subscriptionDiscount = isSubscription ? subtotal * 0.05 : 0;
      const totalDiscount = promoDiscount + pointsDiscount + subscriptionDiscount;
      const totalAmount = Math.max(0, subtotal + finalDeliveryCost - totalDiscount);

      let subscriptionId: string | undefined;

      if (isSubscription) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            student_id: user.id,
            bundle_id: bundle.id,
            frequency: 'monthly',
            quantity,
            delivery_address: deliveryAddress,
            delivery_time: deliveryTime || null,
            status: 'active',
            next_delivery_date: deliveryDate || new Date().toISOString().split('T')[0],
            duration_months: 3,
            deliveries_made: 0
          })
          .select()
          .single();
        if (subError) throw subError;
        subscriptionId = subData.id;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          student_id: user.id,
          bundle_id: bundle.id,
          subscription_id: subscriptionId,
          quantity,
          total_amount: totalAmount,
          delivery_fee: finalDeliveryCost,
          delivery_address: deliveryAddress,
          delivery_date: deliveryDate || null,
          delivery_time: deliveryTime || null,
          notes: isSubscription ? `[SEMESTER SUBSCRIPTION: Delivery 1 of 3] ${notes}`.trim() : (notes || null),
          status: 'pending',
          pickup_pin: Math.floor(1000 + Math.random() * 9000).toString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          order_id: orderData.id,
          student_id: user.id,
          amount: totalAmount,
          status: 'pending',
        });

      if (transactionError) throw transactionError;

      // Award loyalty points
      const pointsEarned = Math.floor(totalAmount / 100) * 10;
      if (pointsEarned > 0) {
        try {
          // Get current balance
          const { data: lastRecord } = await supabase
            .from('loyalty_points')
            .select('balance')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const currentBalance = lastRecord?.balance || 0;
          const newBalance = currentBalance + pointsEarned;

          await supabase.from('loyalty_points').insert({
            student_id: user.id,
            points: pointsEarned,
            balance: newBalance,
            type: 'earned',
            reference: `Order ${orderData.id.slice(0, 8)}`,
          });
        } catch (pointsError) {
          console.error('Error awarding loyalty points:', pointsError);
          // Don't fail the order if points fail
        }
      }

      // Deduct loyalty points if used
      if (usePoints && pointsToUse > 0) {
        try {
          const { data: lastRecord } = await supabase
            .from('loyalty_points')
            .select('balance')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const currentBalance = lastRecord?.balance || 0;
          const newBalance = currentBalance - pointsToUse;

          await supabase.from('loyalty_points').insert({
            student_id: user.id,
            points: -pointsToUse,
            balance: newBalance,
            type: 'redeemed',
            reference: `Order ${orderData.id.slice(0, 8)}`,
          });
        } catch (deductError) {
          console.error('Error deducting loyalty points:', deductError);
          // Don't fail the order if points deduction fails
        }
      }

      navigate(`/payment?order=${orderData.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Failed to create order. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!bundle) return null;

  const DELIVERY_FEE = 15;
  const deliveryCount = isSubscription ? 3 : 1;
  const baseDeliveryCost = DELIVERY_FEE * deliveryCount;
  const subDeliveryDiscount = isSubscription ? baseDeliveryCost * 0.20 : 0;
  const finalDeliveryCost = baseDeliveryCost - subDeliveryDiscount;

  const subtotal = Number(bundle.price) * quantity * (isSubscription ? 3 : 1);
  const subscriptionDiscount = isSubscription ? subtotal * 0.05 : 0;
  const totalDiscount = promoDiscount + pointsDiscount + subscriptionDiscount;
  const totalAmount = Math.max(0, subtotal + finalDeliveryCost - totalDiscount);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link
        to="/"
        className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Bundles
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-white mb-4">Order Details</h2>

          <div className="mb-6 pb-6 border-b border-white/10">
            <h3 className="font-semibold text-white mb-2">{bundle.name}</h3>
            <p className="text-gray-400 text-sm mb-3">{bundle.description}</p>
            <p className="text-2xl font-bold text-emerald-400">
              GH₵ {Number(bundle.price).toFixed(2)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-emerald-400" />
                Delivery Address
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500"
                rows={3}
                placeholder="Enter your delivery address on campus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-blue-400" />
                Preferred Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Time
              </label>
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none [&>option]:bg-slate-800"
              >
                <option value="">Select time</option>
                <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                <option value="Afternoon (12pm-4pm)">Afternoon (12pm-4pm)</option>
                <option value="Evening (4pm-8pm)">Evening (4pm-8pm)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500"
                rows={2}
                placeholder="Any special instructions?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Promo Code (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500"
                  placeholder="Enter promo code"
                />
                <button
                  type="button"
                  onClick={applyPromoCode}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-lg transition border border-white/10"
                >
                  Apply
                </button>
              </div>
              {promoError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm">
                  {promoError}
                </div>
              )}
              {promoSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg text-sm">
                  {promoSuccess}
                </div>
              )}
            </div>

            {loyaltyPoints > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Gift className="w-4 h-4 mr-1 text-purple-400" />
                  Loyalty Points
                </label>
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 mb-3">
                  <p className="text-sm text-gray-400 mb-3">
                    You have <span className="font-bold text-purple-400">{loyaltyPoints} points</span>
                    <span className="text-gray-500 block text-xs mt-1">(100 points = GH₵ 1 discount)</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="usePoints"
                      checked={usePoints}
                      onChange={applyLoyaltyPoints}
                      className="w-4 h-4 text-purple-500 rounded border-gray-600 bg-slate-800 focus:ring-purple-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="usePoints" className="text-sm text-gray-300 flex-1">
                      Redeem loyalty points for discount
                    </label>
                  </div>
                  {usePoints && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <label className="text-xs font-medium text-gray-400 block mb-2">
                        Points to redeem (up to {loyaltyPoints})
                      </label>
                      <input
                        type="number"
                        value={pointsToUse}
                        onChange={(e) => updatePointsAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                        min="0"
                        max={loyaltyPoints}
                        step="10"
                      />
                      <p className="text-xs text-purple-400 mt-2 font-medium">
                        Discount: -GH₵ {pointsDiscount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-bold py-4 px-4 rounded-xl transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Processing...' : `Proceed to Payment - GH₵ ${totalAmount.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
          {isSubscription && (
            <div className="bg-purple-500/10 text-purple-400 px-4 py-3 rounded-lg text-sm mb-6 border border-purple-500/20">
              <span className="font-semibold">Semester Subscription</span> (3 Deliveries)
            </div>
          )}
          <div className="space-y-3 mb-6 text-sm md:text-base">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal</span>
              <span className="text-white font-medium">GH₵ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Quantity</span>
              <span className="text-white font-medium">×{quantity} {isSubscription ? '(×3 Months)' : ''}</span>
            </div>
            <div className="flex justify-between text-gray-300 pt-2 border-t border-white/5 mt-2">
              <span>Delivery Fee {isSubscription && '(×3 Deliveries)'}</span>
              <span className="text-white font-medium">GH₵ {baseDeliveryCost.toFixed(2)}</span>
            </div>
            {subDeliveryDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Subscriber Delivery Discount (20%)</span>
                <span>-GH₵ {subDeliveryDiscount.toFixed(2)}</span>
              </div>
            )}
            {subscriptionDiscount > 0 && (
              <div className="flex justify-between text-purple-400 font-semibold pt-2 border-t border-white/5 mt-2">
                <span>Semester Food Discount (5%)</span>
                <span>-GH₵ {subscriptionDiscount.toFixed(2)}</span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Promo Discount</span>
                <span>-GH₵ {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-blue-400 font-semibold">
                <span>Points Discount</span>
                <span>-GH₵ {pointsDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-4 mt-2 flex justify-between items-center text-lg md:text-xl font-bold text-white">
              <span>Total Amount</span>
              <span className="text-emerald-400">GH₵ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-gray-400">
            <p className="font-semibold text-white mb-3">What's included:</p>
            <ul className="space-y-2">
              {bundle.items?.map((item, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                  {item}
                </li>
              )) || <li>Meal items as described</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
