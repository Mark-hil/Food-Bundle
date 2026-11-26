import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Package, 
  Zap, 
  Shield, 
  Clock, 
  CheckCircle, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  MapPin, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  UserCheck, 
  KeyRound, 
  ShoppingBag,
  Info,
  BadgePercent
} from 'lucide-react';
import { Link } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';
import { sortBundlesWithAlphaBetaGamma } from '../../lib/bundleUtils';

export default function Home() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('available', true);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      const sorted = sortBundlesWithAlphaBetaGamma(data || []);
      setPackages(sorted.slice(0, 6));
    } catch (err) {
      console.error('Error loading packages:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };


  const faqs = [
    {
      q: 'Can I order right now as a guest without creating an account?',
      a: 'Yes, absolutely! You can choose any bundle, select "Order as Guest", fill in your hostel details, and pay securely via Mobile Money or Card in under a minute without signing up.'
    },
    {
      q: 'Can I choose today for my Preferred Delivery Date?',
      a: 'No, same-day delivery is not available. To guarantee peak ingredient freshness and quality food preparation, all orders are scheduled at least 1 day in advance (earliest delivery date is tomorrow).'
    },
    {
      q: 'How does delivery to my hostel room work?',
      a: 'During checkout, you select your campus hub and specify your room number or block landmark. You will also select your preferred time slot: Morning (8am-12pm), Afternoon (12pm-4pm), or Evening (4pm-8pm).'
    },
    {
      q: 'What is the 4-digit Pickup PIN?',
      a: 'Once your order is placed, you receive a unique 4-digit security PIN on your receipt and order status. When the courier arrives with your bundle, you share this PIN to safely verify and claim your package.'
    },
    {
      q: 'What payment methods are supported?',
      a: 'We accept all major Ghana payment channels via Paystack, including MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard debit and credit cards.'
    },
    {
      q: 'What are the benefits of a Semester Subscription?',
      a: 'Subscribers save up to 40% on food bundle costs, get discounted or free delivery rates, and enjoy scheduled automated drops so you never run out of food during exam weeks.'
    }
  ];

  const styles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `;

  return (
    <>
      <SEO
        title="FoodBundle | Student Meal Bundles Delivered to Campus Hostels"
        description="Nutritious, affordable food bundles tailored for university students. Order chef-prepared meal packs or raw staples with direct room delivery starting tomorrow."
        canonical="https://www.food-bundle.com/"
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "FoodBundle Student Meal Delivery",
          "url": "https://www.food-bundle.com/",
          "logo": "https://www.food-bundle.com/vite.svg",
          "description": "Fresh, nutritious meal bundles crafted for university students with scheduled hostel deliveries."
        }}
      />
      <style>{styles}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        
        {/* HERO SECTION */}
        <div className="relative overflow-hidden pt-8 pb-20 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 opacity-50"></div>
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            {/* Top pill badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-inner animate-in">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Student Food Delivery System • Scheduled to Your Hostel</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6 animate-in" style={{ animationDelay: '0.1s' }}>
                Healthy, Affordable Meals{' '}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
                  Delivered to Your Hostel
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal animate-in" style={{ animationDelay: '0.2s' }}>
                Skip the market stress, high canteen prices, and long cooking lines. Choose curated student food bundles delivered directly to your campus room with secure PIN verification.
              </p>
            </div>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-in" style={{ animationDelay: '0.3s' }}>
              <Link 
                to="/bundles" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
              >
                <ShoppingBag className="w-5 h-5" />
                Explore Meal Bundles <ArrowRight size={18} />
              </Link>
              
              {!user ? (
                <Link 
                  to="/bundles" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-7 py-4 rounded-xl font-semibold backdrop-blur-md border border-white/20 transition-all text-base"
                >
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  Order as Guest (No Account Needed)
                </Link>
              ) : (
                <Link 
                  to="/orders" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-7 py-4 rounded-xl font-semibold backdrop-blur-md border border-white/20 transition-all text-base"
                >
                  View My Orders
                </Link>
              )}
            </div>

            {/* Same-day notice banner */}
            <div className="max-w-2xl mx-auto bg-blue-950/60 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-md shadow-lg animate-in" style={{ animationDelay: '0.35s' }}>
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-slate-300">
                <span className="font-semibold text-white">Next-Day Scheduling Policy:</span> All meal packages are prepared and packaged fresh for each student. Deliveries are scheduled for <span className="text-emerald-400 font-semibold">tomorrow or any future date</span> with your preferred morning, afternoon, or evening time window.
              </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16">
              {[
                { icon: Package, label: 'Fresh Meals', value: '100%' },
                { icon: Clock, label: 'Quick Delivery', value: '24-48h' },
                { icon: Shield, label: 'Secure Payment', value: 'Verified' },
                { icon: Zap, label: 'Affordable', value: 'Delivery Fee' }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl text-center animate-in"
                    style={{ animationDelay: `${0.4 + idx * 0.1}s` }}
                  >
                    <Icon className="text-blue-400 mb-3 mx-auto" size={32} />
                    <p className="text-gray-300 text-sm mb-1">{stat.label}</p>
                    <p className="text-white text-2xl font-bold">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Student Service Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              {[
                { icon: Package, label: 'Fresh Quality Ingredients', value: '100% Guaranteed', color: 'text-emerald-400' },
                { icon: Clock, label: 'Convenient Time Windows', value: 'Morning / Noon / Night', color: 'text-amber-400' },
                { icon: KeyRound, label: 'Handover Protection', value: '4-Digit PIN Verified', color: 'text-blue-400' },
                { icon: BadgePercent, label: 'Semester Subscriptions', value: 'Save up to 5%', color: 'text-purple-400' }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-center hover:border-white/20 transition-all duration-300"
                  >
                    <Icon className={`w-7 h-7 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-white text-base sm:text-lg font-bold">{stat.value}</p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* HOW IT WORKS SECTION (Simple 4-Step Visual Guide) */}
        <section id="how-it-works" className="py-20 relative border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Simple & Hassle-Free</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">How FoodBundle Works</p>
              <p className="text-slate-400 text-sm sm:text-base mt-3">
                Ordering good food while studying should take under 2 minutes. Here is how easy it is from start to finish:
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  icon: ShoppingBag,
                  title: 'Select Your Bundle',
                  desc: 'Pick from curated student packs (Alpha, Beta, Gamma) or choose customizable meals with your favorite proteins and sides.',
                  badge: 'Step 1'
                },
                {
                  step: '02',
                  icon: Calendar,
                  title: 'Choose Date & Room',
                  desc: 'Select your preferred delivery date (starting tomorrow) and pick your time slot. Enter your campus hostel, hall, and room number.',
                  badge: 'Step 2'
                },
                {
                  step: '03',
                  icon: CreditCard,
                  title: 'Fast & Secure Payment',
                  desc: 'Pay instantly with Mobile Money (MTN, Telecel, AT) or Card via Paystack. Order as a registered student or checkout as a guest.',
                  badge: 'Step 3'
                },
                {
                  step: '04',
                  icon: KeyRound,
                  title: 'Pickup with Secure PIN',
                  desc: 'When the courier arrives at your hostel, provide your secret 4-digit pickup PIN to claim your fresh food package safely.',
                  badge: 'Step 4'
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-white/[0.08] transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                          {item.badge}
                        </span>
                        <span className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">
                          {item.step}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FEATURED PACKAGES SHOWCASE */}
        <section id="featured-bundles" className="py-20 relative z-10 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Fresh Campus Selections</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">Popular Student Packages</p>
                <p className="text-slate-400 text-sm sm:text-base mt-2">
                  Chef-prepared food bundles tailored to your appetite, nutrition needs, and student budget.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link 
                  to="/bundles" 
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold text-sm group transition-colors"
                >
                  View all available bundles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400"></div>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 p-8">
                <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-white text-lg font-semibold">Packages are currently being refreshed</p>
                <p className="text-slate-400 text-sm mt-1 mb-6">Check back shortly or visit our bundles catalog.</p>
                <Link to="/bundles" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm">
                  Go to Catalog
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group flex"
                  >
                    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col relative">
                      
                      {/* Dynamic Badge */}
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
                        {pkg.name === 'ALPHA' && '⭐ Premium Pack'}
                        {pkg.name === 'BETA' && '🔥 Most Popular'}
                        {pkg.name === 'GAMMA' && '💎 Best Value'}
                        {pkg.name !== 'ALPHA' && pkg.name !== 'BETA' && pkg.name !== 'GAMMA' && (pkg.is_customizable ? '✨ Customizable' : '⭐ Fresh Pick')}
                      </div>

                      {/* Image Display */}
                      {pkg.image_url ? (
                        <div className="w-full h-48 overflow-hidden relative bg-slate-800">
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                        </div>
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-b border-white/5">
                          <Package className="w-12 h-12 text-slate-600" />
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-grow">
                        {/* Header */}
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-white mb-1.5">{pkg.name}</h3>
                          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                            {pkg.description || 'Nutritious, high-yield student meal package.'}
                          </p>
                        </div>

                        {/* Items List */}
                        <div className="mb-6 bg-white/5 p-4 rounded-xl flex-grow border border-white/5">
                          <p className="text-[11px] font-bold text-blue-400 mb-2.5 uppercase tracking-wider">Package Includes</p>
                          <ul className="space-y-1.5">
                            {Array.isArray(pkg.items) && pkg.items.map((item: string, i: number) => (
                              <li key={i} className="text-slate-300 text-xs flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Price & Delivery Notice */}
                        <div className="mb-5 pb-5 border-b border-white/10 mt-auto flex items-end justify-between">
                          <div>
                            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Bundle Price</p>
                            <p className="text-3xl font-black text-white">
                              GH₵ {Number(pkg.price).toFixed(0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md font-medium border border-emerald-500/20">
                              Next-Day Drop
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {user ? (
                          <Link
                            to={`/checkout?bundle=${pkg.id}`}
                            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 font-bold transition-all text-center block text-sm"
                          >
                            Order Now
                          </Link>
                        ) : (
                          <div className="space-y-2">
                            <Link
                              to={`/guest-checkout?bundle=${pkg.id}`}
                              className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 font-bold transition-all text-center block text-sm"
                            >
                              Order as Guest (Quick Checkout)
                            </Link>
                            <Link
                              to={`/checkout?bundle=${pkg.id}`}
                              className="w-full bg-white/10 hover:bg-white/15 text-slate-200 py-2 rounded-xl text-xs font-semibold text-center block transition border border-white/10"
                            >
                              Sign in & Save with Points
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Browse All Bundles Button */}
            {!loading && packages.length > 0 && (
              <div className="mt-12 text-center">
                <Link
                  to="/bundles"
                  className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all text-base shadow-md"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Browse All Bundles Packages</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* WHY STUDENTS CHOOSE FOODBUNDLE (Value Matrix) */}
        <section className="py-20 relative border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Designed for Campus Life</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">Why Students Love Us</p>
              <p className="text-slate-400 text-sm sm:text-base mt-3">
                Everything you need to eat well, stay focused on lectures, and save money every month.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: 'No Long Market Trips',
                  desc: 'Save up to 4 hours every weekend. No walking under the sun or haggling over market produce prices.'
                },
                {
                  icon: Clock,
                  title: 'Flexible Time Slots',
                  desc: 'Pick Morning (8am-12pm), Afternoon (12pm-4pm), or Evening (4pm-8pm) based on your lecture schedule.'
                },
                {
                  icon: KeyRound,
                  title: 'Anti-Theft Pickup PIN',
                  desc: 'No stolen or misplaced deliveries. Couriers only hand over food after you verify your 4-digit PIN.'
                },
                {
                  icon: Shield,
                  title: '100% Secure MoMo & Card',
                  desc: 'Protected by Paystack. Supports MTN Mobile Money, Telecel Cash, AT Money, and bank cards.'
                },
                {
                  icon: UserCheck,
                  title: 'Guest Checkout in 60s',
                  desc: 'Need food immediately without filling long registration forms? Order as a guest in just three taps.'
                },
                {
                  icon: BadgePercent,
                  title: 'Loyalty & Subscriptions',
                  desc: 'Subscribers get up to 40% off meal costs. Every order earns loyalty points redeemable for discounts.'
                }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/40 hover:bg-white/[0.08] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-emerald-400 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CAMPUS DELIVERY COVERAGE */}
        <section className="py-20 relative border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-blue-900/40 via-emerald-900/20 to-slate-900/80 border border-white/15 rounded-3xl p-6 sm:p-12 relative overflow-hidden shadow-2xl">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Campus Doorstep & Porter Drop-Off</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  We Deliver Directly to Your Hall & Hostel
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  No walking to the campus main gate or carrying heavy groceries in the sun. Our couriers deliver directly to your hostel entrance or porter's lodge.
                </p>
              </div>

              {/* 3 Clear Hostel & Hall Categories */}
              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {/* 1. Private Hostels */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md hover:border-blue-400/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                        🏢
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Private Hostels</h3>
                        <p className="text-[11px] text-blue-300 font-medium">On & Off-Campus Hostels</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-3">
                      Direct delivery to all major private student hostels. Couriers hand over meals safely at your hostel reception or front security desk.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Dropped at hostel reception & gate</span>
                  </div>
                </div>

                {/* 2. Traditional Halls */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md hover:border-emerald-400/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        🏛️
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Campus Residence Halls</h3>
                        <p className="text-[11px] text-emerald-300 font-medium">Main Campus Halls</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-3">
                      Fast drop-offs across all traditional campus residence halls. Meet your dispatch rider right at your block's porter lodge without leaving your hall.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Direct drop-off at block porter lodge</span>
                  </div>
                </div>

                {/* 3. Diaspora Halls & Off-Campus */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md hover:border-purple-400/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                        📍
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Off-Campus & Apartments</h3>
                        <p className="text-[11px] text-purple-300 font-medium">Student Homestays & Flats</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-3">
                      Living outside campus? Simply pick your surrounding area or enter your specific house and apartment details during checkout.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Custom address option supported</span>
                  </div>
                </div>
              </div>

              {/* 3-Step Simple Delivery Process Banner */}
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                <div className="grid sm:grid-cols-3 gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Rider Calls Before Arrival</p>
                      <p className="text-[11px] text-slate-400">Notification 10 minutes prior</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Meet at Porter / Gate</p>
                      <p className="text-[11px] text-slate-400">Convenient drop-off at your block</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Verify 4-Digit Pickup PIN</p>
                      <p className="text-[11px] text-slate-400">Safe handover with your receipt PIN</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (Interactive Accordion) */}
        <section id="faq" className="py-20 relative border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Got Questions?</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</p>
              <p className="text-slate-400 text-sm sm:text-base mt-2">
                Everything you need to know before placing your first student bundle order.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-base font-bold text-white flex items-center gap-3">
                        <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        {faq.q}
                      </span>
                      <ChevronDown 
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          isOpen ? 'rotate-180 text-emerald-400' : ''
                        }`} 
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-slate-300 text-sm leading-relaxed border-t border-white/5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <p className="text-xs sm:text-sm text-slate-400">
                Have a different question? Check our{' '}
                <Link to="/faq" className="text-emerald-400 hover:underline font-semibold">
                  Full FAQ page
                </Link>{' '}
                or reach out via{' '}
                <Link to="/contact" className="text-blue-400 hover:underline font-semibold">
                  Contact Support
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM HIGH CONVERSION CTA */}
        <section className="py-20 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-r from-blue-600/30 via-emerald-600/20 to-blue-600/30 border border-white/20 rounded-3xl p-10 sm:p-14 backdrop-blur-xl shadow-2xl">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to Enjoy Fresh, Stress-Free Meals?
              </h2>
              <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-xl mx-auto">
                Join hundreds of students saving money and eating well every week. Place your order today for delivery starting tomorrow.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/bundles"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all text-base"
                >
                  <ShoppingBag size={20} />
                  Browse All Meal Bundles
                </Link>
                {!user && (
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold backdrop-blur-md border border-white/20 transition-all text-base"
                  >
                    Create Free Student Account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}