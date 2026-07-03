import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from '../lib/navigation';
import { ShoppingBag, LayoutDashboard, UtensilsCrossed, Package, Tag, Users, Truck, Settings, LogOut, Menu, X, Bell } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import PageTransition from './PageTransition';
import { supabase } from '../lib/supabase';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastOrder, setToastOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRecentOrders();

    const orderSub = supabase.channel('admin_nav_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handleNewOrder)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guest_orders' }, handleNewOrder)
      .subscribe();

    return () => {
      orderSub.unsubscribe();
    };
  }, [user]);

  const loadRecentOrders = async () => {
    try {
      const [regRes, guestRes] = await Promise.all([
        supabase.from('orders').select('id, created_at, status, total_amount').order('created_at', { ascending: false }).limit(5),
        supabase.from('guest_orders').select('id, created_at, status, total_amount').order('created_at', { ascending: false }).limit(5)
      ]);

      const combined = [...(regRes.data || []), ...(guestRes.data || [])];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const top5 = combined.slice(0, 5);
      setRecentOrders(top5);
      setUnreadCount(top5.filter(o => o.status === 'pending').length);
    } catch (error) {
      console.error("Error loading recent orders:", error);
    }
  };

  const handleNewOrder = (payload: any) => {
    console.log("New order received in realtime:", payload);
    const newOrder = payload.new;
    
    setRecentOrders(prev => {
      const updated = [newOrder, ...prev].slice(0, 5);
      return updated;
    });
    setUnreadCount(prev => prev + 1);
    
    // Show toast
    setToastOrder(newOrder);
    
    // Play a gentle notification sound if possible
    try {
      const audio = new Audio('/notification.mp3'); // Optional: if you add a sound file later
      audio.play().catch(e => console.log("Audio play blocked by browser", e));
    } catch (e) {}

    setTimeout(() => setToastOrder(null), 5000);
  };

  if (!user || !profile) {
    return <>{children}</>;
  }

  const isActive = (path: string) => location.pathname === path;

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/bundles', label: 'Bundles', icon: UtensilsCrossed },
    { path: '/admin/orders', label: 'Orders', icon: Package },
    { path: '/admin/promos', label: 'Promos', icon: Tag },
    { path: '/admin/students', label: 'Students', icon: Users },
    { path: '/admin/delivery', label: 'Delivery', icon: Truck },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-40 h-screen w-64 bg-slate-950 text-white transition-transform duration-300 border-r border-slate-800/50 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="flex items-center space-x-2 p-6 border-b border-slate-800">
          <ShoppingBag className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold text-white font-display tracking-wide">Food Bundles</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => { setSidebarOpen(false); navigate(item.path); }}
                className={`flex items-center space-x-3 py-3 rounded-r-lg transition-all w-full text-left group ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-emerald-500/20 to-transparent border-l-4 border-emerald-500 text-emerald-400 pr-4 pl-3'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 px-4 border-l-4 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${!isActive(item.path) && 'group-hover:scale-110'}`} />
                <span className={`font-medium transition-transform ${!isActive(item.path) && 'group-hover:translate-x-1'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 transition-all group"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
            <span className="font-medium transition-transform group-hover:translate-x-1">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Page Title */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900 font-display">
                {adminNavItems.find(item => isActive(item.path))?.label || 'Admin'}
              </h1>
            </div>

            {/* Admin Header Actions */}
            <div className="flex items-center space-x-4">
              
              {/* Notifications Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) setUnreadCount(0); // Mark as read when opened
                  }}
                  className="p-2 relative rounded-full hover:bg-slate-100 text-slate-600 transition"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-4">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Recent Orders</h3>
                        {unreadCount > 0 && (
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {recentOrders.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-sm">No recent orders.</div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {recentOrders.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => {
                                  setShowNotifications(false);
                                  navigate('/admin/orders');
                                }}
                                className={`w-full text-left p-4 hover:bg-slate-50 transition ${order.status === 'pending' ? 'bg-blue-50/50' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-mono text-xs font-semibold text-slate-500">#{order.id.slice(0,8).toUpperCase()}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900">GH₵ {Number(order.total_amount).toFixed(2)}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(order.created_at).toLocaleTimeString()}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <button 
                          onClick={() => { setShowNotifications(false); navigate('/admin/orders'); }}
                          className="w-full text-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
                        >
                          View All Orders
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Admin User Info */}
              <div className="text-right hidden sm:block border-l border-slate-200 pl-4">
                <p className="text-sm font-medium text-gray-900">{profile.full_name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                {profile.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <WhatsAppButton />

      {/* Floating Toast Notification */}
      {toastOrder && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 p-4 w-80 flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900">New Order Received!</h4>
              <p className="text-sm text-slate-600 truncate mt-0.5">Order #{toastOrder.id.slice(0,8).toUpperCase()}</p>
              <p className="text-xs font-medium text-emerald-600 mt-1">GH₵ {Number(toastOrder.total_amount).toFixed(2)}</p>
            </div>
            <button 
              onClick={() => setToastOrder(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

