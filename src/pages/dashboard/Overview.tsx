import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingCart, Clock, AlertCircle, Package, ArrowRight, Ghost } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from '../../lib/navigation';

interface RecentOrder {
  id: string;
  bundle_name: string;
  status: string;
  created_at: string;
  total_amount: number;
}

export default function Overview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeSubscriptions: 0,
    pendingDeliveries: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [ordersRes, subsRes, pendingRes, recentRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('student_id', user?.id),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('student_id', user?.id).eq('status', 'active'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('student_id', user?.id).in('status', ['pending', 'confirmed', 'preparing', 'ready']),
        supabase
          .from('orders')
          .select('id, status, created_at, total_amount, bundles(name)')
          .eq('student_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      setStats({
        totalOrders: ordersRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        pendingDeliveries: pendingRes.count || 0
      });

      const formattedOrders = (recentRes.data || []).map((order: any) => ({
        id: order.id,
        bundle_name: order.bundles?.name || 'Unknown Bundle',
        status: order.status,
        created_at: order.created_at,
        total_amount: order.total_amount
      }));

      setRecentOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      confirmed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      preparing: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      ready: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      delivered: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return colors[status] || 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, bg: 'bg-blue-500/10', color: 'text-blue-400', shadow: 'shadow-blue-500/20' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: TrendingUp, bg: 'bg-emerald-500/10', color: 'text-emerald-400', shadow: 'shadow-emerald-500/20' },
    { label: 'Pending Deliveries', value: stats.pendingDeliveries, icon: Clock, bg: 'bg-amber-500/10', color: 'text-amber-400', shadow: 'shadow-amber-500/20' }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
          Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Here's a quick overview of your account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-400 mb-2">{stat.label}</h3>
                  <p className="text-4xl font-display font-bold text-white">{stat.value}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl shadow-sm ${stat.shadow}`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* Recent Orders - Spans 2 columns on lg */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-sm hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col animate-fade-in-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-xl font-display font-bold text-white">Recent Orders</h2>
            <Link to="/orders" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group">
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex-1 p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200 group">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="bg-slate-800 p-3 rounded-xl shadow-sm border border-white/5 text-slate-400 group-hover:text-emerald-400 transition-colors">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{order.bundle_name}</p>
                        <p className="text-sm text-slate-400">Ordered on {formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <span className="font-bold text-white">GH₵{order.total_amount.toFixed(2)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                <Ghost className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-white font-semibold mb-1">No orders yet</p>
                <p className="text-slate-400 text-sm max-w-xs">When you purchase your first food bundle, it will appear here.</p>
                <Link to="/" className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all">
                  Browse Bundles
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-sm hover:border-blue-500/30 transition-all duration-300 p-6 flex flex-col animate-fade-in-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <h2 className="text-xl font-display font-bold text-white mb-6">Quick Actions</h2>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <Link to="/" className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Browse Bundles
            </Link>
            <Link to="/orders" className="w-full bg-white/10 text-white px-4 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-white/5">
              <Package className="w-5 h-5" />
              View Orders
            </Link>
            <Link to="/profile" className="w-full bg-transparent border border-white/20 text-gray-300 px-4 py-3.5 rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Manage Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Delivery Alert Glassmorphism */}
      {stats.pendingDeliveries > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg shadow-blue-600/20 animate-fade-in-up opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          {/* Glass blur decorations */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="absolute bottom-0 right-32 -mb-16 w-32 h-32 rounded-full bg-indigo-400 opacity-20 blur-xl"></div>

          <div className="relative z-10 flex items-start sm:items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md flex-shrink-0 border border-white/10">
              <Clock className="text-white w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-lg">You have {stats.pendingDeliveries} active delivery{stats.pendingDeliveries > 1 ? 's' : ''}!</h3>
              <p className="text-blue-100 mt-1">Keep an eye out for a notification. Your food is being prepared and will be delivered according to your schedule.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
