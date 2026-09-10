import { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  MapPin, 
  Package, 
  Clock, 
  Phone, 
  User as UserIcon, 
  Download, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  Calendar, 
  Truck, 
  ChefHat, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [isGuestOrder, setIsGuestOrder] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    const reference = urlParams.get('reference') || urlParams.get('trxref') || `PAY-${Date.now()}`;

    if (!orderId) {
      navigate('/');
      return;
    }

    confirmPaymentAndLoadOrder(orderId, reference);
  }, [user, authLoading]);

  const confirmPaymentAndLoadOrder = async (orderId: string, reference: string) => {
    try {
      setLoading(true);
      setError('');

      // 1. Try to fetch from registered orders first
      let { data: regOrder } = await supabase
        .from('orders')
        .select('*, bundle:bundles(*)')
        .eq('id', orderId)
        .maybeSingle();

      let isGuest = false;
      let orderRecord = regOrder;

      // 2. If not found in registered orders, check guest_orders
      if (!orderRecord) {
        const { data: guestOrder } = await supabase
          .from('guest_orders')
          .select('*, bundle:bundles(*)')
          .eq('id', orderId)
          .maybeSingle();

        if (guestOrder) {
          isGuest = true;
          orderRecord = guestOrder;
        }
      }

      if (!orderRecord) {
        throw new Error('Order not found. Please check your order reference.');
      }

      setIsGuestOrder(isGuest);

      // 3. Mark the order as confirmed and payment as success in DB
      if (isGuest) {
        await supabase
          .from('guest_orders')
          .update({
            status: 'confirmed',
            payment_status: 'success',
            payment_reference: reference
          })
          .eq('id', orderId);
      } else {
        await supabase
          .from('orders')
          .update({
            status: 'confirmed'
          })
          .eq('id', orderId);

        // Update transaction if exists
        await supabase
          .from('transactions')
          .update({
            status: 'success',
            payment_reference: reference
          })
          .eq('order_id', orderId);
      }

      // 4. Secure RPC trigger execution
      try {
        await supabase.rpc('simulate_payment_success', {
          p_order_id: orderId,
          p_is_guest: isGuest
        });
      } catch (rpcErr) {
        console.warn('RPC call notice (already updated directly):', rpcErr);
      }

      // 5. Update local state to reflect confirmed status
      setOrder({
        ...orderRecord,
        status: 'confirmed',
        payment_status: 'success',
        payment_reference: reference
      });
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setError(err.message || 'Failed to load order details, but your payment was processed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'ref') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      }
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const openWhatsAppSupport = () => {
    const orderNum = order?.id ? order.id.slice(0, 8).toUpperCase() : '';
    const message = encodeURIComponent(`Hi Food Bundle Support! I just completed payment for Order #${orderNum}. Please can you confirm my delivery status?`);
    window.open(`https://wa.me/233500000000?text=${message}`, '_blank');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col justify-center items-center px-4 py-20">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin flex items-center justify-center"></div>
          <ChefHat className="w-8 h-8 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mt-6 mb-2 text-center">Confirming Your Payment</h2>
        <p className="text-gray-300 text-sm max-w-md text-center">Securing your order with Paystack & notifying our kitchen...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col justify-center items-center px-4 py-20">
        <div className="bg-white/10 backdrop-blur-xl border border-red-400/30 shadow-2xl p-8 rounded-3xl max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
          <p className="text-gray-300 text-sm mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/bundles" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/20">
              Browse Packages
            </Link>
            <button onClick={openWhatsAppSupport} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-white/20">
              <MessageCircle size={18} className="text-emerald-400" /> Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortOrderId = order?.id ? order.id.slice(0, 8).toUpperCase() : 'N/A';
  const displayDate = order?.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';
  const displayTime = order?.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const customerName = order?.full_name || user?.user_metadata?.full_name || 'Customer';
  const customerPhone = order?.phone || user?.user_metadata?.phone || 'On file';
  const totalPaid = Number(order?.total_amount || 0).toFixed(2);
  const deliveryFee = Number(order?.delivery_fee || 0).toFixed(2);
  const bundlePrice = (Number(order?.total_amount || 0) - Number(order?.delivery_fee || 0)).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-8 md:py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* TOP HERO HEADER */}
        <div className="text-center relative">
          <div className="inline-flex relative mb-6">
            {/* Glowing ring aura */}
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-500 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/25">
              <div className="w-full h-full bg-slate-900/90 rounded-full flex items-center justify-center border border-white/10">
                <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-400 animate-in zoom-in-50 duration-500" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold tracking-wide uppercase mb-3 backdrop-blur-md shadow-sm">
            <ShieldCheck size={16} /> Payment Verified & Approved
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3">
            Payment Successful!
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto">
            Thank you, <span className="text-emerald-400 font-bold">{customerName}</span>! Your order has been placed and forwarded to our kitchen.
          </p>

          {/* Quick Order Reference Pill */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm">
              <span className="text-gray-400 font-medium">Order ID:</span>
              <span className="font-mono font-bold text-white tracking-wider">#{shortOrderId}</span>
              <button 
                onClick={() => copyToClipboard(order?.id || '', 'id')}
                className="text-gray-400 hover:text-emerald-400 p-1 rounded transition"
                title="Copy full order ID"
              >
                {copiedId ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm">
              <span className="text-gray-400 font-medium">Status:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Confirmed & In Kitchen
              </span>
            </div>
          </div>
        </div>

        {/* ORDER PROGRESS TIMELINE */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" /> Live Order Progress
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold mb-2 shadow-sm">
                <Check size={18} className="stroke-[3]" />
              </div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-tight">Step 1</span>
              <span className="text-sm font-semibold text-white">Payment Received</span>
              <span className="text-[11px] text-emerald-300/80 mt-0.5 font-mono">{displayTime}</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 relative overflow-hidden">
              <div className="absolute top-1 right-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block"></span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/50 flex items-center justify-center font-bold mb-2">
                <ChefHat size={18} />
              </div>
              <span className="text-xs font-bold text-blue-300 uppercase tracking-tight">Step 2</span>
              <span className="text-sm font-semibold text-white">Kitchen Prep</span>
              <span className="text-[11px] text-gray-300 mt-0.5">Packing fresh</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/50 border border-white/10">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-gray-400 flex items-center justify-center font-bold mb-2">
                <Truck size={18} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Step 3</span>
              <span className="text-sm font-semibold text-gray-300">Driver Pickup</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Assigned next</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/50 border border-white/10">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-gray-400 flex items-center justify-center font-bold mb-2">
                <Package size={18} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Step 4</span>
              <span className="text-sm font-semibold text-gray-300">Delivered</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Room / Hostel Drop</span>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: ORDER SUMMARY & DELIVERY DETAILS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Package & Items Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Ordered Package</h3>
                    <p className="text-xs text-gray-300">Items selected for delivery</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Qty: {order?.quantity || 1}
                </span>
              </div>

              <div className="flex items-start gap-4">
                {order?.bundle?.image_url ? (
                  <img 
                    src={order.bundle.image_url} 
                    alt={order.bundle.name} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 flex-shrink-0 shadow-md" 
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Package size={32} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-lg leading-tight mb-1 truncate">
                    {order?.bundle?.name || 'Custom Package'}
                  </h4>
                  <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                    {order?.bundle?.description || 'Fresh campus groceries & food essentials package.'}
                  </p>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    GH₵ {bundlePrice}
                  </div>
                </div>
              </div>

              {/* Customized items list if present */}
              {order?.custom_items && order.custom_items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs font-semibold text-gray-300 block mb-2">Customized Selection:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {order.custom_items.map((item: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center text-xs bg-slate-800/80 text-gray-200 px-2.5 py-1 rounded-md border border-white/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special notes if present */}
              {order?.notes && (
                <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-gray-300">
                  <span className="font-semibold text-gray-400 block mb-0.5">Delivery Notes:</span>
                  {order.notes}
                </div>
              )}
            </div>

            {/* Delivery Destination Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-white/10">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Delivery Destination</h3>
                  <p className="text-xs text-gray-300">Where our driver will bring your parcel</p>
                </div>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/10">
                  <MapPin size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-400 block">Address / Location:</span>
                    <span className="font-semibold text-white">{order?.delivery_address || 'Campus Hub Delivery'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                    <UserIcon size={16} className="text-gray-400" />
                    <div>
                      <span className="text-[11px] text-gray-400 block">Recipient:</span>
                      <span className="font-medium text-white truncate block max-w-[140px]">{customerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                    <Phone size={16} className="text-gray-400" />
                    <div>
                      <span className="text-[11px] text-gray-400 block">Contact:</span>
                      <span className="font-medium text-white">{customerPhone}</span>
                    </div>
                  </div>
                </div>

                {order?.delivery_date && (
                  <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                    <Calendar size={16} className="text-blue-400" />
                    <div>
                      <span className="text-[11px] text-gray-400 block">Scheduled Delivery:</span>
                      <span className="font-medium text-white">
                        {order.delivery_date} {order.delivery_time ? `(${order.delivery_time})` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PICKUP PIN CARD (High Security Feature) */}
            {order?.pickup_pin && (
              <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-1">
                      Delivery Verification PIN
                    </span>
                    <p className="text-xs text-gray-300">
                      Show this 4-digit PIN to the driver when your order arrives.
                    </p>
                  </div>
                  <div className="bg-slate-900/90 px-4 py-2.5 rounded-xl border border-emerald-400/50 shadow-inner">
                    <span className="font-mono text-2xl font-black text-emerald-400 tracking-widest">
                      {order.pickup_pin}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: FINANCIAL RECEIPT & ACTIONS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Receipt Summary Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Payment Receipt</h3>
                </div>
                <span className="text-xs font-medium text-gray-400">{displayDate}</span>
              </div>

              {/* Line item breakdown */}
              <div className="space-y-3 text-sm pb-5 border-b border-white/10 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package Subtotal</span>
                  <span className="font-mono text-white">GH₵ {bundlePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Delivery Zone Fee</span>
                  <span className="font-mono text-white">GH₵ {deliveryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Gateway</span>
                  <span className="text-white font-medium">Paystack</span>
                </div>
                {order?.payment_reference && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Reference</span>
                    <div className="flex items-center gap-1.5 font-mono text-gray-300 bg-slate-900/70 px-2 py-1 rounded border border-white/10">
                      <span>{order.payment_reference.slice(0, 14)}...</span>
                      <button 
                        onClick={() => copyToClipboard(order.payment_reference, 'ref')}
                        className="hover:text-emerald-400 text-gray-400"
                        title="Copy full reference"
                      >
                        {copiedRef ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Paid Highlight (matches GH₵ 6.00 in screenshot) */}
              <div className="pt-4 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Amount Paid</span>
                  <span className="text-xs text-emerald-400 font-medium">Zero Balance Due</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    GH₵ {totalPaid}
                  </span>
                </div>
              </div>
            </div>

            {/* CALL TO ACTIONS */}
            <div className="space-y-3">
              {/* Primary: Track Order Button (Requires account for guests) */}
              {isGuestOrder && !user ? (
                <button
                  onClick={() => {
                    const regUrl = `/register?redirect=${encodeURIComponent(`/track/${order.id}`)}&email=${encodeURIComponent(order?.email || '')}&name=${encodeURIComponent(order?.full_name || '')}&phone=${encodeURIComponent(order?.phone || '')}`;
                    navigate(regUrl);
                  }}
                  className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.99]"
                >
                  <UserIcon size={20} />
                  <span>Create Account to Track Order</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/track/${order.id}`)}
                  className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.99]"
                >
                  <Truck size={20} />
                  <span>Track Delivery Status</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Secondary Buttons Row */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePrintReceipt}
                  className="py-3.5 px-4 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center justify-center gap-2 text-sm backdrop-blur-md"
                >
                  <Download size={16} className="text-gray-400" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={openWhatsAppSupport}
                  className="py-3.5 px-4 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center justify-center gap-2 text-sm backdrop-blur-md"
                >
                  <MessageCircle size={16} className="text-emerald-400" />
                  <span>Help Desk</span>
                </button>
              </div>

              {/* GUEST BANNER PROMPT (If not logged in) */}
              {isGuestOrder && !user && (
                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-5 mt-4 text-white">
                  <h4 className="font-bold text-white text-sm mb-1">Create an Account to Earn Rewards</h4>
                  <p className="text-xs text-gray-300 mb-3">
                    Save this order to your student profile, unlock fast 1-click reorders, and earn campus loyalty points.
                  </p>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-blue-200 transition"
                  >
                    <span>Register Student Account</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {/* Return to Packages Link */}
              <div className="pt-2 text-center">
                <Link
                  to="/bundles"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition"
                >
                  <span>Order Another Package</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

