import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, ShoppingBag, Users, RefreshCw, Package, TrendingUp, ArrowUpRight, Inbox, Ghost } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  guestOrders: number;
  activeSubscriptions: number;
  totalStudents: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

interface PopularBundle {
  bundleId: string;
  bundleName: string;
  count: number;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  bundle_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_date?: string;
  notes?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    guestOrders: 0,
    activeSubscriptions: 0,
    totalStudents: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [popularBundles, setPopularBundles] = useState<PopularBundle[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Set up realtime subscription for orders
    const ordersSubscription = supabase
      .channel('dashboard_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_orders' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [
        totalOrdersRes,
        ordersDataRes,
        guestOrdersRes,
        subscriptionsRes,
        studentsRes,
        bundleOrdersRes,
        recentOrdersRes,
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount, status, created_at'),
        supabase.from('guest_orders').select('id', { count: 'exact', head: true }),
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select('bundle_id, quantity, bundles(name)', { head: false })
          .not('bundle_id', 'is', null),
        supabase
          .from('orders')
          .select(
            `id, total_amount, status, created_at, delivery_date, notes,
             bundles(name),
             profiles!orders_student_id_fkey(full_name)`,
            { head: false }
          )
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Calculate total revenue (only delivered orders)
      const deliveredOrders = (ordersDataRes.data || []).filter(
        (order) => order.status === 'delivered'
      );
      const totalRevenue = deliveredOrders.reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

      // Process monthly revenue (last 6 months)
      const monthlyRevenueMap = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenueMap.set(monthKey, 0);
      }

      (ordersDataRes.data || []).forEach((order) => {
        if (order.status === 'delivered' && order.created_at) {
          const date = new Date(order.created_at);
          const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          const current = monthlyRevenueMap.get(monthKey) || 0;
          monthlyRevenueMap.set(monthKey, current + Number(order.total_amount || 0));
        }
      });

      const monthlyRevenueArray = Array.from(monthlyRevenueMap.entries()).map(
        ([month, revenue]) => ({
          month,
          revenue,
        })
      );

      // Process order statuses
      const statusMap = new Map<string, number>();
      (ordersDataRes.data || []).forEach((order) => {
        const status = order.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const orderStatusesArray = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Process popular bundles
      const bundleMap = new Map<string, { name: string; count: number }>();
      (bundleOrdersRes.data || []).forEach((order: any) => {
        const bundleId = order.bundle_id;
        const bundleName = order.bundles?.name || 'Unknown Bundle';
        const quantity = order.quantity || 1;
        const current = bundleMap.get(bundleId);
        if (current) {
          bundleMap.set(bundleId, { name: bundleName, count: current.count + quantity });
        } else {
          bundleMap.set(bundleId, { name: bundleName, count: quantity });
        }
      });

      const popularBundlesArray = Array.from(bundleMap.entries())
        .map(([bundleId, data]) => ({
          bundleId,
          bundleName: data.name,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Process recent orders
      const recentOrdersArray = (recentOrdersRes.data || []).map((order: any) => ({
        id: order.id,
        customer_name: order.profiles?.full_name || 'Guest',
        bundle_name: order.bundles?.name || 'Unknown',
        total_amount: Number(order.total_amount || 0),
        status: order.status || 'unknown',
        created_at: order.created_at || '',
        delivery_date: order.delivery_date,
        notes: order.notes,
      }));

      setStats({
        totalRevenue,
        totalOrders: totalOrdersRes.count || 0,
        guestOrders: guestOrdersRes.count || 0,
        activeSubscriptions: subscriptionsRes.count || 0,
        totalStudents: studentsRes.count || 0,
      });

      setMonthlyRevenue(monthlyRevenueArray);
      setOrderStatuses(orderStatusesArray);
      setPopularBundles(popularBundlesArray);
      setRecentOrders(recentOrdersArray);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Get max values for chart scaling
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  const maxStatusCount = Math.max(...orderStatuses.map((s) => s.count), 1);
  const maxBundleCount = Math.max(...popularBundles.map((b) => b.count), 1);

  const statCards = [
    {
      title: 'Revenue',
      value: `GH₵ ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      change: '+12.5%',
    },
    {
      title: 'Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      change: '+8.2%',
    },
    {
      title: 'Guests',
      value: stats.guestOrders,
      icon: Users,
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
      change: '+5.1%',
    },
    {
      title: 'Subscriptions',
      value: stats.activeSubscriptions,
      icon: RefreshCw,
      iconBg: 'bg-gradient-to-br from-teal-400 to-teal-600',
      change: '+3.8%',
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: Package,
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
      change: '+6.9%',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusBarColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-400',
      confirmed: 'bg-blue-400',
      preparing: 'bg-orange-400',
      ready: 'bg-teal-400',
      delivered: 'bg-green-400',
      cancelled: 'bg-red-400',
    };
    return colors[status] || 'bg-slate-400';
  };

  const getStatusBarHex = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#fbbf24',
      confirmed: '#60a5fa',
      preparing: '#fb923c',
      ready: '#2dd4bf',
      delivered: '#4ade80',
      cancelled: '#f87171',
    };
    return colors[status] || '#cbd5e1';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header section with Refresh Button */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">Welcome to your dashboard summary</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            loadDashboardData();
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-200 shadow-sm group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Refresh Data
        </button>
      </div>

      {/* Stat Cards - 5 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-500 text-sm font-medium mb-2">{card.title}</p>
                  <p className="text-3xl font-bold font-display text-slate-900 mb-3 tracking-tight">{card.value}</p>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                    <ArrowUpRight className="w-3 h-3" />
                    {card.change} vs last month
                  </div>
                </div>
                <div className={`${card.iconBg} rounded-xl p-3 flex-shrink-0 shadow-lg shadow-${card.iconBg.split(' ')[1].split('-')[1]}-500/30`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '500ms' }}>
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 font-display">Monthly Revenue</h2>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          {maxMonthlyRevenue <= 1 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4">
              <Inbox className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No revenue data yet</p>
              <p className="text-slate-400 text-sm text-center px-4 mt-1">Orders that have been delivered will appear here.</p>
            </div>
          ) : (
            <div className="h-64 mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `GH₵${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-slate-900 font-display mb-6">Order Status Breakdown</h2>
          {orderStatuses.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4">
              <Ghost className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No active orders</p>
            </div>
          ) : (
            <div className="flex flex-col h-64">
              <div className="flex-1 -mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatuses}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {orderStatuses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusBarHex(entry.status)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [value, props.payload.status.charAt(0).toUpperCase() + props.payload.status.slice(1)]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {orderStatuses.slice(0, 4).map((status) => (
                  <div key={status.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusBarHex(status.status) }} />
                      <span className="text-slate-600 capitalize">{status.status}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popular Bundles - Full Width */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in-up opacity-0" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 font-display">Popular Bundles</h2>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        {popularBundles.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4">
            <p className="text-slate-500 font-medium text-sm">No bundle orders yet</p>
          </div>
        ) : (
          <div className="space-y-5">
            {popularBundles.map((bundle, index) => {
              const percentage = (bundle.count / maxBundleCount) * 100;
              const isEmerald = index % 2 === 0;
              return (
                <div key={bundle.bundleId} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{bundle.bundleName}</span>
                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{bundle.count} orders</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${isEmerald ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-slate-400 to-slate-500'} h-full rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '700ms' }}>
        <div className="px-8 py-6 border-b border-slate-200/60 bg-white">
          <h2 className="text-lg font-bold text-slate-900 font-display">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Customer</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Bundle</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Status</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Delivery / Date</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/80 transition-colors group bg-white"
                  >
                    <td className="px-8 py-4 text-sm font-semibold text-slate-900">
                      {order.customer_name}
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-600">
                      {order.bundle_name}
                      {order.notes?.includes('[SEMESTER SUBSCRIPTION') && (
                        <span className="block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wider w-max">
                          {order.notes.match(/\[SEMESTER SUBSCRIPTION:\s*([^\]]+)\]/) 
                            ? order.notes.match(/\[SEMESTER SUBSCRIPTION:\s*([^\]]+)\]/)?.[1]
                            : 'Semester Sub'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-900">
                      {Number(order.total_amount) === 0 && order.notes?.includes('[SEMESTER SUBSCRIPTION') ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md uppercase tracking-wide">Pre-paid</span>
                      ) : (
                        `GH₵${order.total_amount.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      {order.delivery_date ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">{formatDate(order.delivery_date)}</p>
                          <p className="text-[10px] text-slate-500 uppercase mt-0.5">Ordered: {formatDate(order.created_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">{formatDate(order.created_at)}</p>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm">
                      <a
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all font-semibold text-xs shadow-sm"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <Inbox className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No recent orders found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
