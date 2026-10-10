import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { Link, useNavigate } from '../lib/navigation';
import { ShoppingCart, CheckCircle, Star, ArrowRight, Crown, Sliders, ShoppingBag, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomizationModal from '../components/CustomizationModal';
import SEO from '../components/SEO';

import { sortBundlesWithAlphaBetaGamma } from '../lib/bundleUtils';

interface BundleWithRating extends Bundle {
  averageRating?: number;
  reviewCount?: number;
}

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
    const hasCustomItems = Array.isArray(customItems) && customItems.length > 0;
    const customId = crypto.randomUUID();
    if (hasCustomItems) {
      sessionStorage.setItem(`custom_bundle_${customId}`, JSON.stringify(customItems));
    }
    const customParam = hasCustomItems ? `&custom=${customId}` : '';
    if (user) {
      navigate(`/checkout?bundle=${customizingBundle.id}${customParam}${isSubscribing ? '&subscribe=true' : ''}`);
    } else {
      navigate(`/guest-checkout?bundle=${customizingBundle.id}${customParam}`);
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
    const price = Number(bundle.price);

    return (
      <div
        key={bundle.id}
        className="group flex animate-in"
        style={{ animationDelay: `${0.1 + idx * 0.1}s` }}
      >
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col relative">
          
          {/* Dynamic Badge */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
            {bundle.name === 'ALPHA' && '⭐ Premium Pack'}
            {bundle.name === 'BETA' && '🔥 Most Popular'}
            {bundle.name === 'GAMMA' && '💎 Best Value'}
            {bundle.name !== 'ALPHA' && bundle.name !== 'BETA' && bundle.name !== 'GAMMA' && (bundle.is_customizable ? '✨ Customizable' : '⭐ Fresh Pick')}
          </div>

          {/* Image Display */}
          {bundle.image_url ? (
            <div className="w-full h-48 overflow-hidden relative bg-slate-800">
              <img
                src={bundle.image_url}
                alt={bundle.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
              {bundle.is_customizable && (
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                  <Sliders size={13} className="text-amber-400" />
                  Customizable
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-36 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-b border-white/5">
              <ShoppingBag className="w-12 h-12 text-slate-600" />
            </div>
          )}

          <div className="p-6 flex flex-col flex-grow">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xl font-bold text-white">{bundle.name}</h3>
                {bundle.averageRating ? (
                  renderStars(bundle.averageRating, bundle.reviewCount)
                ) : null}
              </div>
              <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                {bundle.description || 'Nutritious, high-yield student meal package.'}
              </p>
            </div>

            {/* Items List - Shows ALL items */}
            <div className="mb-6 bg-white/5 p-4 rounded-xl flex-grow border border-white/5">
              <p className="text-[11px] font-bold text-blue-400 mb-2.5 uppercase tracking-wider">Package Includes</p>
              <ul className="space-y-1.5">
                {Array.isArray(bundle.items) && bundle.items.map((item: string, i: number) => (
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
                  GH₵ {price.toFixed(0)}
                </p>
                {Boolean(bundle.duration_days && bundle.duration_days > 0) && (
                  <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    ~{bundle.duration_days} Days coverage
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md font-medium border border-emerald-500/20">
                  Next-Day Drop
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleGuestOrder(bundle.id)}
                className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 font-bold transition-all text-center block text-sm"
              >
                {bundle.is_customizable ? 'Customize & Order as Guest' : 'Order as Guest (Quick Checkout)'}
              </button>
              {bundle.is_customizable && (
                <button
                  type="button"
                  onClick={() => navigate(`/guest-checkout?bundle=${bundle.id}`)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
                >
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span>Order Standard (No Customization)</span>
                </button>
              )}
              <Link
                to="/register"
                className="w-full bg-white/10 hover:bg-white/15 text-slate-200 py-2 rounded-xl text-xs font-semibold text-center block transition border border-white/10"
              >
                Sign up for Weekly Subscriptions
              </Link>
            </div>

          </div>
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

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 text-slate-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 opacity-50 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="group flex"
            >
              <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col relative">
                
                {/* Dynamic Badge */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
                  {bundle.name === 'ALPHA' && '⭐ Premium Pack'}
                  {bundle.name === 'BETA' && '🔥 Most Popular'}
                  {bundle.name === 'GAMMA' && '💎 Best Value'}
                  {bundle.name !== 'ALPHA' && bundle.name !== 'BETA' && bundle.name !== 'GAMMA' && (bundle.is_customizable ? '✨ Customizable' : '⭐ Fresh Pick')}
                </div>

                {/* Image Display */}
                {bundle.image_url ? (
                  <div className="w-full h-48 overflow-hidden relative bg-slate-800">
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    {bundle.is_customizable && (
                      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/20 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                        <Sliders size={13} className="text-amber-400" />
                        Customizable
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-b border-white/5">
                    <ShoppingBag className="w-12 h-12 text-slate-600" />
                  </div>
                )}

                <div className="p-6 flex flex-col flex-grow">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xl font-bold text-white">{bundle.name}</h3>
                      {bundle.averageRating ? (
                        renderStars(bundle.averageRating, bundle.reviewCount)
                      ) : null}
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {bundle.description || 'Nutritious, high-yield student meal package.'}
                    </p>
                  </div>

                  {/* Items List - Shows ALL items */}
                  <div className="mb-6 bg-white/5 p-4 rounded-xl flex-grow border border-white/5">
                    <p className="text-[11px] font-bold text-blue-400 mb-2.5 uppercase tracking-wider">Package Includes</p>
                    <ul className="space-y-1.5">
                      {Array.isArray(bundle.items) && bundle.items.map((item: string, i: number) => (
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
                        GH₵ {Number(bundle.price).toFixed(0)}
                      </p>
                      {Boolean(bundle.duration_days && bundle.duration_days > 0) && (
                        <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                          ~{bundle.duration_days} Days coverage
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md font-medium border border-emerald-500/20">
                        Next-Day Drop
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleActionClick(bundle, false)}
                        className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 font-bold transition-all text-center text-xs"
                      >
                        {bundle.is_customizable ? 'Customize & Order' : 'Order Now'}
                      </button>
                      <button
                        onClick={() => handleActionClick(bundle, true)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 font-bold transition-all text-center text-xs"
                      >
                        Subscribe
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {bundle.is_customizable && (
                        <button
                          onClick={() => navigate(`/checkout?bundle=${bundle.id}`)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-emerald-300 py-1.5 rounded-xl text-[11px] font-semibold transition border border-white/10 text-center"
                        >
                          Order Standard (Skip Custom)
                        </button>
                      )}
                      <button
                        onClick={() => setReviewingBundleId(bundle.id)}
                        className="px-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white py-1.5 rounded-xl text-[11px] font-semibold transition border border-white/10"
                      >
                        Rate
                      </button>
                    </div>
                  </div>

                  {/* Review Form Drawer */}
                  {reviewingBundleId === bundle.id && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-semibold text-white mb-2 text-xs">Leave a Review</h4>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-300 mb-1">Rating</label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="transition"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= reviewRating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-600 hover:text-yellow-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-2">
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800/80 border border-white/10 text-white rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs placeholder-gray-500"
                          rows={2}
                          placeholder="Share your thoughts about this bundle"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitReview(bundle.id)}
                          disabled={submittingReview}
                          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50 text-xs"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                          onClick={() => setReviewingBundleId(null)}
                          className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded-lg transition text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                </div>
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
