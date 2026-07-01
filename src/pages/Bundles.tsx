import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../lib/supabase';
import { useNavigate } from '../lib/navigation';
import { ShoppingCart, Clock, CheckCircle, Star, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomizationModal from '../components/CustomizationModal';

interface BundleWithRating extends Bundle {
  averageRating?: number;
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

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load average ratings for each bundle
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

      // Reload bundles to update ratings
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
