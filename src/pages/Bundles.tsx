import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { Link, useNavigate } from '../lib/navigation';
import { ShoppingCart, Clock, CheckCircle, Star, Settings, Check, ArrowRight, Zap, Crown, Rocket, Sliders, ShoppingBag, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomizationModal from '../components/CustomizationModal';
import SEO from '../components/SEO';

import { sortBundlesWithAlphaBetaGamma } from '../lib/bundleUtils';

interface BundleWithRating extends Bundle {
  averageRating?: number;
  reviewCount?: number;
}

const packageMeta: Record<string, { badge: string; icon: any; iconColor: string; highlight: boolean }> = {
  ALPHA: {
    badge: 'Premium Pack',
    icon: Zap,
    iconColor: 'from-blue-500 to-blue-600',
    highlight: false,
  },
  BETA: {
    badge: 'Most Popular',
    icon: Crown,
    iconColor: 'from-emerald-500 to-emerald-600',
    highlight: true,
  },
  GAMMA: {
    badge: 'Best Value',
    icon: Rocket,
    iconColor: 'from-amber-500 to-amber-600',
    highlight: false,
  },
};

const getBundleMeta = (bundle: Bundle) => {
  if (packageMeta[bundle.name]) {
    return packageMeta[bundle.name];
  }
  if (bundle.is_customizable) {
    return {
      badge: 'Customizable Pack',
      icon: Sliders,
      iconColor: 'from-purple-500 to-indigo-600',
      highlight: false,
    };
  }
  return {
    badge: 'Special Selection',
    icon: ShoppingBag,
    iconColor: 'from-teal-500 to-emerald-600',
    highlight: false,
  };
};

export default function Bundles() {
  const [bundles, setBundles] = useState<BundleWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBundleId, setReviewingBundleId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [customizingBundle, setCustomizingBundle] = useState<Bundle | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const styles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    .animate-in { animation: fadeInUp 0.6s ease-out forwards; }

    @keyframes pulse-slow {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.7; }
    }
    .pulse-slow { animation: pulse-slow 2.5s ease-in-out infinite; }
  `;

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('available', true)
        .order('price', { ascending: false });

      if (error) throw error;

      // Load average ratings for each bundle for both authenticated and guest users
      const bundlesWithRatings = await Promise.all(
        (data || []).map(async (bundle) => {
          const { data: reviews, error: reviewError } = await supabase
            .from('bundle_reviews')
            .select('rating')
            .eq('bundle_id', bundle.id);

          if (!reviewError && reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            return { ...bundle, averageRating: avgRating, reviewCount: reviews.length };
          }
          return { ...bundle, reviewCount: 0 };
        })
      );
      const sortedBundles = sortBundlesWithAlphaBetaGamma(bundlesWithRatings);
      setBundles(sortedBundles);
    } catch (error) {
      console.error('Error loading bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (bundleId: string) => {
    if (!user) {
      alert('Please login to leave a review');
      return;
    }

    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from('bundle_reviews')
        .insert({
          bundle_id: bundleId,
          student_id: user.id,
          rating: reviewRating,
          comment: reviewComment || null,
        });

      if (error) throw error;

      setReviewingBundleId(null);
      setReviewRating(5);
      setReviewComment('');
      loadBundles();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number | undefined, count?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400/40'
            }`}
          />
        ))}
        <span className="text-xs text-gray-300 ml-1 font-medium">
          {rating.toFixed(1)} {count ? `(${count})` : ''}
        </span>
      </div>
    );
  };

  const handleActionClick = (bundle: BundleWithRating, subscribe: boolean) => {
    if (bundle.is_customizable && bundle.customization_options && bundle.customization_options.length > 0) {
      setCustomizingBundle(bundle);
      setIsSubscribing(subscribe);
    } else {
      if (user) {
        navigate(`/checkout?bundle=${bundle.id}${subscribe ? '&subscribe=true' : ''}`);
      } else {
        navigate(`/guest-checkout?bundle=${bundle.id}`);
      }
    }
  };

  const handleCustomizationConfirm = (customItems: string[]) => {
    if (!customizingBundle) return;
    const customId = crypto.randomUUID();
    sessionStorage.setItem(`custom_bundle_${customId}`, JSON.stringify(customItems));
    if (user) {
      navigate(`/checkout?bundle=${customizingBundle.id}&custom=${customId}${isSubscribing ? '&subscribe=true' : ''}`);
    } else {
      navigate(`/guest-checkout?bundle=${customizingBundle.id}&custom=${customId}`);
    }
    setCustomizingBundle(null);
  };

  const handleGuestOrder = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (bundle && bundle.is_customizable && bundle.customization_options && bundle.customization_options.length > 0) {
      setCustomizingBundle(bundle);
      setIsSubscribing(false);
    } else {
      navigate(`/guest-checkout?bundle=${bundleId}`);
    }
  };

  // ── Public / Guest Card Renderer ──────────────────────────────────────────
  const renderPublicBundleCard = (bundle: BundleWithRating, idx: number) => {
    const meta = getBundleMeta(bundle);
    const Icon = meta.icon;
    const price = Number(bundle.price);

    return (
      <div
        key={bundle.id}
        className={`rounded-3xl p-6 sm:p-8 transition-all duration-300 transform hover:-translate-y-1 animate-in backdrop-blur-xl border flex flex-col justify-between ${
          meta.highlight
            ? 'bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-blue-500/15 border-emerald-400/50 ring-2 ring-emerald-400/40 shadow-xl shadow-emerald-950/40'
            : 'bg-white/5 border-white/10 hover:border-blue-400/40 shadow-lg'
        }`}
        style={{ animationDelay: `${0.1 + idx * 0.1}s` }}
      >
        <div>
          {/* Badge & Category Icon */}
          <div className="flex items-start justify-between mb-4">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
              meta.highlight ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
            }`}>
              <Icon size={13} />
              <span>{meta.badge}</span>
            </div>
            <div className={`bg-gradient-to-br ${meta.iconColor} p-2.5 rounded-2xl shadow-md`}>
              <Icon className="text-white" size={20} />
            </div>
          </div>

          {/* Image */}
          {bundle.image_url ? (
            <div className="w-full h-48 mb-6 rounded-2xl overflow-hidden relative group shadow-md">
              <img
                src={bundle.image_url}
                alt={bundle.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              {bundle.is_customizable && (
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                  <Sliders size={13} className="text-amber-400" />
                  Customizable
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-48 mb-6 rounded-2xl bg-slate-800/80 flex items-center justify-center border border-white/5">
              <ShoppingCart className="w-16 h-16 text-slate-600" />
            </div>
          )}

          {/* Title & Description */}
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">{bundle.name}</h3>
          </div>
          
          <p className={`mb-4 text-xs sm:text-sm line-clamp-2 leading-relaxed ${meta.highlight ? 'text-emerald-100/90' : 'text-gray-300'}`}>
            {bundle.description || 'Nutritious, high-quality meal package prepared for students.'}
          </p>

          {/* Ratings & Delivery */}
          <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
            {bundle.averageRating ? (
              renderStars(bundle.averageRating, bundle.reviewCount)
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle size={13} className="text-emerald-400" /> Fresh Selection
              </span>
            )}
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Clock size={12} className="text-blue-400" />
              {bundle.delivery_days && bundle.delivery_days.length > 0 ? bundle.delivery_days.join(', ') : 'Daily Delivery'}
            </span>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-black text-white font-display tracking-tight">GH₵{price.toFixed(0)}</span>
              <span className="text-xs text-gray-400 font-medium">/ package</span>
            </div>
            {Boolean(bundle.duration_days && bundle.duration_days > 0) && (
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                Covers ~{bundle.duration_days} Days {bundle.items_per_week ? `(${bundle.items_per_week} meals/week)` : ''}
              </p>
            )}
          </div>
        </div>

        <div>
          {/* Order Actions */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => handleGuestOrder(bundle.id)}
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold transition transform active:scale-95 text-sm shadow-md ${
                meta.highlight
                  ? 'bg-gradient-to-r from-emerald-400 to-blue-500 text-slate-950 hover:shadow-emerald-400/30'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart size={17} />
              <span>{bundle.is_customizable ? 'Customize & Order as Guest' : 'Order Now as Guest'}</span>
            </button>
            <Link
              to="/register"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <UserPlus size={14} className="text-blue-400" />
              <span>Sign up for Weekly Subscription</span>
            </Link>
          </div>

          {/* Items Preview */}
          {bundle.items && bundle.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Package Items</h4>
              <div className="flex flex-wrap gap-1.5">
                {bundle.items.map((item: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-white/10 text-gray-200 px-2.5 py-1 rounded-lg border border-white/10">
                    <Check size={11} className="text-emerald-400" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Conditional Rendering: Guest View vs Authenticated View ─────────────
  if (!user) {
    return (
      <>
        <SEO
          title="Our Food Bundles | Student Meal Packages"
          description="Browse our complete menu of student food bundles. Alpha, Beta, Gamma and customizable meal plans available for instant guest checkout."
          canonical="https://www.food-bundle.com/bundles"
        />
        <style>{styles}</style>

        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 text-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header Title */}
            <div className="text-center mb-10 animate-in">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-4">
                <ShoppingBag size={14} /> Open Menu & Instant Checkout
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display mb-4">
                Explore All Food Packages
              </h1>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Carefully prepared meal packages crafted for students. Order directly as a guest or create an account for weekly recurring deliveries.
              </p>
            </div>

            {/* Student Perks Value Banner */}
            <div className="mb-12 animate-in" style={{ animationDelay: '0.1s' }}>
              <div className="bg-gradient-to-r from-blue-900/60 via-purple-900/40 to-slate-900/80 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Are you a student living on or near campus?
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                      Create a free account to unlock <strong className="text-emerald-400">automated weekly subscriptions</strong>, earn loyalty rewards on every meal, track live driver deliveries, and access exclusive reorder discounts.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
                  <Link
                    to="/register"
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold px-6 py-3 rounded-2xl transition transform hover:scale-105 shadow-lg shadow-blue-500/30 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition"
                  >
                    Log In
                  </Link>
                </div>
              </div>
            </div>

            {/* Bundles Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-pulse h-96" />
                ))}
              </div>
            ) : bundles.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center mb-16">
                <ShoppingCart className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 text-lg font-semibold">No packages are currently live on the menu.</p>
                <p className="text-slate-500 text-sm mt-1">Please check back shortly as the kitchen updates the weekly catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {bundles.map((bundle, idx) => renderPublicBundleCard(bundle, idx))}
              </div>
            )}

            {/* Guaranteed Standards Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 text-center animate-in mb-16" style={{ animationDelay: '0.4s' }}>
              <div className="max-w-3xl mx-auto">
                <span className="inline-block p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 mb-4">
                  <Shield className="w-8 h-8" />
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Freshness & Quality Guaranteed</h2>
                <p className="text-slate-300 text-sm sm:text-base mb-8 leading-relaxed">
                  Every food package is assembled with premium ingredients, strict hygiene protocols, and delivered with insulated care directly to your hall or hostel doorstep.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-left">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="font-bold text-white text-sm mb-1">⚡ Fast Campus Delivery</p>
                    <p className="text-xs text-slate-400">Direct doorstep drops with real-time tracking.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="font-bold text-white text-sm mb-1">🥗 Balanced Nutrition</p>
                    <p className="text-xs text-slate-400">Staples, proteins, and wholesome student essentials.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="font-bold text-white text-sm mb-1">🔒 Verified Secure Pay</p>
                    <p className="text-xs text-slate-400">Mobile Money & card checkouts via Paystack.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {customizingBundle && (
          <CustomizationModal
            bundle={customizingBundle}
            isOpen={!!customizingBundle}
            onClose={() => setCustomizingBundle(null)}
            onConfirm={handleCustomizationConfirm}
          />
        )}
      </>
    );
  }

  // Authenticated View
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Food Bundles</h1>
        <p className="text-gray-400">Choose from our delicious meal bundles</p>
      </div>

      {bundles.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg">No bundles available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
            >
              <div className="h-48 bg-slate-800 flex items-center justify-center relative">
                {bundle.image_url ? (
                  <>
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </>
                ) : (
                  <ShoppingCart className="w-20 h-20 text-slate-600" />
                )}
              </div>

              <div className="p-6 relative">
                <h3 className="text-xl font-bold text-white mb-2">{bundle.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {bundle.description || 'Delicious meal bundle'}
                </p>

                <div className="mb-4">
                  {bundle.items && bundle.items.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {bundle.items.map((item, idx) => (
                        <span key={idx} className="text-[10px] bg-white/10 text-gray-200 px-2 py-1 rounded-md border border-white/10">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-300 mb-2">
                      <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                      <span>0 items included</span>
                    </div>
                  )}
                  {bundle.is_customizable && (
                    <div className="flex items-center text-sm text-blue-300 mb-2 font-medium">
                      <Settings className="w-4 h-4 mr-2" />
                      <span>Customizable Bundle</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-300">
                    <Clock className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Delivery: {bundle.delivery_days?.join(', ') || 'Weekdays'}</span>
                  </div>
                </div>

                <div className="mb-3 pt-2">
                  {renderStars(bundle.averageRating)}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <span className="text-2xl font-bold text-white">
                      GH₵ {Number(bundle.price).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => setReviewingBundleId(bundle.id)}
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
                    >
                      Rate
                    </button>
                    <button
                      onClick={() => handleActionClick(bundle, true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 text-white font-semibold px-4 py-2 rounded-lg transition transform hover:scale-105 text-sm"
                    >
                      Subscribe
                    </button>
                    <button
                      onClick={() => handleActionClick(bundle, false)}
                      className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold px-4 py-2 rounded-lg transition transform hover:scale-105 text-sm"
                    >
                      {bundle.is_customizable ? 'Customize & Order' : 'Order Now'}
                    </button>
                  </div>
                </div>

                {reviewingBundleId === bundle.id && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="font-semibold text-white mb-3">Leave a Review</h4>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rating
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className="transition"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= reviewRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-600 hover:text-yellow-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Comment (Optional)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm placeholder-gray-500"
                        rows={2}
                        placeholder="Share your thoughts about this bundle"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitReview(bundle.id)}
                        disabled={submittingReview}
                        className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit'}
                      </button>
                      <button
                        onClick={() => setReviewingBundleId(null)}
                        className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {customizingBundle && (
        <CustomizationModal
          bundle={customizingBundle}
          isOpen={!!customizingBundle}
          onClose={() => setCustomizingBundle(null)}
          onConfirm={handleCustomizationConfirm}
        />
      )}
    </div>
  );
}
