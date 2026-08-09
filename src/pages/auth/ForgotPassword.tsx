import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const styles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-in">
          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">

            {/* Back Link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition mb-8 text-sm font-medium"
            >
              <ArrowLeft size={18} /> Back to Login
            </Link>

            {submitted ? (
              /* Success State */
              <div className="text-center animate-in">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-emerald-400" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Check Your Email</h1>
                <p className="text-gray-300 mb-2">
                  We've sent a password reset link to:
                </p>
                <p className="text-blue-400 font-semibold mb-6">{email}</p>
                <p className="text-gray-400 text-sm mb-8">
                  The link expires in 24 hours. If you don't see it, check your spam folder.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setEmail(''); }}
                  className="w-full bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold text-white mb-2">Forgot Password?</h1>
                  <p className="text-gray-300">
                    No worries — enter your email and we'll send you a reset link.
                  </p>
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
                        placeholder="your@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 animate-in flex items-center justify-center gap-2"
                    style={{ animationDelay: '0.2s' }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center animate-in" style={{ animationDelay: '0.3s' }}>
                  <p className="text-gray-300">
                    Remember your password?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
