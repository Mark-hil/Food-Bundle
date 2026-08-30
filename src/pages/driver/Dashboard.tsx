import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Package, 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  User, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Award, 
  Search, 
  CheckCheck, 
  Zap,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function DriverDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'mine' | 'analytics' | 'history'>('available');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);
  const [deliveryFeeRate, setDeliveryFeeRate] = useState<number>(10);
  const [driverPayoutPercent, setDriverPayoutPercent] = useState<number>(90);
  const [driverBatchBonus, setDriverBatchBonus] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    if (!user) return;
    
    fetchOrders();

    // Set up Realtime live updates for driver orders
    const ordersChannel = supabase
      .channel('driver-orders-live-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch system delivery fee & driver payout settings
      try {
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (settingsData) {
          if (settingsData.delivery_charge && !isNaN(Number(settingsData.delivery_charge))) {
            setDeliveryFeeRate(Number(settingsData.delivery_charge));
          }
          if (settingsData.driver_payout_percent && !isNaN(Number(settingsData.driver_payout_percent))) {
            setDriverPayoutPercent(Number(settingsData.driver_payout_percent));
          }
          if (settingsData.driver_batch_bonus && !isNaN(Number(settingsData.driver_batch_bonus))) {
            setDriverBatchBonus(Number(settingsData.driver_batch_bonus));
          }
        }
      } catch (e) {
        // Default to GH₵ 10.00 base, 90% payout, GH₵ 5.00 batch bonus
      }

      // Fetch available orders
      const { data: availableData, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone, student_id)
        `)
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;
      setAvailableOrders(availableData || []);

      // Fetch my active route orders
      const { data: myData, error: myError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone, student_id)
        `)
        .eq('driver_id', user?.id)
        .in('status', ['ready', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (myError) throw myError;
      setMyOrders(myData || []);

      // Fetch my completed delivered orders for analytics and history
      const { data: deliveredData, error: deliveredError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone, student_id)
        `)
        .eq('driver_id', user?.id)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false });

      if (deliveredError) throw deliveredError;
      setDeliveredOrders(deliveredData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Address normalizer for batch detection
  const normalizeAddress = (addr?: string) => {
    if (!addr) return '';
    return addr
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['room', 'hall', 'hostel', 'block', 'floor', 'flat', 'door', 'near', 'campus'].includes(w))
      .slice(0, 3)
      .join(' ')
      .trim();
  };

  // Calculate order payout and batch bonuses for any order within an order list
  const calculateOrderPayout = (order: any, orderList: any[]) => {
    const orderFee = Number(order.delivery_fee) > 0 ? Number(order.delivery_fee) : deliveryFeeRate;
    const basePayout = orderFee * (driverPayoutPercent / 100);

    const orderDate = new Date(order.updated_at || order.created_at).toDateString();
    const orderNorm = normalizeAddress(order.delivery_address);

    const matchingGroup = orderList.filter(o => {
      const d = new Date(o.updated_at || o.created_at).toDateString();
      const norm = normalizeAddress(o.delivery_address);
      return d === orderDate && (norm === orderNorm || (orderNorm && norm.includes(orderNorm)) || (norm && orderNorm.includes(norm)));
    });

    const isBatch = matchingGroup.length > 1;
    matchingGroup.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const orderIndex = matchingGroup.findIndex(o => o.id === order.id);

    const hasBonus = isBatch && orderIndex > 0;
    const bonusAmount = hasBonus ? driverBatchBonus : 0;
    const totalPayout = basePayout + bonusAmount;

    return {
      basePayout,
      bonusAmount,
      totalPayout,
      isBatch,
      hasBonus,
      batchSize: matchingGroup.length,
      batchIndex: orderIndex + 1,
    };
  };

  // Check if an available order is batch-eligible with currently claimed or other available orders
  const checkAvailableBatchBonus = (order: any) => {
    const orderNorm = normalizeAddress(order.delivery_address);
    if (!orderNorm) return null;

    // Check if driver has already claimed an order for the same location
    const matchInMine = myOrders.find(m => {
      const mNorm = normalizeAddress(m.delivery_address);
      return mNorm === orderNorm || (orderNorm && mNorm.includes(orderNorm)) || (mNorm && orderNorm.includes(mNorm));
    });
    if (matchInMine) {
      return {
        type: 'claimed_match',
        message: 'Matches an active order in your route! (+Bonus)',
        bonus: driverBatchBonus,
      };
    }

    // Check if multiple available orders exist for the same location
    const matchesInAvailable = availableOrders.filter(a => a.id !== order.id && (() => {
      const aNorm = normalizeAddress(a.delivery_address);
      return aNorm === orderNorm || (orderNorm && aNorm.includes(orderNorm)) || (aNorm && orderNorm.includes(aNorm));
    })());
    if (matchesInAvailable.length > 0) {
      return {
        type: 'available_batch',
        message: `Bundle with ${matchesInAvailable.length} other order(s) for this location`,
        bonus: driverBatchBonus,
      };
    }
    return null;
  };

  // Analytics calculations using accurate driver payout formula
  const analyticsSummary = useMemo(() => {
    let baseTotal = 0;
    let bonusTotal = 0;

    const seenBatches = new Set<string>();

    deliveredOrders.forEach(order => {
      const res = calculateOrderPayout(order, deliveredOrders);
      baseTotal += res.basePayout;
      bonusTotal += res.bonusAmount;
      if (res.isBatch) {
        const key = `${new Date(order.updated_at || order.created_at).toDateString()}_${normalizeAddress(order.delivery_address)}`;
        seenBatches.add(key);
      }
    });

    const netEarnings = baseTotal + bonusTotal;

    const todayStr = new Date().toDateString();
    const todayOrders = deliveredOrders.filter(o => new Date(o.updated_at || o.created_at).toDateString() === todayStr);
    
    let todayBase = 0;
    let todayBonus = 0;
    todayOrders.forEach(o => {
      const res = calculateOrderPayout(o, deliveredOrders);
      todayBase += res.basePayout;
      todayBonus += res.bonusAmount;
    });

    return {
      totalDelivered: deliveredOrders.length,
      baseTotal,
      bonusTotal,
      netEarnings,
      batchesCompleted: seenBatches.size,
      todayOrders,
      todayEarnings: todayBase + todayBonus,
      todayBonus,
      totalOrderValue: deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    };
  }, [deliveredOrders, deliveryFeeRate, driverPayoutPercent, driverBatchBonus]);

  // 7-day trend chart data
  const chartData = useMemo(() => {
    const days: { day: string; date: string; deliveries: number; earnings: number; base: number; bonus: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOrders = deliveredOrders.filter(o => new Date(o.updated_at || o.created_at).toDateString() === dateStr);
      
      let dayBase = 0;
      let dayBonus = 0;
      dayOrders.forEach(o => {
        const res = calculateOrderPayout(o, deliveredOrders);
        dayBase += res.basePayout;
        dayBonus += res.bonusAmount;
      });

      days.push({
        day: dayName,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deliveries: dayOrders.length,
        earnings: dayBase + dayBonus,
        base: dayBase,
        bonus: dayBonus,
      });
    }
    return days;
  }, [deliveredOrders, deliveryFeeRate, driverPayoutPercent, driverBatchBonus]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return deliveredOrders;
    const q = historySearch.toLowerCase();
    return deliveredOrders.filter(o => 
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.profiles?.full_name && o.profiles.full_name.toLowerCase().includes(q)) ||
      (o.profiles?.student_id && o.profiles.student_id.toLowerCase().includes(q)) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(q)) ||
      (o.bundles?.name && o.bundles.name.toLowerCase().includes(q))
    );
  }, [deliveredOrders, historySearch]);

  const claimOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: user?.id })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
      setActiveTab('mine');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const unclaimOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: null })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
      setActiveTab('available');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const startDelivery = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const cancelDeliveryTrip = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const completeDelivery = async (orderId: string, correctPin: string) => {
    if (deliveryPin !== correctPin) {
      setPinError('Incorrect PIN');
      return;
    }

    try {
      setActionLoading(orderId);
      setPinError('');
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)
        .eq('pickup_pin', deliveryPin); // Extra safety check

      if (error) throw error;
      
      setVerifyingOrder(null);
      setDeliveryPin('');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const OrderCard = ({ order, type }: { order: any, type: 'available' | 'mine' }) => {
    const payoutInfo = calculateOrderPayout(order, type === 'mine' ? myOrders : availableOrders);
    const availableBatchInfo = type === 'available' ? checkAvailableBatchBonus(order) : null;

    return (
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 p-5 mb-5 relative overflow-hidden transform hover:-translate-y-1">
        {/* Top Gradient Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
          type === 'available' ? 'from-emerald-400 via-teal-500 to-emerald-400' : 
          order.status === 'out_for_delivery' ? 'from-orange-400 via-amber-500 to-orange-400' : 'from-blue-400 via-indigo-500 to-blue-400'
        }`}></div>

        <div className="flex justify-between items-start mb-4 mt-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-200">
                #{order.id.slice(0, 8)}
              </span>
              {type === 'mine' && payoutInfo.hasBonus && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  🔥 Batch Drop #{payoutInfo.batchIndex} (+GH₵ {driverBatchBonus.toFixed(2)})
                </span>
              )}
              {type === 'available' && availableBatchInfo && (
                <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  🔥 Batch Bonus Eligible (+GH₵ {driverBatchBonus.toFixed(2)})
                </span>
              )}
            </div>
            <h3 className="font-bold text-lg text-slate-900 mt-2 leading-tight">{order.bundles?.name}</h3>
          </div>

          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm inline-block ${
              order.status === 'out_for_delivery' 
                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {order.status === 'out_for_delivery' ? '🚗 In Transit' : '✨ Ready'}
            </div>
            <p className="text-xs font-extrabold text-emerald-600 mt-1 font-display">
              GH₵ {payoutInfo.totalPayout.toFixed(2)} Payout
            </p>
          </div>
        </div>

        {/* Batch Opportunity Notice for Available Orders */}
        {type === 'available' && availableBatchInfo && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs font-medium text-amber-900">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{availableBatchInfo.message}</span>
          </div>
        )}

        <div className="space-y-3 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {/* Student / Customer Name */}
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex flex-col pt-0.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Student / Customer</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  {order.profiles?.full_name || order.full_name || 'Student Customer'}
                </span>
                {order.profiles?.student_id && (
                  <span className="text-[10px] font-mono font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    ID: {order.profiles.student_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex flex-col pt-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Delivery Address</span>
              <span className="text-sm font-medium text-slate-700 leading-snug">{order.delivery_address}</span>
            </div>
          </div>
          
          {(() => {
            const phoneNum = order.delivery_phone || order.profiles?.phone;
            return phoneNum ? (
              <a href={`tel:${phoneNum}`} className="flex items-center group cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-emerald-50 transition-all duration-200">
                <div className="w-8 h-8 rounded-full bg-white group-hover:bg-emerald-100 shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100 group-hover:border-emerald-200 transition-colors">
                  <Phone className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Contact</span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">{phoneNum}</span>
                </div>
              </a>
            ) : (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Contact</span>
                  <span className="text-sm font-medium text-slate-400">No phone provided</span>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
            <div className="flex items-center">
              <Clock className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
              <span className="text-xs text-slate-500 font-medium">
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Base: <span className="font-bold text-slate-900">GH₵ {payoutInfo.basePayout.toFixed(2)}</span>
              {payoutInfo.hasBonus && (
                <span className="text-emerald-600 font-bold ml-1.5">+ GH₵ {payoutInfo.bonusAmount.toFixed(2)} Bonus</span>
              )}
            </div>
          </div>
        </div>

        {type === 'available' ? (
          <button
            onClick={() => claimOrder(order.id)}
            disabled={actionLoading === order.id}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] flex justify-center items-center group"
          >
            {actionLoading === order.id ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Claiming...</span>
              </div>
            ) : (
              <span className="flex items-center">
                Claim Order (Earn GH₵ {payoutInfo.totalPayout.toFixed(2)}) <Truck className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        ) : (
          <div>
            {order.status === 'ready' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => startDelivery(order.id)}
                  disabled={actionLoading === order.id}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] flex justify-center items-center group disabled:opacity-50"
                >
                  {actionLoading === order.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <span className="flex items-center">
                      Start Delivery <MapPin className="w-5 h-5 ml-2 group-hover:animate-bounce" />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => unclaimOrder(order.id)}
                  disabled={actionLoading === order.id}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-semibold rounded-xl transition-colors border border-slate-200 text-xs disabled:opacity-50 flex items-center justify-center"
                  title="Release order back to available deliveries"
                >
                  Release
                </button>
              </div>
            ) : (
              <div>
                {verifyingOrder === order.id ? (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-slate-900">Verify Delivery</h4>
                      <p className="text-xs text-slate-500 mt-1">Ask the student for their 4-digit PIN</p>
                    </div>
                    <input
                      type="text"
                      value={deliveryPin}
                      onChange={(e) => setDeliveryPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl mb-3 text-center text-3xl font-mono tracking-[0.5em] font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-base"
                      maxLength={4}
                      placeholder="Enter PIN"
                      autoFocus
                    />
                    {pinError && <p className="text-red-500 text-sm font-medium mb-4 text-center bg-red-50 py-2 rounded-lg">{pinError}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setVerifyingOrder(null); setDeliveryPin(''); setPinError(''); }}
                        className="flex-1 py-3.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => completeDelivery(order.id, order.pickup_pin)}
                        disabled={actionLoading === order.id || deliveryPin.length < 4}
                        className="flex-[2] py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {actionLoading === order.id ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          'Complete'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVerifyingOrder(order.id)}
                      disabled={actionLoading === order.id}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex justify-center items-center group disabled:opacity-50"
                    >
                      <span className="flex items-center">
                        Mark as Delivered <CheckCircle2 className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                      </span>
                    </button>
                    <button
                      onClick={() => cancelDeliveryTrip(order.id)}
                      disabled={actionLoading === order.id}
                      className="px-4 py-3.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-semibold rounded-xl transition-colors border border-slate-200 text-xs disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                      title="Cancel delivery trip and return order to Ready state"
                    >
                      Cancel Trip
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Top Header & Tabs Container */}
      <div className="bg-slate-900 sticky top-0 z-30 shadow-xl rounded-b-3xl mb-6">
        {/* Header */}
        <div className="px-5 py-5 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Driver Hub</h1>
              <p className="text-xs text-slate-400 font-medium">{profile?.full_name || user?.user_metadata?.full_name}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-10 h-10 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full flex items-center justify-center transition-all"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Main Tabs: Available, My Route, Analytics, History */}
        <div className="grid grid-cols-4 px-4 py-3 gap-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'available' 
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.03]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="truncate">Available</span>
            {availableOrders.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full font-bold bg-white/30 text-white">
                {availableOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mine')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'mine' 
                ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/20 scale-[1.03]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="truncate">Active</span>
            {myOrders.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full font-bold bg-white/30 text-white">
                {myOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 scale-[1.03]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="truncate">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'history' 
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 scale-[1.03]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="truncate">Logs</span>
            {deliveredOrders.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] rounded-full font-bold bg-white/20 text-white">
                {deliveredOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-200 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-red-500 font-bold">!</span>
          </div>
          {error}
        </div>
      )}

      {/* Content Container */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin shadow-lg"></div>
            <p className="mt-4 text-slate-500 font-medium">Loading orders...</p>
          </div>
        ) : activeTab === 'available' ? (
          availableOrders.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {availableOrders.map(order => <OrderCard key={order.id} order={order} type="available" />)}
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-white rounded-3xl border border-slate-200 border-dashed animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Orders Available</h3>
              <p className="text-slate-500 text-sm">When new orders are ready for delivery, they will appear here in real time.</p>
            </div>
          )
        ) : activeTab === 'mine' ? (
          myOrders.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {myOrders.map(order => <OrderCard key={order.id} order={order} type="mine" />)}
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-white rounded-3xl border border-slate-200 border-dashed animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                <Truck className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Your Route is Empty</h3>
              <p className="text-slate-500 text-sm">Claim some orders from the Available tab to start delivering!</p>
            </div>
          )
        ) : activeTab === 'analytics' ? (
          /* =========================================================================
             ANALYTICS & PERFORMANCE DASHBOARD
             ========================================================================= */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Earnings Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Driver Payout Hub</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Verified PIN Delivery
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Net Driver Earnings</p>
                  <p className="text-3xl font-extrabold text-white mt-0.5 tracking-tight font-display">
                    GH₵ {analyticsSummary.netEarnings.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                    +GH₵ {analyticsSummary.todayEarnings.toFixed(2)} earned today
                  </p>
                </div>
                <div className="border-l border-white/10 pl-4">
                  <p className="text-xs text-slate-400 font-medium">Total Deliveries</p>
                  <p className="text-3xl font-extrabold text-amber-400 mt-0.5 tracking-tight font-display">
                    {analyticsSummary.totalDelivered}
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium mt-1">
                    {analyticsSummary.todayOrders.length} trips completed today
                  </p>
                </div>
              </div>

              {/* Payout Breakdown Bar */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Base Trip Pay ({driverPayoutPercent}%):</span>
                  <p className="font-bold text-white">GH₵ {analyticsSummary.baseTotal.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Batch Drop Bonuses:</span>
                  <p className="font-bold text-amber-400">+GH₵ {analyticsSummary.bonusTotal.toFixed(2)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400">Batches Formed:</span>
                  <p className="font-bold text-indigo-300">{analyticsSummary.batchesCompleted} multi-drops</p>
                </div>
              </div>
            </div>

            {/* Batch Bonus Policy Explainer Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">How You Earn as a Delivery Partner</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    You receive <span className="font-bold text-slate-900">{driverPayoutPercent}%</span> of every customer delivery fee (standard ~GH₵ {(deliveryFeeRate * (driverPayoutPercent / 100)).toFixed(2)}/drop). When delivering multiple packages to the same hostel or area on the same run, you earn an extra <span className="font-bold text-amber-700">+GH₵ {driverBatchBonus.toFixed(2)} Batch Drop Bonus</span> on every additional package!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Today's Trips</span>
                  <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{analyticsSummary.todayOrders.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Deliveries fulfilled today</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Meal Volume</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">GH₵ {analyticsSummary.totalOrderValue.toFixed(0)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Total food value delivered</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Active In-Route</span>
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">{myOrders.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Deliveries currently in progress</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Driver Rating</span>
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600">5.0 ★</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Top delivery partner</p>
              </div>
            </div>

            {/* 7-Day Activity Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">7-Day Delivery Activity</h3>
                  <p className="text-xs text-slate-500">Completed deliveries across the past week</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {chartData.reduce((acc, c) => acc + c.deliveries, 0)} Total
                </span>
              </div>

              <div className="h-48 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="driverDeliveryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} Deliveries`, 'Completed']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#driverDeliveryGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 7-Day Earnings Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Weekly Earnings Trend (Base + Batch Bonus)</h3>
                  <p className="text-xs text-slate-500">Daily net payouts in Cedis (GH₵)</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  GH₵ {chartData.reduce((acc, c) => acc + c.earnings, 0).toFixed(2)}
                </span>
              </div>

              <div className="h-44 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₵${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`GH₵ ${Number(val || 0).toFixed(2)}`, 'Driver Payout']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="earnings" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             COMPLETED DELIVERY LOGS / HISTORY
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history by student, package, ID..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredHistory.length > 0 ? (
              <div className="space-y-3">
                {filteredHistory.map((order) => {
                  const payout = calculateOrderPayout(order, deliveredOrders);
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                              #{order.id.slice(0, 8)}
                            </span>
                            {payout.hasBonus && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                🔥 Batch Drop #{payout.batchIndex}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-base mt-1">{order.bundles?.name || 'Package'}</h4>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Delivered
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Customer</p>
                          <p className="font-semibold text-slate-900 truncate">{order.profiles?.full_name || order.full_name || 'Customer'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Student ID</p>
                          <p className="font-mono text-slate-800">{order.profiles?.student_id || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 mt-1">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Location</p>
                          <p className="text-slate-700 truncate">{order.delivery_address}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400 font-medium">
                          {new Date(order.updated_at || order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-600 font-display text-sm">
                            +GH₵ {payout.totalPayout.toFixed(2)} Earned
                          </span>
                          {payout.hasBonus && (
                            <p className="text-[10px] text-amber-600 font-medium">(Includes GH₵ {payout.bonusAmount.toFixed(2)} batch bonus)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <History className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">No Past Deliveries Found</h4>
                <p className="text-slate-500 text-xs">Completed delivery trips will be recorded here for your review.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
