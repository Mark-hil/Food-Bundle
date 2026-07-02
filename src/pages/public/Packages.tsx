import { useState, useEffect } from 'react';
import { Check, ArrowRight, Zap, Crown, Rocket, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SEO from '../../components/SEO';

export default function Packages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .in('name', ['ALPHA', 'BETA', 'GAMMA'])
        .eq('available', true)
        .order('price', { ascending: false });

      if (error) throw error;
      setBundles(data || []);
    } catch (err) {
      console.error('Error loading bundles:', err);
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = (bundleId: string) => {
    if (user) {
      navigate(`/checkout?bundle=${bundleId}`);
    } else {
      navigate(`/guest-checkout?bundle=${bundleId}`);
    }
  };

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

  const packageDetails = [
    {
      name: 'ALPHA',
      displayName: 'Alpha',
      badge: 'Premium',
      icon: Zap,
      iconColor: 'from-blue-500 to-blue-600',
      items: [
        'CIC 25kg grain rice',
        'Sardine',
        'Two Frytol 500ml oil',
        'Ena pa spaghetti',
        'Tasty tom tomato paste',
        'A crate of egg',
        'Ena pa mackerel'
      ],
      highlight: false
    },
    {
      name: 'BETA',
      displayName: 'Beta',
      badge: 'Most Popular',
      icon: Crown,
      iconColor: 'from-emerald-500 to-emerald-600',
      items: [
        'CIC 25kg grain rice',
        'Two Frytol 500ml oil',
        'Ena pa mackerel / Sardine',
        'Tasty tom tomato paste',
        'A crate of egg'
      ],
      highlight: true
    },
    {
      name: 'GAMMA',
      displayName: 'Gamma',
      badge: 'Best Value',
      icon: Rocket,
      iconColor: 'from-amber-500 to-amber-600',
      items: [
        'CIC 25kg grain rice',
        'Two Frytol 500ml oil',
        'Ena pa mackerel / Sardine / Tasty tom tomato paste',
        'A crate of egg'
      ],
      highlight: false
    }
  ];

  const getBundleByName = (name: string) => bundles.find((b: any) => b.name === name);

  return (
    <>
      <SEO 
        title="Our Packages | Student Food Bundle System"
        description="Choose from our premium food bundles tailored for every budget. Alpha, Beta, and Gamma food bundles."
        canonical="https://www.food-bundle.com/packages"
      />
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 animate-in">
            <h1 className="text-5xl font-bold text-white mb-4">Food Bundle Packages</h1>
            <p className="text-xl text-gray-300">Choose the perfect bundle for your household</p>
            <p className="text-gray-400 mt-2">Order now - no account required</p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {packageDetails.map((pkg, idx) => {
              const Icon = pkg.icon;
              const bundle = getBundleByName(pkg.name);
              const price = bundle ? Number(bundle.price) : 0;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 animate-in backdrop-blur-xl border ${
                    pkg.highlight
                      ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-emerald-400/50 ring-2 ring-emerald-400 scale-105'
                      : 'bg-white/10 border-white/10 hover:border-blue-400/50'
                  }`}
                  style={{ animationDelay: `${0.1 + idx * 0.15}s` }}
                >
                  {/* Badge & Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      pkg.highlight
                        ? 'bg-emerald-400/30 text-emerald-200'
                        : 'bg-blue-400/30 text-blue-200'
                    }`}>
                      {pkg.badge}
                    </div>
                    <div className={`bg-gradient-to-br ${pkg.iconColor} p-2 rounded-lg`}>
                      <Icon className="text-white" size={24} />
                    </div>
                  </div>

                  {/* Image Display */}
                  {bundle?.image_url && (
                    <div className="w-full h-48 mb-6 rounded-xl overflow-hidden relative group">
                      <img 
                        src={bundle.image_url} 
                        alt={pkg.displayName} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                    </div>
                  )}

                  <h3 className="text-3xl font-bold mb-2 text-white">{pkg.displayName}</h3>
                  <p className={`mb-6 text-sm ${pkg.highlight ? 'text-emerald-100' : 'text-gray-300'}`}>
                    {bundle ? bundle.description : `${pkg.badge} food bundle`}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    {loading ? (
                      <div className="h-14 w-32 bg-white/10 rounded-lg animate-pulse"></div>
                    ) : (
                      <>
                        <span className="text-5xl font-bold text-white">GH₵{price}</span>
                        <span className="ml-2 text-gray-300">/bundle</span>
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  {bundle ? (
                    <button
                      onClick={() => handleOrder(bundle.id)}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold mb-8 transition transform hover:scale-105 ${
                        pkg.highlight
                          ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-slate-900 hover:shadow-lg hover:shadow-emerald-400/50'
                          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                      }`}
                    >
                      <ShoppingCart size={16} />
                      Order Now
                    </button>
                  ) : (
                    <Link
                      to="/register"
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold mb-8 transition transform hover:scale-105 ${
                        pkg.highlight
                          ? 'bg-gradient-to-r from-emerald-400 to-blue-400 text-slate-900 hover:shadow-lg hover:shadow-emerald-400/50'
                          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                      }`}
                    >
                      Get Started <ArrowRight size={16} />
                    </Link>
                  )}

                  {/* Items List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">What's Included</h4>
                    {(bundle?.items || pkg.items).map((item: string, itemIdx: number) => (
                      <div key={itemIdx} className="flex gap-3 items-start">
                        <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center animate-in" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-3xl font-bold text-white mb-4">Quality Guaranteed</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              All our food bundles are carefully curated with premium staple items to ensure quality and freshness. Every bundle is delivered directly to your doorstep with care and reliability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
                Have Questions? <ArrowRight size={18} />
              </Link>
              {!user && (
                <Link to="/register" className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition border border-white/20">
                  Create Account <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </div>

          {/* Bundle Comparison Details */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.7s' }}>
              <h4 className="text-lg font-bold text-white mb-3">Alpha - Premium Bundle</h4>
              <p className="text-gray-300 text-sm mb-4">
                Our most comprehensive bundle with all essential items including spaghetti and variety proteins.
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• 7 categories of items</li>
                <li>• Best for families</li>
                <li>• Maximum variety</li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.8s' }}>
              <h4 className="text-lg font-bold text-emerald-400 mb-3">Beta - Popular Bundle</h4>
              <p className="text-gray-300 text-sm mb-4">
                Balanced selection with the most requested items at a popular price point.
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• 5 categories of items</li>
                <li>• Best sellers choice</li>
                <li>• Great value</li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 animate-in" style={{ animationDelay: '0.9s' }}>
              <h4 className="text-lg font-bold text-amber-400 mb-3">Gamma - Essential Bundle</h4>
              <p className="text-gray-300 text-sm mb-4">
                Our most affordable bundle with essential staples and flexible protein options.
              </p>
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
