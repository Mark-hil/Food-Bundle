import { useEffect, useState } from 'react';
import { CheckCircle, Clock, XCircle, Package, ArrowLeft, RefreshCw, MapPin, Calendar, Timer, Lock, CheckCircle2 } from 'lucide-react';
import { supabase, Order, Bundle } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from '../../lib/navigation';
import ReceiptDownload from '../../components/ReceiptDownload';

interface OrderTimeline {
  id: string;
  order_id: string;
  status: string;
  note?: string;
  created_at: string;
}

interface OrderData extends Order {
  bundle?: Bundle;
}

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Pending',
  confirmed: 'Order Confirmed',
  preparing: 'Preparing Order',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Order Cancelled',
};

export default function TrackDelivery() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [timeline, setTimeline] = useState<OrderTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etaTime, setEtaTime] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Delivery ETA countdown
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') return;

    const calculateETA = () => {
      let targetDate: Date | null = null;

      if (order.delivery_date) {
        const match = order.delivery_time?.match(/\((\d+)(?:am|pm)-(\d+)(?:am|pm)\)/i);
        const hours = match ? parseInt(match[1]) : 12;
        targetDate = new Date(order.delivery_date);
        targetDate.setHours(hours, 0, 0, 0);
      }

      if (!targetDate) {
        const createdAt = new Date(order.created_at);
        const estimatedHours: Record<string, number> = {
          pending: 48,
          confirmed: 36,
          preparing: 6,
          ready: 1,
        };
        targetDate = new Date(createdAt.getTime() + (estimatedHours[order.status] || 48) * 60 * 60 * 1000);
      }

      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setEtaTime({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setEtaTime({ hours, minutes, seconds });
    };

    calculateETA();
    const interval = setInterval(calculateETA, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // Extract order ID from pathname
  const orderId = pathname.split('/').pop();

  useEffect(() => {
    if (!user || !orderId) {
      setError('Invalid order ID or user not authenticated');
      setLoading(false);
      return;
    }

    const fetchOrderData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch order with bundle relation
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, bundle:bundles(*)')
          .eq('id', orderId)
          .maybeSingle();

        if (orderError) throw orderError;

        if (!orderData) {
          setError('Order not found');
          setOrder(null);
          setTimeline([]);
          return;
        }

        setOrder(orderData);

        // Fetch order timeline
        const { data: timelineData, error: timelineError } = await supabase
          .from('order_timeline')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (timelineError) throw timelineError;

        setTimeline(timelineData || []);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId, user]);

  const confirmReceipt = async () => {
    if (!order) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', order.id);

      if (error) throw error;
      
      // Update local state to reflect the change
      setOrder({ ...order, status: 'delivered' });
    } catch (err) {
      console.error('Error confirming receipt:', err);
      setError('Failed to confirm receipt');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStepStatus = (status: string): 'completed' | 'current' | 'pending' => {
    if (!order) return 'pending';

    if (order.status === 'cancelled') {
      return status === 'cancelled' ? 'current' : 'pending';
    }

    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const statusIndex = STATUS_FLOW.indexOf(status);

    if (statusIndex < currentIndex) return 'completed';
    if (statusIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold mb-4 transition"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-12 text-center">
          <Package size={48} className="mx-auto text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error || "We couldn't find the order you're looking for."}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayTimeline = order.status === 'cancelled'
    ? timeline.filter(t => t.status === 'cancelled')
    : timeline;

  const timlineSteps = order.status === 'cancelled'
    ? ['cancelled']
    : STATUS_FLOW;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Track Order</h1>
          <p className="text-gray-400 mt-2">Order #{order.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ReceiptDownload order={order as any} />
          <button
            onClick={() => navigate(`/checkout?bundle=${order.bundle?.id}`)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white px-6 py-2 md:py-3 rounded-lg font-semibold transition transform hover:scale-105"
          >
            <RefreshCw size={18} />
            Reorder
          </button>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-8">Delivery Progress</h2>

        {/* PIN Display and Confirm Button */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mb-8 grid md:grid-cols-2 gap-4">
            {order.pickup_pin && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Lock size={16} />
                    <span className="text-sm font-semibold uppercase tracking-wider">Pickup PIN</span>
                  </div>
                  <p className="text-3xl font-mono font-bold tracking-widest text-emerald-400">{order.pickup_pin}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                  <Package size={32} className="text-emerald-400" />
                </div>
              </div>
            )}
            
            {order.status === 'ready' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                <p className="text-emerald-400 font-semibold mb-3">Have you received your order?</p>
                <button
                  onClick={confirmReceipt}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/50 text-white py-3 px-4 rounded-lg font-bold transition transform hover:scale-105"
                >
                  <CheckCircle2 size={20} />
                  Confirm Receipt
                </button>
              </div>
            )}
          </div>
        )}

        {/* ETA Countdown */}
        {etaTime && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mb-8 bg-gradient-to-r from-blue-900/40 to-emerald-900/40 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Timer size={20} className="text-blue-400" />
              <h3 className="font-bold text-white">Estimated Delivery</h3>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <p className="text-3xl font-bold text-blue-400">{String(etaTime.hours).padStart(2, '0')}</p>
                <p className="text-xs text-gray-400 uppercase">Hours</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <p className="text-3xl font-bold text-blue-400">{String(etaTime.minutes).padStart(2, '0')}</p>
                <p className="text-xs text-gray-400 uppercase">Minutes</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <p className="text-3xl font-bold text-blue-400">{String(etaTime.seconds).padStart(2, '0')}</p>
                <p className="text-xs text-gray-400 uppercase">Seconds</p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10"></div>

          {/* Timeline steps */}
          <div className="space-y-8">
            {timlineSteps.map((status) => {
              const stepStatus = getStepStatus(status);
              const timelineEntry = displayTimeline.find(t => t.status === status);
              const isCurrentStep = stepStatus === 'current' && order.status !== 'delivered';
              const isCancelled = status === 'cancelled' && order.status === 'cancelled';

              let dotColor = 'bg-slate-800 text-gray-500 border border-white/10';
              let dotBgColor = 'bg-white/5 border border-white/5';
              let icon = <Clock size={20} />;

              if (stepStatus === 'completed' || isCancelled || (status === 'delivered' && order.status === 'delivered')) {
                dotColor = isCancelled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                dotBgColor = isCancelled ? 'bg-red-500/5 border border-red-500/10' : 'bg-emerald-500/5 border border-emerald-500/10';
                icon = isCancelled ? <XCircle size={20} /> : <CheckCircle size={20} />;
              } else if (isCurrentStep) {
                dotColor = 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400';
                dotBgColor = 'bg-blue-500/5 border border-blue-500/20';
                icon = <Clock size={20} />;
              }

              return (
                <div key={status} className="relative flex gap-6">
                  {/* Dot */}
                  <div
                    className={`relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${dotColor} ${
                      isCurrentStep ? 'animate-pulse' : ''
                    }`}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pt-2 pb-4 md:pb-6 ${dotBgColor} rounded-lg px-4 md:px-6 py-4 -ml-2 md:-ml-4 transition-all`}>
                    <h3 className="font-bold text-white text-base md:text-lg">
                      {STATUS_LABELS[status]}
                    </h3>
                    {timelineEntry && (
                      <>
                        <p className="text-xs md:text-sm text-gray-400 mt-1">
                          {formatDate(timelineEntry.created_at)} at {formatTime(timelineEntry.created_at)}
                        </p>
                        {timelineEntry.note && (
                          <p className="text-sm text-gray-300 mt-2 italic border-l-2 border-white/20 pl-3 py-1 bg-white/5 rounded-r">{timelineEntry.note}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bundle Details */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Package size={20} className="text-blue-400" />
            Order Details
          </h3>
          <div className="space-y-4">
            <div className="pb-4 border-b border-white/10">
              <p className="text-gray-400 text-sm mb-1">Bundle</p>
              <p className="font-semibold text-white text-lg">{order.bundle?.name || 'Unknown Bundle'}</p>
            </div>
            <div className="pb-4 border-b border-white/10">
              <p className="text-gray-400 text-sm mb-1">Quantity</p>
              <p className="font-semibold text-white">{order.quantity} pack(s)</p>
            </div>
            <div className="pb-4 border-b border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Amount</p>
              <p className="font-bold text-white text-xl">
                GHS {(order.total_amount || 0).toFixed(2)}
              </p>
            </div>
            {order.notes && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Order Notes</p>
                <p className="text-gray-300 p-3 bg-white/5 rounded-lg border border-white/5 text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-400" />
            Delivery Information
          </h3>
          <div className="space-y-4">
            <div className="pb-4 border-b border-white/10">
              <p className="text-gray-400 text-sm mb-1">Delivery Address</p>
              <p className="font-semibold text-white">{order.delivery_address}</p>
            </div>
            {order.delivery_date && (
              <div className="pb-4 border-b border-white/10">
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                  <Calendar size={16} />
                  Delivery Date
                </p>
                <p className="font-semibold text-white">{formatDate(order.delivery_date)}</p>
              </div>
            )}
            {order.delivery_time && (
              <div>
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                  <Clock size={16} />
                  Estimated Time
                </p>
                <p className="font-semibold text-white">{order.delivery_time}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bundle Items */}
      {order.bundle && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Package size={20} className="text-blue-400" />
            Bundle Contents
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {order.bundle.items && order.bundle.items.map((item) => (
              <div key={item} className="bg-white/5 border border-white/10 rounded-lg p-4 transition hover:bg-white/10">
                <p className="text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
