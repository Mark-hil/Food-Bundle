import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  RefreshCw, 
  Package, 
  TrendingUp, 
  Truck, 
  CheckCheck, 
  ChevronRight, 
  Activity, 
  Flame, 
  Radio, 
  ChefHat, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  Zap,
  PackageCheck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { useNavigate } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface LiveEvent {
  id: string;
  type: 'order_created' | 'order_updated' | 'driver_claimed' | 'delivered';
  title: string;
  description: string;
  time: string;
  badgeColor: string;
}

interface DriverStat {
  id: string;
  name: string;
  trips: number;
  earnings: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Time-horizon filter
  const [timeHorizon, setTimeHorizon] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  // Core Data State
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0);
  const [deliveryFeeRate, setDeliveryFeeRate] = useState(10);
  const [driverPayoutPercent, setDriverPayoutPercent] = useState(90);
  const [driverBatchBonus, setDriverBatchBonus] = useState(5);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  // Live Realtime Event Feed
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    loadDashboardData();

    // Event-Driven Supabase Realtime Channel
    const realtimeChannel = supabase
      .channel('admin-dashboard-live-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          handleIncomingRealtimeEvent('orders', payload);
          loadDashboardData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_orders' },
        (payload: any) => {
          handleIncomingRealtimeEvent('guest_orders', payload);
          loadDashboardData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload: any) => {
          handleIncomingRealtimeEvent('profiles', payload);
          loadDashboardData(false);
        }
      )
      .subscribe();

    // Interval to refresh last-synced display
    const syncInterval = setInterval(() => {
      setLastSynced(new Date());
    }, 60000);

    return () => {
      supabase.removeChannel(realtimeChannel);
      clearInterval(syncInterval);
    };
  }, []);

  const handleIncomingRealtimeEvent = (table: string, payload: any) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let newEvent: LiveEvent | null = null;

    if (table === 'orders' || table === 'guest_orders') {
      const record = payload.new || payload.old;
      const orderShortId = record?.id ? `#${record.id.slice(0, 6).toUpperCase()}` : 'Order';
      
      if (payload.eventType === 'INSERT') {
        newEvent = {
          id: `evt-${Date.now()}-${Math.random()}`,
          type: 'order_created',
          title: `New Order Placed ${orderShortId}`,
          description: `Total: GH₵ ${Number(record.total_amount || 0).toFixed(2)} (${record.status})`,
          time: timestamp,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      } else if (payload.eventType === 'UPDATE') {
        if (record.status === 'delivered') {
          newEvent = {
            id: `evt-${Date.now()}-${Math.random()}`,
            type: 'delivered',
            title: `Order Delivered ${orderShortId}`,
            description: `Successfully verified by driver with student PIN`,
            time: timestamp,
            badgeColor: 'bg-green-50 text-green-700 border-green-200',
          };
        } else if (record.status === 'out_for_delivery') {
          newEvent = {
            id: `evt-${Date.now()}-${Math.random()}`,
            type: 'driver_claimed',
            title: `Out for Delivery ${orderShortId}`,
            description: `Driver is currently in transit with package`,
            time: timestamp,
            badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
          };
        } else {
          newEvent = {
            id: `evt-${Date.now()}-${Math.random()}`,
            type: 'order_updated',
            title: `Order Updated ${orderShortId}`,
            description: `Status changed to ${record.status?.toUpperCase()}`,
            time: timestamp,
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          };
        }
      }
    }

    if (newEvent) {
      setLiveEvents(prev => [newEvent!, ...prev.slice(0, 9)]);
    }
  };

  const loadDashboardData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setIsSyncing(true);

      // 1. Fetch system delivery fee setting
      try {
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'delivery_fee')
          .maybeSingle();
        if (settingsData?.value) {
          const fee = Number(settingsData.value);
          if (!isNaN(fee) && fee > 0) setDeliveryFeeRate(fee);
        }
      } catch (e) {}

      // 2. Fetch all datasets in parallel
      const [
        ordersRes,
        guestOrdersRes,
        profilesRes,
        subscriptionsRes,
        settingsRes
      ] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            delivery_date,
            notes,
            bundle_id,
            quantity,
            driver_id,
            student_id,
            delivery_address,
            delivery_phone,
            pickup_pin,
            bundles (name, image_url, price),
            profiles!orders_student_id_fkey (full_name, email, phone, student_id),
            driver:profiles!orders_driver_id_fkey (full_name, email, phone)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('guest_orders')
          .select(`
            id,
            total_amount,
            status,
            payment_status,
            delivery_fee,
            created_at,
            delivery_date,
            notes,
            bundle_id,
            quantity,
            full_name,
            phone,
            delivery_address,
            bundles (name, image_url, price)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, phone, role, student_id, created_at'),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('system_settings').select('*').eq('id', 1).maybeSingle(),
      ]);

      if (ordersRes.error) throw ordersRes.error;

      // Combine orders and guest orders
      const combinedOrders = [...(ordersRes.data || []), ...(guestOrdersRes.data || [])];
      combinedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(combinedOrders);
      setProfiles(profilesRes.data || []);
      setActiveSubscriptionsCount(subscriptionsRes.count || 0);

      // Load settings
      if (settingsRes?.data) {
        if (settingsRes.data.delivery_charge && !isNaN(Number(settingsRes.data.delivery_charge))) {
          setDeliveryFeeRate(Number(settingsRes.data.delivery_charge));
        }
        if (settingsRes.data.driver_payout_percent && !isNaN(Number(settingsRes.data.driver_payout_percent))) {
          setDriverPayoutPercent(Number(settingsRes.data.driver_payout_percent));
        }
        if (settingsRes.data.driver_batch_bonus && !isNaN(Number(settingsRes.data.driver_batch_bonus))) {
          setDriverBatchBonus(Number(settingsRes.data.driver_batch_bonus));
        }
      }

      setLastSynced(new Date());

    } catch (err: any) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // Filter orders based on active timeHorizon
  const filteredOrdersByHorizon = useMemo(() => {
    const now = new Date();
    if (timeHorizon === 'all') return orders;

    let cutoffDate = new Date();
    if (timeHorizon === 'today') {
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (timeHorizon === '7d') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeHorizon === '30d') {
      cutoffDate.setDate(now.getDate() - 30);
    }

    return orders.filter(o => new Date(o.created_at) >= cutoffDate);
  }, [orders, timeHorizon]);

  // Key KPI Metrics Calculations
  const metrics = useMemo(() => {
    const paidOrders = filteredOrdersByHorizon.filter(o => 
      o.status !== 'cancelled' && 
      (o.status !== 'pending' || o.payment_status === 'success')
    );
    const totalRev = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const inKitchen = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    const inTransit = orders.filter(o => o.status === 'out_for_delivery');
    const totalDeliveredTrips = orders.filter(o => o.status === 'delivered');

    // Calculate Driver Payouts with Base Payout Share + Batch Bonuses
    let totalDriverPayouts = 0;
    const batchGroups = new Map<string, any[]>();
    totalDeliveredTrips.forEach(o => {
      const dStr = new Date(o.created_at).toDateString();
      const addr = (o.delivery_address || '').toLowerCase().trim();
      const key = `${dStr}_${addr}`;
      const list = batchGroups.get(key) || [];
      list.push(o);
      batchGroups.set(key, list);
    });

    batchGroups.forEach(list => {
      list.forEach((ord, idx) => {
        const base = (Number(ord.delivery_fee) || deliveryFeeRate) * (driverPayoutPercent / 100);
        const bonus = idx > 0 ? driverBatchBonus : 0;
        totalDriverPayouts += base + bonus;
      });
    });

    const avgOrderValue = paidOrders.length > 0 ? totalRev / paidOrders.length : 0;
    const fulfillmentRate = orders.length > 0 ? (totalDeliveredTrips.length / orders.length) * 100 : 100;

    return {
      grossRevenue: totalRev,
      totalOrdersCount: filteredOrdersByHorizon.length,
      kitchenActiveCount: inKitchen.length,
      inTransitCount: inTransit.length,
      driverTripsCount: totalDeliveredTrips.length,
      driverPayoutsTotal: totalDriverPayouts,
      studentsCount: profiles.filter(p => p.role === 'student' || !p.role).length,
      driversCount: profiles.filter(p => p.role === 'driver').length,
      avgOrderValue,
      fulfillmentRate,
    };
  }, [filteredOrdersByHorizon, orders, profiles, deliveryFeeRate, driverPayoutPercent, driverBatchBonus]);

  // Trend Chart Data (Last 7 or 14 Days)
  const trendChartData = useMemo(() => {
    const daysCount = timeHorizon === '30d' ? 30 : 7;
    const dataPoints = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: daysCount > 7 ? 'numeric' : undefined, day: 'numeric' });
      
      const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dateStr);
      const dayPaid = dayOrders.filter(o => o.status !== 'cancelled' && (o.status !== 'pending' || o.payment_status === 'success'));
      const dayRevenue = dayPaid.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      dataPoints.push({
        day: dayLabel,
        revenue: dayRevenue,
        orders: dayOrders.length,
        delivered: dayOrders.filter(o => o.status === 'delivered').length,
      });
    }

    return dataPoints;
  }, [orders, timeHorizon]);

  // Order Lifecycle Status Breakdown
  const orderStatusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(o => {
      const st = o.status || 'pending';
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });

    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: '#f59e0b' },
      confirmed: { label: 'Confirmed', color: '#3b82f6' },
      preparing: { label: 'Preparing', color: '#f97316' },
      ready: { label: 'Ready', color: '#14b8a6' },
      out_for_delivery: { label: 'In Transit', color: '#8b5cf6' },
      delivered: { label: 'Delivered', color: '#10b981' },
      cancelled: { label: 'Cancelled', color: '#ef4444' },
    };

    return Object.entries(counts)
      .map(([key, count]) => ({
        status: key,
        label: statusConfig[key]?.label || key,
        count,
        color: statusConfig[key]?.color || '#94a3b8',
      }))
      .filter(item => item.count > 0);
  }, [orders]);

  // Top Selling Bundles
  const popularBundlesRanked = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    
    const paidAll = orders.filter(o => o.status !== 'cancelled' && (o.status !== 'pending' || o.payment_status === 'success'));
    paidAll.forEach(o => {
      const name = o.bundles?.name || (o as any).bundle?.name || 'Meal Package';
      const qty = o.quantity || 1;
      const amt = Number(o.total_amount || 0);
      const curr = map.get(name) || { name, count: 0, revenue: 0 };
      map.set(name, {
        name,
        count: curr.count + qty,
        revenue: curr.revenue + amt,
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    const maxCount = Math.max(...sorted.map(s => s.count), 1);

    return sorted.map(s => ({
      ...s,
      percentage: (s.count / maxCount) * 100,
    }));
  }, [orders]);

  // Driver Performance Leaderboard
  const topDriversLeaderboard: DriverStat[] = useMemo(() => {
    const drivers = profiles.filter(p => p.role === 'driver');
    const driverOrdersMap = new Map<string, any[]>();

    orders.filter(o => o.status === 'delivered' && o.driver_id).forEach(o => {
      const list = driverOrdersMap.get(o.driver_id) || [];
      list.push(o);
      driverOrdersMap.set(o.driver_id, list);
    });

    return drivers.map(d => {
      const driverDelivered = driverOrdersMap.get(d.id) || [];
      const trips = driverDelivered.length;

      // Group by date and address for batch bonus calculation
      const batchGroups = new Map<string, any[]>();
      driverDelivered.forEach(o => {
        const dStr = new Date(o.created_at).toDateString();
        const addr = (o.delivery_address || '').toLowerCase().trim();
        const key = `${dStr}_${addr}`;
        const list = batchGroups.get(key) || [];
        list.push(o);
        batchGroups.set(key, list);
      });

      let totalEarned = 0;
      batchGroups.forEach(list => {
        list.forEach((ord, idx) => {
          const base = (Number(ord.delivery_fee) || deliveryFeeRate) * (driverPayoutPercent / 100);
          const bonus = idx > 0 ? driverBatchBonus : 0;
          totalEarned += base + bonus;
        });
      });

      return {
        id: d.id,
        name: d.full_name || d.email || 'Driver',
        trips,
        earnings: totalEarned,
      };
    }).sort((a, b) => b.trips - a.trips).slice(0, 4);
  }, [profiles, orders, deliveryFeeRate, driverPayoutPercent, driverBatchBonus]);

  // Recent Live Orders (Top 8)
  const recentOrdersList = useMemo(() => {
    return orders.slice(0, 8);
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case 'out_for_delivery':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><Truck className="w-3 h-3" /> In Transit</span>;
      case 'ready':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Ready</span>;
      case 'preparing':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><ChefHat className="w-3 h-3" /> Cooking</span>;
      case 'confirmed':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Confirmed</span>;
      case 'cancelled':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Connecting to live operations stream...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-transparent min-h-screen font-sans max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* =========================================================================
          HERO OPERATIONS COMMAND BANNER
          ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
        {/* Glow backdrop decorative bubbles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            {/* Live Operations Pulse Indicator */}
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" /> Live Event Stream Active
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Synced at {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight font-display text-white">
              Food Bundle Command Center
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Welcome back, <span className="font-semibold text-emerald-300">{profile?.full_name || 'Admin'}</span>. Real-time fulfillment, kitchen checklists, and fleet dispatch intelligence.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/admin/orders')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/15 backdrop-blur-md flex items-center gap-2 shadow-sm active:scale-95"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Kitchen Orders</span>
            </button>
            <button
              onClick={() => navigate('/admin/delivery')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/15 backdrop-blur-md flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Fleet Dispatch</span>
            </button>
            <button
              onClick={() => {
                loadDashboardData();
              }}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Realtime</span>
            </button>
          </div>
        </div>

        {/* Command Center Quick Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div>
            <span className="text-xs text-slate-400 font-medium">In Kitchen Pipeline</span>
            <p className="text-2xl font-extrabold text-amber-400 mt-0.5 font-display flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              {metrics.kitchenActiveCount} Meals
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Active In Transit</span>
            <p className="text-2xl font-extrabold text-blue-400 mt-0.5 font-display flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400" />
              {metrics.inTransitCount} Trips
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Driver Pool</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5 font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {metrics.driversCount} Drivers
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Fulfillment Rate</span>
            <p className="text-2xl font-extrabold text-purple-300 mt-0.5 font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              {metrics.fulfillmentRate.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PERIOD SELECTOR & METRICS GRID
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
            Operational Highlights
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Performance analytics across your selected time window</p>
        </div>

        {/* Time Horizon Switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setTimeHorizon('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeHorizon === 'today' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeHorizon('7d')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeHorizon === '7d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeHorizon('30d')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeHorizon === '30d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeHorizon('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeHorizon === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 6 High-Impact Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-display">
            GH₵ {metrics.grossRevenue.toFixed(0)}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> Delivered volume
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-display">
            {metrics.totalOrdersCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Avg: GH₵ {metrics.avgOrderValue.toFixed(0)} / order
          </p>
        </div>

        {/* In Kitchen */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Kitchen</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-orange-600 font-display">
            {metrics.kitchenActiveCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Preparing & packaging
          </p>
        </div>

        {/* Driver Trips */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Driver Payouts</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 font-display">
            GH₵ {metrics.driverPayoutsTotal.toFixed(0)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {metrics.driverTripsCount} verified trips
          </p>
        </div>

        {/* Subscriptions */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Subs</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-teal-600 font-display">
            {activeSubscriptionsCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Recurring meal plans
          </p>
        </div>

        {/* Students / Users */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student Base</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-600 font-display">
            {metrics.studentsCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Registered customers
          </p>
        </div>
      </div>

      {/* =========================================================================
          CHARTS SECTION: REVENUE VELOCITY + ORDER LIFECYCLE DONUT
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue / Orders Trend Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Fulfillment & Revenue Velocity</h3>
              <p className="text-xs text-slate-500">Daily financial and volume trends</p>
            </div>

            {/* Metric Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Revenue (GH₵)
              </button>
              <button
                onClick={() => setChartMetric('orders')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Orders Count
              </button>
            </div>
          </div>

          <div className="h-72 w-full -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="adminOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => chartMetric === 'revenue' ? `₵${val}` : `${val}`}
                />
                <Tooltip 
                  formatter={(val: any) => [
                    chartMetric === 'revenue' ? `GH₵ ${Number(val || 0).toFixed(2)}` : `${val} Orders`,
                    chartMetric === 'revenue' ? 'Revenue' : 'Volume'
                  ]}
                  contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                {chartMetric === 'revenue' ? (
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#adminRevGrad)" />
                ) : (
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#adminOrdersGrad)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Lifecycle Donut Breakdown (1 Column) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Order Lifecycle</h3>
              <p className="text-xs text-slate-500">Live distribution by status</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {orders.length} Total
            </span>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {orderStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, _name: any, props: any) => [
                    `${val} orders`,
                    props?.payload?.label || 'Status'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-slate-900 font-display leading-none">{orders.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Orders</span>
            </div>
          </div>

          {/* Legend Chips Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            {orderStatusBreakdown.slice(0, 6).map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.label}</span>
                </div>
                <span className="font-bold text-slate-900 pl-1">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          POPULAR BUNDLES & DRIVER LEADERBOARD
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Bundles */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Top Selling Bundles</h3>
              <p className="text-xs text-slate-500">Most requested food packages</p>
            </div>
            <button
              onClick={() => navigate('/admin/bundles')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage Bundles <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {popularBundlesRanked.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Package className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs text-slate-400 font-medium">No bundle sales recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {popularBundlesRanked.map((bundle, index) => (
                <div key={bundle.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{bundle.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">GH₵ {bundle.revenue.toFixed(0)}</span>
                      <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">{bundle.count} sold</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        index === 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                        index === 1 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                        'bg-gradient-to-r from-purple-400 to-pink-500'
                      }`}
                      style={{ width: `${bundle.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Delivery Drivers Leaderboard */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Fleet Drivers Leaderboard</h3>
              <p className="text-xs text-slate-500">Verified deliveries and earnings accrued</p>
            </div>
            <button
              onClick={() => navigate('/admin/delivery')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Fleet Hub <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {topDriversLeaderboard.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Truck className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs text-slate-400 font-medium">No completed driver deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topDriversLeaderboard.map((driver, index) => (
                <div key={driver.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      index === 0 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{driver.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-500" /> {driver.trips} verified deliveries
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-emerald-600 font-display text-sm">
                      GH₵ {driver.earnings.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">Earned Payout</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          RECENT ORDERS TABLE + LIVE REALTIME EVENT STREAM
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Orders</h3>
              <p className="text-xs text-slate-500">Live order activity across campus</p>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="py-3 px-5">Customer & ID</th>
                  <th className="py-3 px-5">Bundle</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrdersList.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900 text-xs">
                        {order.profiles?.full_name || order.full_name || 'Customer'}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {order.profiles?.student_id ? `ID: ${order.profiles.student_id}` : `#${order.id.slice(0, 6)}`}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <p className="text-xs font-medium text-slate-700">{order.bundles?.name || 'Package'}</p>
                      {order.notes?.includes('[SEMESTER SUBSCRIPTION') && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-bold rounded uppercase">
                          Semester Sub
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 font-bold text-slate-900 text-xs font-display">
                      GH₵ {Number(order.total_amount || 0).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      {getStatusBadge(order.status)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Checklist</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {recentOrdersList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      No recent orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Live Activity Feed (1 Column) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-base">Live Activity Feed</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Real-time
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Live updates stream directly from kitchen & drivers</p>

            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
              {liveEvents.length > 0 ? (
                liveEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${evt.badgeColor}`}>
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{evt.time}</span>
                    </div>
                    <p className="text-xs text-slate-600">{evt.description}</p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <Radio className="w-6 h-6 text-slate-300 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs text-slate-400">Listening for live order events...</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>WebSocket Channel Active</span>
            <span className="font-mono text-emerald-600 font-bold">100% Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
