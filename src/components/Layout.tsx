import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation, useNavigate } from '../lib/navigation';
import { ShoppingBag, Package, User, LogOut, LayoutDashboard, UtensilsCrossed, Gift, Trophy, RefreshCw, Tag, Menu, X } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import PageTransition from './PageTransition';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user || !profile) {
    return <>{children}</>;
  }

  const isActive = (path: string) => location.pathname === path;

  const studentNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/', label: 'Bundles', icon: UtensilsCrossed },
    { path: '/orders', label: 'My Orders', icon: Package },
    { path: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
    { path: '/loyalty', label: 'Points', icon: Trophy },
    { path: '/referrals', label: 'Referrals', icon: Gift },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/bundles', label: 'Bundles', icon: UtensilsCrossed },
    { path: '/admin/orders', label: 'Orders', icon: Package },
    { path: '/admin/promos', label: 'Promos', icon: Tag },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-16">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-8 h-8 text-emerald-400" />
              <span className="text-xl font-bold text-white">UENR Food Bundles</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition text-sm ${
                      isActive(item.path)
                        ? 'bg-white/10 text-white font-semibold shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition ml-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition w-full text-left ${
                      isActive(item.path)
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTransition>{children}</PageTransition>
      </main>

      <WhatsAppButton />
    </div>
  );
}
