import { useState, useEffect } from 'react';
import { ArrowRight, Package, Zap, Shield, Clock, CheckCircle } from 'lucide-react';
import { Link } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

export default function Home() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .in('name', ['ALPHA', 'BETA', 'GAMMA'])
        .eq('available', true)
        .order('price', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading packages:', err);
      setPackages([]);
    } finally {
      setLoading(false);
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
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
    .animate-slide {
      animation: slideInRight 0.6s ease-out forwards;
    }
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
  `;

  return (
    <>
      <SEO 
        title="Home | Student Food Bundle System"
        description="Fresh, nutritious meal bundles crafted for students. Order today and enjoy convenient delivery right to your location."
        canonical="https://www.food-bundle.com/"
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Student Food Bundle System",
          "url": "https://www.food-bundle.com/",
          "logo": "https://www.food-bundle.com/vite.svg",
          "description": "Fresh, nutritious meal bundles crafted for students."
        }}
      />
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 opacity-50"></div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
            <div className="text-center mb-16">
              <h1 className="text-6xl font-bold text-white mb-6 animate-in" style={{ animationDelay: '0.1s' }}>
                Quality Meals Delivered
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  to Your Door
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto animate-in" style={{ animationDelay: '0.2s' }}>
                Fresh, nutritious meal bundles crafted for students. Order today and enjoy convenient delivery right to your location.
              </p>
              <div className="flex gap-4 justify-center animate-in" style={{ animationDelay: '0.3s' }}>
                {user ? (
                  <Link to="/packages" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
                    Browse Bundles <ArrowRight size={20} />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
                      Get Started <ArrowRight size={20} />
                    </Link>
                    <Link to="/login" className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition border border-white/20">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mt-20">
              {[
                { icon: Package, label: 'Fresh Meals', value: '100%' },
                { icon: Clock, label: 'Quick Delivery', value: '24-48h' },
                { icon: Shield, label: 'Secure Payment', value: 'Verified' },
                { icon: Zap, label: 'Affordable', value: 'GH₵ 420+' }
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
          </div>
        </div>

        {/* Featured Packages Section */}
        <div className="py-24 relative z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4 animate-in" style={{ animationDelay: '0s' }}>
                Our Featured Packages
              </h2>
              <p className="text-gray-400 animate-in" style={{ animationDelay: '0.1s' }}>
                Choose from our three premium food bundles tailored for every budget
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id}
                    className="group animate-in flex"
                    style={{ animationDelay: `${0.2 + idx * 0.15}s` }}
                  >
                    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 cursor-pointer flex flex-col relative">
                      {/* Badge */}
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
                        {pkg.name === 'ALPHA' && '⭐ Premium'}
                        {pkg.name === 'BETA' && '⭐ Popular'}
                        {pkg.name === 'GAMMA' && '⭐ Essential'}
                      </div>

                      {/* Image Display */}
                      {pkg.image_url && (
                        <div className="w-full h-48 overflow-hidden relative">
                          <img 
                            src={pkg.image_url} 
                            alt={pkg.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        </div>
                      )}

                      <div className="p-8 flex flex-col flex-grow relative">
                        {/* Header */}
                        <div className="mb-4">
                          <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2">{pkg.description}</p>
                        </div>

                        {/* Items List */}
                        <div className="mb-6 bg-white/5 p-4 rounded-lg flex-grow">
                          <p className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">Includes</p>
                          <ul className="space-y-2">
                            {Array.isArray(pkg.items) && pkg.items.map((item: string, i: number) => (
                              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Price */}
                        <div className="mb-6 pb-6 border-b border-white/10 mt-auto">
                          <p className="text-gray-400 text-xs mb-1">Price</p>
                          <p className="text-4xl font-bold text-white">
                            GH₵ {Number(pkg.price).toFixed(0)}
                          </p>
                        </div>

                        {/* Action Button */}
                        {user ? (
                          <Link
                            to={`/checkout?bundle=${pkg.id}`}
                            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 font-semibold transition transform hover:scale-105 text-center block"
                          >
                            Order Now
                          </Link>
                        ) : (
                          <Link
                            to="/register"
                            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 font-semibold transition transform hover:scale-105 text-center block"
                          >
                            Sign Up to Order
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">Ready to Start Ordering?</h3>
            <p className="text-gray-400 mb-8">Join thousands of students enjoying fresh, convenient meals every day</p>
            {user ? (
              <Link to="/packages" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
                Browse All Meals <ArrowRight size={20} />
              </Link>
            ) : (
              <Link to="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
                Create Free Account <ArrowRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}