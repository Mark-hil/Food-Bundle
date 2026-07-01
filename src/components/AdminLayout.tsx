import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from '../lib/navigation';
import { ShoppingBag, LayoutDashboard, UtensilsCrossed, Package, Tag, Users, Truck, Settings, LogOut, Menu, X } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import PageTransition from './PageTransition';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <ShoppingBag className="w-8 h-8 text-white" />
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

            {/* Admin User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
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
    </div>
  );
}
