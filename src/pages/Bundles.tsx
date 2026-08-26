import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { Link, useNavigate } from '../lib/navigation';
import { ShoppingCart, Clock, CheckCircle, Star, Settings, Check, ArrowRight, Zap, Crown, Rocket, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomizationModal from '../components/CustomizationModal';
import SEO from '../components/SEO';

interface BundleWithRating extends Bundle {
  averageRating?: number;
}

const PREVIEW_NAMES = ['ALPHA', 'BETA', 'GAMMA'];

const packageMeta: Record<string, { badge: string; icon: any; iconColor: string; highlight: boolean }> = {
  ALPHA: {
    badge: 'Premium',
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
        .order('created_at', { ascending: false }); // User dashboard uses descending usually, but public used ascending.

      if (error) throw error;

      if (user) {
        // Load average ratings for each bundle if user is logged in
        const bundlesWithRatings = await Promise.all(
          (data || []).map(async (bundle) => {
            const { data: reviews, error: reviewError } = await supabase
              .from('bundle_reviews')
              .select('rating')
              .eq('bundle_id', bundle.id);

            if (!reviewError && reviews && reviews.length > 0) {
              const avgRating =
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
              return { ...bundle, averageRating: avgRating };
            }
            return bundle;
          })
        );
        setBundles(bundlesWithRatings);
      } else {
        // For guest, sort by ascending to match ALPHA, BETA, GAMMA
        const sortedGuest = (data || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setBundles(sortedGuest);
      }
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

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleActionClick = (bundle: BundleWithRating, subscribe: boolean) => {
    if (bundle.is_customizable && bundle.customization_options && bundle.customization_options.length > 0) {
      setCustomizingBundle(bundle);
      setIsSubscribing(subscribe);
    } else {
      navigate(`/checkout?bundle=${bundle.id}${subscribe ? '&subscribe=true' : ''}`);
    }
  };

  const handleCustomizationConfirm = (customItems: string[]) => {
    if (!customizingBundle) return;
    const customId = crypto.randomUUID();
    sessionStorage.setItem(`custom_bundle_${customId}`, JSON.stringify(customItems));
    navigate(`/checkout?bundle=${customizingBundle.id}&custom=${customId}${isSubscribing ? '&subscribe=true' : ''}`);
    setCustomizingBundle(null);
  };

  const handleGuestOrder = (bundleId: string) => {
    navigate(`/guest-checkout?bundle=${bundleId}`);
  };

  // ── Guest (Public) Render Methods ──────────────────────────────────────────
  const previewBundles = PREVIEW_NAMES
    .map(name => bundles.find(b => b.name === name))
    .filter(Boolean);

  const lockedBundles = bundles.filter(b => !PREVIEW_NAMES.includes(b.name));

  const renderPreviewCard = (bundle: any, idx: number) => {
    const meta = packageMeta[bundle.name] ?? {
      badge: 'Bundle',
      icon: ShoppingCart,
      iconColor: 'from-blue-500 to-blue-600',
      highlight: false,
    };
    const Icon = meta.icon;
    const price = Number(bundle.price);

    return (
      <div
        key={bundle.id}
        className={`rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 animate-in backdrop-blur-xl border ${
          meta.highlight
            ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-emerald-400/50 ring-2 ring-emerald-400 scale-105'
            : 'bg-white/10 border-white/10 hover:border-blue-400/50'
        }`}
        style={{ animationDelay: `${0.1 + idx * 0.15}s` }}
      >
        {/* Badge & Icon */}
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            meta.highlight ? 'bg-emerald-400/30 text-emerald-200' : 'bg-blue-400/30 text-blue-200'
          }`}>
            {meta.badge}
          </div>
          <div className={`bg-gradient-to-br ${meta.iconColor} p-2 rounded-lg`}>
            <Icon className="text-white" size={24} />
          </div>
        </div>

        {/* Image */}
        {bundle.image_url && (
          <div className="w-full h-48 mb-6 rounded-xl overflow-hidden relative group">
            <img
              src={bundle.image_url}
              alt={bundle.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          </div>
        )}

        <h3 className="text-3xl font-bold mb-2 text-white capitalize">{bundle.name}</h3>
        <p className={`mb-6 text-sm ${meta.highlight ? 'text-emerald-100' : 'text-gray-300'}`}>
          {bundle.description || `${meta.badge} food bundle`}
        </p>

        {/* Price */}
        <div className="mb-6">
          {loading ? (
            <div className="h-14 w-32 bg-white/10 rounded-lg animate-pulse" />
          ) : (
            <>
              <span className="text-5xl font-bold text-white">GH₵{price}</span>
              <span className="ml-2 text-gray-300">/bundle</span>
            </>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => handleGuestOrder(bundle.id)}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold mb-8 transition transform hover:scale-105 ${
            meta.highlight
              ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-slate-900 hover:shadow-lg hover:shadow-emerald-400/50'
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
          }`}
        >
          <ShoppingCart size={16} /> Order Now
        </button>

        {/* Items */}
        {bundle.items && bundle.items.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">What's Included</h4>
            {bundle.items.map((item: string, i: number) => (
              <div key={i} className="flex gap-3 items-start">
                <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLockedCard = (bundle: any, idx: number) => (
    <div
      key={bundle.id}
      className="relative rounded-2xl overflow-hidden animate-in"
      style={{ animationDelay: `${0.45 + idx * 0.15}s` }}
    >
      <div className="blur-sm pointer-events-none select-none bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-400/30 text-blue-200">
            Members Only
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-lg">
            <Lock className="text-white" size={24} />
          </div>
        </div>

        {bundle.image_url && (
          <div className="w-full h-48 mb-6 rounded-xl overflow-hidden">
            <img src={bundle.image_url} alt="Locked bundle" className="w-full h-full object-cover" />
          </div>
        )}

        <h3 className="text-3xl font-bold mb-2 text-white">??? Bundle</h3>
        <p className="mb-6 text-sm text-gray-300">Sign up to reveal this exclusive bundle</p>

        <div className="mb-6">
          <span className="text-5xl font-bold text-white">GH₵ —</span>
        </div>

        <div className="h-12 w-full rounded-xl bg-white/10 mb-8" />

        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 items-start">
              <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="h-4 bg-white/20 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] rounded-2xl">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 pulse-slow shadow-lg shadow-purple-500/40">
            <Lock className="text-white" size={28} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Members Only Bundle</h3>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            Create a free account to unlock this bundle and all our exclusive offers.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-purple-500/50 text-white font-semibold px-6 py-3 rounded-xl transition transform hover:scale-105"
          >
            Sign Up Free <ArrowRight size={16} />
          </Link>
          <p className="text-gray-400 text-xs mt-3">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-300 hover:text-purple-200 font-medium transition">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );

  // ───────────────────────────────────────────────────────────────────────────

  // Conditional Rendering based on Auth State
  if (!user) {
    return (
      <>
        <SEO
          title="Our Bundles | Student Food Bundle System"
          description="Choose from our premium food bundles tailored for every budget. Alpha, Beta, and Gamma food bundles available. Sign up to unlock exclusive member bundles."
          canonical="https://www.food-bundle.com/bundles"
        />
        <style>{styles}</style>

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-6 animate-in">
              <h1 className="text-5xl font-bold text-white mb-4">Food Bundles</h1>
              <p className="text-xl text-gray-300">Choose the perfect bundle for your household</p>
              <p className="text-gray-400 mt-2">Order now — no account required for the bundles below</p>
            </div>

            {!loading && lockedBundles.length > 0 && (
              <div className="mb-10 animate-in" style={{ animationDelay: '0.1s' }}>
                <div className="bg-gradient-to-r from-violet-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Lock className="text-purple-300 flex-shrink-0" size={20} />
                    <p className="text-purple-100 font-medium text-sm">
                      <span className="font-bold text-white">{lockedBundles.length} more exclusive bundle{lockedBundles.length > 1 ? 's' : ''}</span> available to members — sign up free to unlock them all.
                    </p>
                  </div>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-xl transition transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/40 whitespace-nowrap text-sm"
                  >
                    Unlock All <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white/10 border border-white/10 rounded-2xl p-8 animate-pulse h-96" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {previewBundles.map((bundle, idx) => renderPreviewCard(bundle, idx))}
              </div>
            )}

            {!loading && lockedBundles.length > 0 && (
              <>
                <div className="flex items-center gap-4 my-8 animate-in" style={{ animationDelay: '0.4s' }}>
                  <div className="flex-1 h-px bg-white/10" />
                  <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold">
                    <Lock size={14} />
                    Member-Exclusive Bundles
                    <Lock size={14} />
                  </div>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                  {lockedBundles.map((bundle, idx) => renderLockedCard(bundle, idx))}
                </div>
              </>
            )}

            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center animate-in" style={{ animationDelay: '0.6s' }}>
              <h2 className="text-3xl font-bold text-white mb-4">Quality Guaranteed</h2>
              <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                All our food bundles are carefully curated with premium staple items to ensure quality and freshness.
                Every bundle is delivered directly to your doorstep with care and reliability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105"
                >
                  Have Questions? <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition border border-white/20"
                >
                  Create Account <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.7s' }}>
                <h4 className="text-lg font-bold text-white mb-3">Alpha — Premium Bundle</h4>
                <p className="text-gray-300 text-sm mb-4">Our most comprehensive bundle with all essential items including spaghetti and variety proteins.</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• 7 categories of items</li>
                  <li>• Best for families</li>
                  <li>• Maximum variety</li>
                </ul>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.8s' }}>
                <h4 className="text-lg font-bold text-emerald-400 mb-3">Beta — Popular Bundle</h4>
                <p className="text-gray-300 text-sm mb-4">Balanced selection with the most requested items at a popular price point.</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• 5 categories of items</li>
                  <li>• Best sellers choice</li>
                  <li>• Great value</li>
                </ul>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.9s' }}>
                <h4 className="text-lg font-bold text-amber-400 mb-3">Gamma — Essential Bundle</h4>
                <p className="text-gray-300 text-sm mb-4">Our most affordable bundle with essential staples and flexible protein options.</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• 4 categories of items</li>
                  <li>• Budget-friendly</li>
                  <li>• All essentials covered</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
