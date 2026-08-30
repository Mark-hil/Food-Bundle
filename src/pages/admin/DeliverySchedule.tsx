import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Truck, 
  MapPin, 
  Phone, 
  DollarSign, 
  Users, 
  Search, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink,
  CheckCheck
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
import { useNavigate } from '../../lib/navigation';

interface DriverStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  completedDeliveries: number;
  activeDeliveries: number;
  totalEarnings: number;
  totalOrderValue: number;
}

export default function DeliverySchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'dispatch'>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [deliveryFeeRate, setDeliveryFeeRate] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'out_for_delivery' | 'delivered'>('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reassigningOrder, setReassigningOrder] = useState<string | null>(null);
  const [reassignTargetDriver, setReassignTargetDriver] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDeliveryData();

    // Set up Supabase Realtime channel for live dispatch updates
    const channel = supabase
      .channel('admin-delivery-fleet-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDeliveryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeliveryData = async () => {
    try {
      setLoading(true);

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
      } catch (e) {
        // Fallback default
      }

      // 2. Fetch all drivers from profiles
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .eq('role', 'driver')
        .order('full_name', { ascending: true });

      if (driversError) throw driversError;
      setDrivers(driversData || []);

      // 3. Fetch all orders with driver and student profiles
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone, email, student_id),
          driver:profiles!orders_driver_id_fkey (id, full_name, phone, email)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (err: any) {
      console.error('Error fetching fleet data:', err);
      setError(err.message || 'Failed to load delivery fleet data');
    } finally {
      setLoading(false);
    }
  };

  // Compute Driver Performance Leaderboard
  const driverPerformanceList: DriverStats[] = useMemo(() => {
    return drivers.map(d => {
      const driverOrders = orders.filter(o => o.driver_id === d.id);
      const completed = driverOrders.filter(o => o.status === 'delivered');
      const active = driverOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'ready');
      const orderValue = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      return {
        id: d.id,
        name: d.full_name || d.email || 'Driver',
        email: d.email || '',
        phone: d.phone || '',
        completedDeliveries: completed.length,
        activeDeliveries: active.length,
        totalEarnings: completed.length * deliveryFeeRate,
        totalOrderValue: orderValue,
      };
    }).sort((a, b) => b.completedDeliveries - a.completedDeliveries);
  }, [drivers, orders, deliveryFeeRate]);

  // General Fleet Metrics
  const totalDeliveredOrders = useMemo(() => orders.filter(o => o.status === 'delivered'), [orders]);
  const activeInTransit = useMemo(() => orders.filter(o => o.status === 'out_for_delivery'), [orders]);
  const readyForPickup = useMemo(() => orders.filter(o => o.status === 'ready'), [orders]);
  const totalDriverPayouts = totalDeliveredOrders.length * deliveryFeeRate;

  // 7-day trend chart
  const weeklyChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayDeliveries = totalDeliveredOrders.filter(o => new Date(o.updated_at || o.created_at).toDateString() === dateStr);
      days.push({
        day: dayName,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deliveries: dayDeliveries.length,
        payout: dayDeliveries.length * deliveryFeeRate,
      });
    }
    return days;
  }, [totalDeliveredOrders, deliveryFeeRate]);

  // Filtered orders for dispatch tab
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Driver filter
      if (selectedDriverFilter !== 'all') {
        if (selectedDriverFilter === 'unassigned' && o.driver_id !== null) return false;
        if (selectedDriverFilter !== 'unassigned' && o.driver_id !== selectedDriverFilter) return false;
      }

      // Date filter
      if (selectedDate) {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        if (orderDate !== selectedDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentName = o.profiles?.full_name?.toLowerCase() || '';
        const studentId = o.profiles?.student_id?.toLowerCase() || '';
        const driverName = o.driver?.full_name?.toLowerCase() || '';
        const address = o.delivery_address?.toLowerCase() || '';
        const bundleName = o.bundles?.name?.toLowerCase() || '';
        const orderId = o.id.toLowerCase();

        return (
          orderId.includes(q) ||
          studentName.includes(q) ||
          studentId.includes(q) ||
          driverName.includes(q) ||
          address.includes(q) ||
          bundleName.includes(q)
        );
      }

      return true;
    });
  }, [orders, statusFilter, selectedDriverFilter, selectedDate, searchQuery]);

  const handleAssignDriver = async (orderId: string, driverId: string | null) => {
    try {
      setActionLoading(true);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ driver_id: driverId })
        .eq('id', orderId);

      if (updateError) throw updateError;

      setReassigningOrder(null);
      setReassignTargetDriver('');
      await fetchDeliveryData();
    } catch (err: any) {
      alert(`Failed to assign driver: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <Truck className="w-4 h-4" /> Logistics & Fleet Management
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Driver Operations & Delivery Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time deliveries, track driver earnings, and manage fleet performance.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Fleet Analytics
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'drivers'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Driver Earnings ({drivers.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dispatch'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗺️ Live Dispatch
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Trips</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            {totalDeliveredOrders.length}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">100% PIN Verified</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Driver Payouts</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 tracking-tight font-display">
            GH₵ {totalDriverPayouts.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">@ GH₵ {deliveryFeeRate.toFixed(2)} / trip</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Transit</span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-orange-600 tracking-tight font-display">
            {activeInTransit.length}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">{readyForPickup.length} waiting for pickup</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Drivers</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 tracking-tight font-display">
            {drivers.length}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">Registered delivery fleet</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium mt-4">Loading fleet operations...</p>
        </div>
      ) : activeTab === 'overview' ? (
        /* =========================================================================
           TAB 1: FLEET ANALYTICS & OVERVIEW
           ========================================================================= */
        <div className="space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Volume Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Weekly Delivery Volume</h3>
                  <p className="text-xs text-slate-500">Deliveries fulfilled across the past 7 days</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                  {weeklyChartData.reduce((sum, d) => sum + d.deliveries, 0)} Deliveries
                </span>
              </div>

              <div className="h-64 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyChartData}>
                    <defs>
                      <linearGradient id="fleetDeliveryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} Deliveries`, 'Fulfilled']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="deliveries" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#fleetDeliveryGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Driver Payouts Chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Driver Payout Distribution</h3>
                  <p className="text-xs text-slate-500">Daily earnings accrued by delivery drivers (GH₵)</p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                  GH₵ {weeklyChartData.reduce((sum, d) => sum + d.payout, 0).toFixed(2)}
                </span>
              </div>

              <div className="h-64 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₵${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`GH₵ ${Number(val || 0).toFixed(2)}`, 'Payouts']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="payout" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Drivers Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Driver Leaderboard & Performance</h3>
                <p className="text-xs text-slate-500">Trips completed and total payouts per driver</p>
              </div>
              <button
                onClick={() => setActiveTab('drivers')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View Full Profiles <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-6">Rank & Driver</th>
                    <th className="py-3 px-6">Phone / Contact</th>
                    <th className="py-3 px-6 text-center">Completed Trips</th>
                    <th className="py-3 px-6 text-center">Active Now</th>
                    <th className="py-3 px-6 text-right">Earned Payout</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driverPerformanceList.map((driver, index) => (
                    <tr key={driver.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            index === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-amber-50 text-amber-800' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{driver.name}</p>
                            <p className="text-xs text-slate-400">{driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {driver.phone ? (
                          <a href={`tel:${driver.phone}`} className="text-slate-600 hover:text-emerald-600 flex items-center gap-1 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {driver.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">No phone</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCheck className="w-3.5 h-3.5" /> {driver.completedDeliveries} Trips
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {driver.activeDeliveries > 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
                            <Truck className="w-3.5 h-3.5" /> {driver.activeDeliveries} In-Flight
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">Idle</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-extrabold text-slate-900 font-display text-base">
                          GH₵ {driver.totalEarnings.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedDriverFilter(driver.id);
                            setActiveTab('dispatch');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))}
                  {driverPerformanceList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        No registered drivers found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'drivers' ? (
        /* =========================================================================
           TAB 2: DRIVERS DETAILED CARDS & EARNINGS
           ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {driverPerformanceList.map((driver) => (
            <div key={driver.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-lg transition space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{driver.name}</h3>
                    <p className="text-xs text-slate-400 truncate max-w-[150px]">{driver.email}</p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                  Active Driver
                </span>
              </div>

              {/* Earnings & Trips Snapshot */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Payout</p>
                  <p className="text-xl font-extrabold text-emerald-600 font-display mt-0.5">
                    GH₵ {driver.totalEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Trips Completed</p>
                  <p className="text-xl font-extrabold text-slate-900 font-display mt-0.5">
                    {driver.completedDeliveries}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Phone Contact:</span>
                  <span className="font-medium text-slate-900">{driver.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Active In-Route:</span>
                  <span className={`font-bold ${driver.activeDeliveries > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                    {driver.activeDeliveries} Packages
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Meal Volume Delivered:</span>
                  <span className="font-semibold text-slate-900">GH₵ {driver.totalOrderValue.toFixed(0)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDriverFilter(driver.id);
                  setActiveTab('dispatch');
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>View Assigned Orders</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
          {driverPerformanceList.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900">No Drivers Found</h3>
              <p className="text-xs text-slate-500 mt-1">Assign the 'driver' role to users under the Users tab.</p>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           TAB 3: LIVE DISPATCH & ORDER MANAGEMENT
           ========================================================================= */
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, ID, address..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {/* Driver Filter */}
              <div>
                <select
                  value={selectedDriverFilter}
                  onChange={(e) => setSelectedDriverFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                >
                  <option value="all">All Drivers</option>
                  <option value="unassigned">Unassigned (No Driver)</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dispatch Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Showing {filteredOrders.length} Dispatch Orders
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-5">Order & Package</th>
                    <th className="py-3 px-5">Student / Customer</th>
                    <th className="py-3 px-5">Destination</th>
                    <th className="py-3 px-5">Assigned Driver</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-5">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                          #{order.id.slice(0, 8)}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">{order.bundles?.name || 'Meal Package'}</p>
                        <span className="text-xs text-slate-400">
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-900">{order.profiles?.full_name || order.full_name || 'Customer'}</p>
                        {order.profiles?.student_id && (
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            ID: {order.profiles.student_id}
                          </span>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{order.delivery_phone || order.profiles?.phone || 'No phone'}</p>
                      </td>

                      <td className="py-4 px-5 max-w-xs">
                        <p className="text-xs text-slate-700 truncate flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{order.delivery_address}</span>
                        </p>
                      </td>

                      <td className="py-4 px-5">
                        {reassigningOrder === order.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={reassignTargetDriver}
                              onChange={(e) => setReassignTargetDriver(e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                            >
                              <option value="">Unassign</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignDriver(order.id, reassignTargetDriver || null)}
                              disabled={actionLoading}
                              className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setReassigningOrder(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : order.driver ? (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-blue-500" />
                                {order.driver.full_name || 'Assigned Driver'}
                              </p>
                              <p className="text-[11px] text-slate-400">{order.driver.phone || ''}</p>
                            </div>
                            <button
                              onClick={() => {
                                setReassigningOrder(order.id);
                                setReassignTargetDriver(order.driver_id || '');
                              }}
                              className="text-[10px] text-slate-400 hover:text-blue-600 underline"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReassigningOrder(order.id);
                              setReassignTargetDriver('');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
                          >
                            + Assign Driver
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          order.status === 'out_for_delivery' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          order.status === 'ready' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {order.status === 'delivered' ? '✓ Delivered' :
                           order.status === 'out_for_delivery' ? '🚗 In Transit' :
                           order.status === 'ready' ? '✨ Ready' : order.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                        No orders match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
