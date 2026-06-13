import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from '../lib/navigation';

export default function Login() {
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error, role } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-in">
          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-300">Sign in to order your food bundles</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm animate-in">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="animate-in" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-blue-400" size={20} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                    placeholder="you@uenr.edu.gh"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="animate-in" style={{ animationDelay: '0.2s' }}>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-3">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-blue-400" size={20} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 animate-in flex items-center justify-center gap-2"
                style={{ animationDelay: '0.3s' }}
              >
                {loading ? 'Signing in...' : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center animate-in" style={{ animationDelay: '0.4s' }}>
              <p className="text-gray-300">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}