import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Sun, 
  Moon, 
  Sunrise, 
  ShieldCheck, 
  Lock, 
  Minus, 
  Plus, 
  CheckCircle2, 
  ShoppingBag, 
  CreditCard, 
  Tag, 
  Coins, 
  PackageCheck,
  Truck
} from 'lucide-react';
import { Link } from '../lib/navigation';
import LocationZoneSelector, { DeliveryZone } from '../components/checkout/LocationZoneSelector';

export default function Checkout() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
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
  const [deliveryFee, setDeliveryFee] = useState(10);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(700);
  const [subFoodDiscountPercent, setSubFoodDiscountPercent] = useState(40);
  const [subDeliveryDiscountPercent, setSubDeliveryDiscountPercent] = useState(20);
  const [loyaltyEarnStepAmount, setLoyaltyEarnStepAmount] = useState(10);
  const [loyaltyEarnStepPoints, setLoyaltyEarnStepPoints] = useState(10);
  const [loyaltyRedemptionRatio, setLoyaltyRedemptionRatio] = useState(100);
  const [loyaltyMinPointsToRedeem, setLoyaltyMinPointsToRedeem] = useState(500);
  const [customItems, setCustomItems] = useState<string[]>([]);
  
  // Delivery Zones 2-Tier State
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [roomOrLandmark, setRoomOrLandmark] = useState<string>('');
  const [isCustomAddress, setIsCustomAddress] = useState<boolean>(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bundleId = urlParams.get('bundle');
    const reorder = urlParams.get('reorder');
    const subscribeParam = urlParams.get('subscribe');
    const customParam = urlParams.get('custom');
    
    if (subscribeParam === 'true') {
      setIsSubscription(true);
    }

    if (customParam) {
      const stored = sessionStorage.getItem(`custom_bundle_${customParam}`);
      if (stored) {
        try {
          setCustomItems(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse custom items', e);
        }
      }
    }
    
    if (bundleId) {
      loadBundle(bundleId);
      loadDeliveryZones();
      if (reorder === 'true') {
        loadLastOrderAddress();
      }
      loadSettings();
    } else {
      navigate('/');
    }
    if (user) {
      loadLoyaltyPoints();
      loadProfilePhone();
    }
  }, [user]);

  const loadProfilePhone = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
      if (!error && data?.phone) {
        setDeliveryPhone(data.phone);
      }
    } catch (error) {
      console.error('Error loading profile phone:', error);
    }
  };

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

  const loadDeliveryZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('hub_name', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setDeliveryZones(data);
        const firstHub = data[0].hub_name;
        setSelectedHub(firstHub);
        const firstZone = data.find(z => z.hub_name === firstHub);
        if (firstZone) {
          setSelectedZoneId(firstZone.id);
          setDeliveryFee(Number(firstZone.delivery_fee));
        }
      }
    } catch (err) {
      console.error('Error loading delivery zones:', err);
    }
  };

  const handleHubSelect = (hub: string) => {
    setSelectedHub(hub);
    const matching = deliveryZones.filter(z => z.hub_name === hub);
    if (matching.length > 0) {
      setSelectedZoneId(matching[0].id);
      setDeliveryFee(Number(matching[0].delivery_fee));
    }
  };

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const found = deliveryZones.find(z => z.id === zoneId);
    if (found) {
      setDeliveryFee(Number(found.delivery_fee));
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
        // Fallback standard fee if no zone selected
        if (!selectedZoneId && data.delivery_charge) {
          setDeliveryFee(Number(data.delivery_charge));
        }
        setFreeDeliveryThreshold(Number(data.free_delivery_threshold || 700));
        setSubFoodDiscountPercent(Number(data.subscription_food_discount_percent || 40));
        setSubDeliveryDiscountPercent(Number(data.subscription_delivery_discount_percent || 20));
        setLoyaltyEarnStepAmount(Number(data.loyalty_earn_step_amount || 10));
        setLoyaltyEarnStepPoints(Number(data.loyalty_earn_step_points || 10));
        setLoyaltyRedemptionRatio(Number(data.loyalty_redemption_ratio || 100));
        setLoyaltyMinPointsToRedeem(Number(data.loyalty_min_points_to_redeem || 500));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
    if (loyaltyPoints < loyaltyMinPointsToRedeem) return;
    if (!usePoints) {
      setUsePoints(true);
      const maxPoints = Math.min(loyaltyPoints, Math.floor((Number(bundle!.price) * quantity) / loyaltyRedemptionRatio) * loyaltyRedemptionRatio);
      setPointsToUse(maxPoints);
      setPointsDiscount(maxPoints / loyaltyRedemptionRatio);
    } else {
      setUsePoints(false);
      setPointsToUse(0);
      setPointsDiscount(0);
    }
  };

  const updatePointsAmount = (points: number) => {
    const capped = Math.min(points, loyaltyPoints);
    const subtotal = Number(bundle!.price) * quantity * (isSubscription ? 3 : 1);
    const maxDiscount = Math.min(capped / loyaltyRedemptionRatio, subtotal);
    setPointsToUse(capped);
    setPointsDiscount(maxDiscount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle || !user) return;

    setError('');
    setSubmitting(true);

    try {
      const activeZone = deliveryZones.find(z => z.id === selectedZoneId);
      const computedAddress = isCustomAddress 
        ? deliveryAddress 
        : activeZone 
          ? `[${activeZone.hub_name} - ${activeZone.zone_name}] ${roomOrLandmark}`.trim()
          : (deliveryAddress || roomOrLandmark);

      if (!computedAddress || (!isCustomAddress && !roomOrLandmark.trim())) {
        setError('Please specify your hostel room number, floor, or delivery location details.');
        setSubmitting(false);
        return;
      }

      const deliveryCount = isSubscription ? 3 : 1;
      const baseDeliveryCost = deliveryFee * deliveryCount;
      const subtotal = Number(bundle.price) * quantity * (isSubscription ? 3 : 1);

      const isFreeDelivery = subtotal >= freeDeliveryThreshold;
      const subDeliveryDiscount = (!isFreeDelivery && isSubscription) ? baseDeliveryCost * (subDeliveryDiscountPercent / 100) : 0;
      const freeDeliveryDiscount = isFreeDelivery ? baseDeliveryCost : 0;
      
      const finalDeliveryCost = baseDeliveryCost - subDeliveryDiscount - freeDeliveryDiscount;

      const subscriptionDiscount = isSubscription ? subtotal * (subFoodDiscountPercent / 100) : 0;
      const totalDiscount = promoDiscount + pointsDiscount + subscriptionDiscount;
      const totalAmount = Math.max(0, subtotal + finalDeliveryCost - totalDiscount);

      const pointsEarned = Math.floor(totalAmount / loyaltyEarnStepAmount) * loyaltyEarnStepPoints;

      const { data: orderId, error: rpcError } = await supabase.rpc('place_order', {
        p_student_id: user.id,
        p_bundle_id: bundle.id,
        p_quantity: quantity,
        p_is_subscription: isSubscription,
        p_delivery_address: computedAddress,
        p_delivery_time: deliveryTime || null,
        p_delivery_date: deliveryDate || null,
        p_notes: isSubscription ? `[SEMESTER SUBSCRIPTION: Delivery 1 of 3] ${notes}`.trim() : (notes || null),
        p_pickup_pin: Math.floor(1000 + Math.random() * 9000).toString(),
        p_custom_items: customItems.length > 0 ? customItems : null,
        p_delivery_phone: deliveryPhone || null,
        p_total_amount: totalAmount,
        p_delivery_fee: finalDeliveryCost,
        p_use_points: usePoints,
        p_points_to_use: pointsToUse,
        p_points_earned: pointsEarned
      });

      if (rpcError) throw rpcError;

      navigate(`/payment?order=${orderId}`);
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

  const deliveryCount = isSubscription ? 3 : 1;
  const baseDeliveryCost = deliveryFee * deliveryCount;
  const subtotal = Number(bundle.price) * quantity * (isSubscription ? 3 : 1);

  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const subDeliveryDiscount = (!isFreeDelivery && isSubscription) ? baseDeliveryCost * (subDeliveryDiscountPercent / 100) : 0;
  const freeDeliveryDiscount = isFreeDelivery ? baseDeliveryCost : 0;
  
  const finalDeliveryCost = baseDeliveryCost - subDeliveryDiscount - freeDeliveryDiscount;

  const subscriptionDiscount = isSubscription ? subtotal * (subFoodDiscountPercent / 100) : 0;
  const totalDiscount = promoDiscount + pointsDiscount + subscriptionDiscount;
  const totalAmount = Math.max(0, subtotal + finalDeliveryCost - totalDiscount);

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Top Breadcrumb & Progress Stepper */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Packages
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                🔒 Secure Student Checkout
              </span>
              {isSubscription && (
                <span className="bg-purple-500/20 text-purple-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  Semester Plan
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Complete Your Order</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Direct hostel doorstep drop with verified 4-digit pickup PIN</p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold bg-slate-900/60 p-2 rounded-xl border border-white/10">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Package</span>
            </div>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Details</span>
            </div>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-1.5 text-gray-400">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bundle Preview Card */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl">
            <div className="flex items-start gap-4">
              {bundle.image_url ? (
                <img 
                  src={bundle.image_url} 
                  alt={bundle.name} 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-blue-600/30 to-emerald-600/30 border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                  <ShoppingBag className="w-8 h-8 text-emerald-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white truncate">{bundle.name}</h3>
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-400 shrink-0">
                    GH₵ {Number(bundle.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{bundle.description}</p>

                {/* Quantity Stepper & Price Multiplier */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Quantity:</span>
                    <div className="flex items-center bg-slate-800 border border-white/20 rounded-xl overflow-hidden p-0.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        disabled={quantity >= 10}
                        className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-gray-400 block">Subtotal</span>
                    <span className="text-sm font-bold text-white">
                      GH₵ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Details Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/15 border border-red-500/40 text-red-200 rounded-xl text-sm font-medium animate-in fade-in">
                {error}
              </div>
            )}

            {/* 1. Location & Campus Selector */}
            <LocationZoneSelector
              deliveryZones={deliveryZones}
              selectedHub={selectedHub}
              selectedZoneId={selectedZoneId}
              roomOrLandmark={roomOrLandmark}
              isCustomAddress={isCustomAddress}
              deliveryAddress={deliveryAddress}
              onSelectHub={handleHubSelect}
              onSelectZone={handleZoneSelect}
              onChangeRoom={setRoomOrLandmark}
              onChangeCustomAddress={setDeliveryAddress}
              onToggleCustom={() => setIsCustomAddress(!isCustomAddress)}
            />

            {/* 2. Recipient Contact & Schedule */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Contact & Delivery Time</h3>
                  <p className="text-[11px] text-gray-400">Driver will call before arrival</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Recipient Active Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 font-semibold text-sm"
                    placeholder="e.g. 0244 123 456"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Preferred Delivery Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                  />
                </div>
              </div>

              {/* Time Window Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Preferred Time Window</span>
                  <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { value: 'Morning (8am-12pm)', label: 'Morning', time: '8:00 AM – 12:00 PM', icon: Sunrise, color: 'text-amber-400' },
                    { value: 'Afternoon (12pm-4pm)', label: 'Afternoon', time: '12:00 PM – 4:00 PM', icon: Sun, color: 'text-orange-400' },
                    { value: 'Evening (4pm-8pm)', label: 'Evening', time: '4:00 PM – 8:00 PM', icon: Moon, color: 'text-indigo-400' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = deliveryTime === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setDeliveryTime(isSelected ? '' : item.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-md' 
                            : 'bg-slate-800/40 border-white/10 hover:border-white/20 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                          <span className="text-xs font-bold text-white">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-400">{item.time}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Special Delivery Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-sm"
                  rows={2}
                  placeholder="e.g. Call upon reaching hostel gate, drop with porter if in lecture..."
                />
              </div>
            </div>

            {/* 3. Promo Code & Loyalty Points */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Discounts & Rewards</h3>
                  <p className="text-[11px] text-gray-400">Apply voucher coupon or redeem student loyalty points</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Promo / Voucher Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-sm uppercase font-mono tracking-wider"
                    placeholder="DISCOUNT10"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition border border-white/15 shrink-0"
                  >
                    Apply Code
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-xs font-semibold text-red-400">{promoError}</p>
                )}
                {promoSuccess && (
                  <p className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {promoSuccess}
                  </p>
                )}
              </div>

              {loyaltyPoints > 0 && (
                <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">Student Loyalty Points</span>
                    </div>
                    <span className="text-xs font-extrabold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/30">
                      {loyaltyPoints} pts available
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {loyaltyRedemptionRatio} points = GH₵ 1.00 instant discount. (Min {loyaltyMinPointsToRedeem} points).
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      id="usePoints"
                      checked={usePoints}
                      onChange={applyLoyaltyPoints}
                      disabled={loyaltyPoints < loyaltyMinPointsToRedeem}
                      className="w-4 h-4 text-purple-500 rounded border-gray-600 bg-slate-800 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-300 font-medium">
                      Redeem points on this purchase
                    </span>
                  </label>
                  {usePoints && (
                    <div className="pt-2 border-t border-purple-500/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={pointsToUse}
                          onChange={(e) => updatePointsAmount(parseInt(e.target.value) || 0)}
                          className="w-28 px-2.5 py-1.5 bg-slate-800 border border-purple-500/40 text-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-purple-400 outline-none"
                          min="0"
                          max={loyaltyPoints}
                          step="10"
                        />
                        <span className="text-[11px] text-gray-400">points applied</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                        <span>Points Discount:</span>
                        <span>-GH₵ {pointsDiscount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Submit Button inside form for accessibility */}
            <div className="lg:hidden">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {submitting ? 'Creating Order...' : `Proceed to Payment (GH₵ ${totalAmount.toFixed(2)})`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Sticky Order Summary & Trust Guarantee */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* Summary Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Order Summary
              </h3>
              <span className="text-xs text-gray-400 font-medium">{quantity} item(s)</span>
            </div>

            {/* Price Breakdown Line Items */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Bundle Subtotal</span>
                <span className="text-white font-bold">GH₵ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-300">
                <span>Delivery Fee {isSubscription && '(Semester)'}</span>
                <span className="font-semibold text-white">
                  {isFreeDelivery ? (
                    <span className="line-through text-gray-500 mr-1.5">GH₵ {baseDeliveryCost.toFixed(2)}</span>
                  ) : null}
                  GH₵ {finalDeliveryCost.toFixed(2)}
                </span>
              </div>

              {freeDeliveryDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <span className="flex items-center gap-1">🎉 Free Delivery Triggered!</span>
                  <span>-GH₵ {freeDeliveryDiscount.toFixed(2)}</span>
                </div>
              )}

              {subDeliveryDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Subscriber Delivery Saver</span>
                  <span>-GH₵ {subDeliveryDiscount.toFixed(2)}</span>
                </div>
              )}

              {subscriptionDiscount > 0 && (
                <div className="flex justify-between text-purple-400 font-medium">
                  <span>Semester Food Discount ({subFoodDiscountPercent}%)</span>
                  <span>-GH₵ {subscriptionDiscount.toFixed(2)}</span>
                </div>
              )}

              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Coupon Promo Discount</span>
                  <span>-GH₵ {promoDiscount.toFixed(2)}</span>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className="flex justify-between text-purple-400 font-bold">
                  <span>Loyalty Points Discount</span>
                  <span>-GH₵ {pointsDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="border-t border-white/10 pt-4 mt-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-extrabold text-white block">Grand Total</span>
                  <span className="text-[10px] text-gray-400">All taxes & campus fees included</span>
                </div>
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  GH₵ {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Desktop Proceed Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-extrabold py-4 px-6 rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" />
              {submitting ? 'Creating Order...' : `Proceed to Payment • GH₵ ${totalAmount.toFixed(2)}`}
            </button>

            {/* Included Items Details */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
                Bundle Meal Items {customItems.length > 0 ? '(Customized)' : ''}:
              </p>
              
              {customItems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {(bundle.items || []).filter(item => customItems.includes(item)).map((item, idx) => (
                    <span key={`kept-${idx}`} className="text-[11px] font-medium bg-slate-800 text-gray-300 px-2 py-1 rounded-md border border-white/10">
                      {item}
                    </span>
                  ))}
                  {customItems.filter(item => !(bundle.items || []).includes(item)).map((item, idx) => (
                    <span key={`added-${idx}`} className="text-[11px] font-bold bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-md border border-emerald-500/30">
                      + {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {bundle.items?.map((item, idx) => (
                    <span key={idx} className="text-[11px] font-medium bg-slate-800 text-gray-300 px-2 py-1 rounded-md border border-white/10">
                      • {item}
                    </span>
                  )) || <span className="text-xs text-gray-500">Standard pack contents</span>}
                </div>
              )}
            </div>
          </div>

          {/* Trust, Payment Methods & Security Guarantee Card */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Supported Fast Payment Channels
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-bold text-white">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  MTN MoMo
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                  Telecel Cash
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  AT Money
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  Debit Card
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-gray-400">
              <div className="flex items-center gap-2 text-gray-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-Bit SSL Encrypted & Verified by Paystack / Hubtel</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Real-Time Driver Tracking & 4-Digit Pickup PIN Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
