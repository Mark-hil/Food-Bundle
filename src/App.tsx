import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useLocation } from './lib/navigation';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import PublicNavbar from './components/PublicNavbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import Register from './pages/Register';
import Bundles from './pages/Bundles';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBundles from './pages/admin/AdminBundles';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetails from './pages/admin/OrderDetails';
import Students from './pages/admin/Students';
import StudentDetails from './pages/admin/StudentDetails';
import CreatePackage from './pages/admin/CreatePackage';
import EditPackage from './pages/admin/EditPackage';
import DeliverySchedule from './pages/admin/DeliverySchedule';
import AdminSettings from './pages/admin/Settings';
import AdminLogin from './pages/auth/AdminLogin';
import Home from './pages/public/Home';
import Packages from './pages/public/Packages';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import FAQ from './pages/public/FAQ';
import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import RefundPolicy from './pages/public/RefundPolicy';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResendVerification from './pages/auth/ResendVerification';
import Overview from './pages/dashboard/Overview';
import MySubscriptions from './pages/dashboard/MySubscriptions';
import TrackDelivery from './pages/dashboard/TrackDelivery';
import PaymentConfirm from './pages/payment/PaymentConfirm';
import PaymentSuccess from './pages/payment/PaymentSuccess';
import PaymentFailed from './pages/payment/PaymentFailed';
import EditProfile from './pages/account/EditProfile';
import ChangePassword from './pages/account/ChangePassword';
import UpdatePhone from './pages/account/UpdatePhone';
import ManageAddresses from './pages/account/ManageAddresses';
import NotificationSettings from './pages/account/NotificationSettings';
import HelpCenter from './pages/support/HelpCenter';
import SupportTickets from './pages/support/SupportTickets';
import CreateTicket from './pages/support/CreateTicket';
import TicketDetails from './pages/support/TicketDetails';
import GuestCheckout from './pages/GuestCheckout';
import GuestPayment from './pages/GuestPayment';
import Subscriptions from './pages/dashboard/Subscriptions';
import LoyaltyPoints from './pages/dashboard/LoyaltyPoints';
import Referrals from './pages/dashboard/Referrals';
import WhatsAppButton from './components/WhatsAppButton';
import PageTransition from './components/PageTransition';
import PromoCodes from './pages/admin/PromoCodes';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (location.pathname === '/admin/login') {
      return <AdminLogin />;
    }
    const isPublicPage = ['/', '/packages', '/about', '/contact', '/faq', '/terms', '/privacy', '/refund-policy', '/guest-checkout', '/guest-payment'].includes(location.pathname) || location.pathname.startsWith('/guest-checkout') || location.pathname.startsWith('/guest-payment');

    return (
      <div className="pt-16">
        <PublicNavbar />
        <WhatsAppButton />
        {location.pathname === '/' && (
          <>
            <PageTransition><Home /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/packages' && (
          <>
            <PageTransition><Packages /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/about' && (
          <>
            <PageTransition><About /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/contact' && (
          <>
            <PageTransition><Contact /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/faq' && (
          <>
            <PageTransition><FAQ /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/terms' && (
          <>
            <PageTransition><Terms /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/privacy' && (
          <>
            <PageTransition><Privacy /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/refund-policy' && (
          <>
            <PageTransition><RefundPolicy /></PageTransition>
            <Footer />
          </>
        )}
        {location.pathname === '/register' && <PageTransition><Register /></PageTransition>}
        {location.pathname === '/guest-checkout' && <PageTransition><GuestCheckout /></PageTransition>}
        {location.pathname === '/guest-payment' && <PageTransition><GuestPayment /></PageTransition>}
        {location.pathname === '/forgot-password' && <ForgotPassword />}
        {location.pathname.startsWith('/reset-password') && <ResetPassword />}
        {location.pathname.startsWith('/verify-email') && <VerifyEmail />}
        {location.pathname === '/resend-verification' && <ResendVerification />}
        {!isPublicPage && location.pathname !== '/register' && location.pathname !== '/guest-checkout' && location.pathname !== '/guest-payment' && location.pathname !== '/forgot-password' && !location.pathname.startsWith('/reset-password') && !location.pathname.startsWith('/verify-email') && location.pathname !== '/resend-verification' && <Login />}
      </div>
    );
  }

  // Determine if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Render admin routes with AdminLayout
  if (isAdmin && isAdminRoute) {
    return (
      <AdminLayout>
        {location.pathname === '/admin' && <AdminDashboard />}
        {location.pathname === '/admin/dashboard' && <AdminDashboard />}
        {location.pathname === '/admin/bundles' && <AdminBundles />}
        {location.pathname === '/admin/packages' && <AdminBundles />}
        {location.pathname === '/admin/orders' && <AdminOrders />}
        {location.pathname.startsWith('/admin/orders/') && <AdminOrderDetails />}
        {location.pathname === '/admin/students' && <Students />}
        {location.pathname.startsWith('/admin/students/') && <StudentDetails />}
        {location.pathname === '/admin/packages/new' && <CreatePackage />}
        {location.pathname.startsWith('/admin/packages/') && location.pathname !== '/admin/packages' && location.pathname !== '/admin/packages/new' && <EditPackage />}
        {location.pathname === '/admin/delivery' && <DeliverySchedule />}
        {location.pathname === '/admin/promos' && <PromoCodes />}
        {location.pathname === '/admin/settings' && <AdminSettings />}
      </AdminLayout>
    );
  }

  // Render student/user routes with Layout
  return (
    <Layout>
      {location.pathname === '/' && <Bundles />}
      {location.pathname === '/dashboard' && <Overview />}
      {location.pathname === '/dashboard/overview' && <Overview />}
      {location.pathname === '/checkout' && <Checkout />}
      {location.pathname === '/payment' && <Payment />}
      {location.pathname === '/payment/confirm' && <PaymentConfirm />}
      {location.pathname === '/payment/success' && <PaymentSuccess />}
      {location.pathname === '/payment/failed' && <PaymentFailed />}
      {location.pathname === '/orders' && <Orders />}
      {location.pathname === '/my-subscriptions' && <MySubscriptions />}
      {location.pathname === '/subscriptions' && <Subscriptions />}
      {location.pathname === '/loyalty' && <LoyaltyPoints />}
      {location.pathname === '/referrals' && <Referrals />}
      {location.pathname.startsWith('/track/') && <TrackDelivery />}
      {location.pathname === '/profile' && <Profile />}
      {location.pathname === '/profile/edit' && <EditProfile />}
      {location.pathname === '/profile/change-password' && <ChangePassword />}
      {location.pathname === '/profile/update-phone' && <UpdatePhone />}
      {location.pathname === '/profile/addresses' && <ManageAddresses />}
      {location.pathname === '/profile/notifications' && <NotificationSettings />}
      {location.pathname === '/help' && <HelpCenter />}
      {location.pathname === '/support' && <SupportTickets />}
      {location.pathname === '/support/new' && <CreateTicket />}
      {location.pathname.startsWith('/support/') && location.pathname !== '/support' && location.pathname !== '/support/new' && <TicketDetails />}
      {location.pathname.startsWith('/orders/') && <TrackDelivery />}
      {!isAdmin && location.pathname.startsWith('/admin') && <Bundles />}
    </Layout>
  );
}

import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <NavigationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NavigationProvider>
    </HelmetProvider>
  );
}

export default App;
