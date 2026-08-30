import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from '../lib/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Sunrise, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Lock, 
  Minus, 
  Plus, 
  CheckCircle2, 
  ShoppingBag, 
  CreditCard, 
  PackageCheck,
  Truck,
  Gift
} from 'lucide-react';
import LocationZoneSelector, { DeliveryZone } from '../components/checkout/LocationZoneSelector';

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
  const [deliveryFee, setDeliveryFee] = useState(10);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(700);

  // Delivery Zones 2-Tier State
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [roomOrLandmark, setRoomOrLandmark] = useState<string>('');
  const [isCustomAddress, setIsCustomAddress] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bundleId = urlParams.get('bundle');
    if (bundleId) {
      loadBundle(bundleId);
      loadDeliveryZones();
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
        if (!selectedZoneId && data.delivery_charge) {
          setDeliveryFee(Number(data.delivery_charge));
        }
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
          delivery_address: computedAddress,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top Breadcrumb & Stepper */}
        <div className="mb-8">
          <Link
            to="/packages"
            className="inline-flex items-center text-xs font-semibold text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Packages
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  ⚡ Express Guest Checkout
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  No Account Needed
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Complete Your Order</h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">Parents, friends & students can order directly with instant Mobile Money confirmation</p>
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
                <span>Guest Details</span>
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
                  <p className="text-xs text-gray-300 line-clamp-2 mb-3">{bundle.description}</p>

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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/15 border border-red-500/40 text-red-200 rounded-xl text-sm font-medium animate-in fade-in">
                  {error}
                </div>
              )}

              {/* 1. Recipient Information */}
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Recipient Details</h3>
                    <p className="text-[11px] text-gray-400">Student or receiver contact for order alerts</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Full Name (Recipient or Student)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 font-medium text-sm"
                      placeholder="e.g. Kwesi Mensah"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Email Address (For Receipt)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-sm font-medium"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Phone Number (For Driver Calls)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-sm font-semibold"
                        placeholder="+233 XX XXX XXXX"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Modern Location & Campus Zone Selector */}
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

              {/* 3. Schedule & Delivery Instructions */}
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Delivery Time & Notes</h3>
                    <p className="text-[11px] text-gray-400">Choose when you'd like your food delivered</p>
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
                    placeholder="e.g. Call when outside the gate, leave with roommate if not answering..."
                  />
                </div>
              </div>

              {/* Mobile Submit Button */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Processing...' : `Proceed to Payment (GH₵ ${totalAmount.toFixed(2)})`}
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
                  <span>Bundle Price</span>
                  <span className="text-white font-bold">GH₵ {Number(bundle.price).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-300">
                  <span>Quantity</span>
                  <span className="text-white font-bold">×{quantity}</span>
                </div>

                <div className="flex justify-between text-gray-300 border-t border-white/10 pt-2 mt-2">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-white">
                    {isFreeDelivery ? (
                      <span className="line-through text-gray-500 mr-1.5">GH₵ {deliveryFee.toFixed(2)}</span>
                    ) : null}
                    GH₵ {finalDeliveryFee.toFixed(2)}
                  </span>
                </div>

                {isFreeDelivery && (
                  <div className="flex justify-between text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <span className="flex items-center gap-1">🎉 Free Delivery Applied!</span>
                    <span>-GH₵ {deliveryFee.toFixed(2)}</span>
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
                {submitting ? 'Processing...' : `Proceed to Payment • GH₵ ${totalAmount.toFixed(2)}`}
              </button>

              {/* Included Items Details */}
              {bundle.items && bundle.items.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
                    Included Meal Items:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {bundle.items.map((item: string, idx: number) => (
                      <span key={idx} className="text-[11px] font-medium bg-slate-800 text-gray-300 px-2 py-1 rounded-md border border-white/10">
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Optional Account Creation Callout */}
            <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-blue-300 font-bold text-xs">
                <Gift className="w-4 h-4 text-amber-400" />
                Want loyalty discounts on future orders?
              </div>
              <p className="text-gray-400 text-xs mb-3">
                Create a student account to earn points, unlock semester discounts & track all deliveries.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition shadow-sm"
              >
                Create Free Account <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
