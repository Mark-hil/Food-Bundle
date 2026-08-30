import { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, ArrowRight, Eye, EyeOff, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from '../lib/navigation';

export default function Register() {
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const { signUp } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const nameParam = params.get('name');
    const phoneParam = params.get('phone');
    const redirectParam = params.get('redirect');

    if (emailParam) setEmail(emailParam);
    if (nameParam) setFullName(nameParam);
    if (phoneParam) setPhone(phoneParam);
    if (redirectParam && redirectParam.includes('/track/')) {
      const parts = redirectParam.split('/track/');
      if (parts[1]) setTrackingOrderId(parts[1].slice(0, 8).toUpperCase());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, phone, studentId);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md animate-in">
          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
            {/* Tracking banner if coming from guest order */}
            {trackingOrderId && !success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Package size={18} />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white">Track Order #{trackingOrderId}</p>
                  <p className="text-slate-300">Set your password to track live delivery and driver ETA.</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                {success ? 'Check Your Email' : 'Create Account'}
              </h1>
              <p className="text-gray-300">
                {success ? "We've sent a verification link to your inbox" : 'Join Food Bundle System'}
              </p>
            </div>

            {success ? (
              <div className="text-center animate-in" style={{ animationDelay: '0.1s' }}>
                <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-6 mb-8">
                  <Mail className="mx-auto text-emerald-400 mb-4" size={48} />
                  <p className="text-emerald-100 text-lg mb-2 font-medium">Registration successful!</p>
                  <p className="text-emerald-100/80 text-sm">
                    Please click the link sent to <strong className="text-white">{email}</strong> to verify your account before logging in.
                  </p>
                </div>
                <Link to="/login" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition border border-white/10">
                  Return to Login <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm animate-in">
                    {error}
                  </div>
                )}

                {/* Full Name */}
                <div className="animate-in" style={{ animationDelay: '0.1s' }}>
                  <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 text-blue-400" size={20} />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                {/* Student ID */}
                <div className="animate-in" style={{ animationDelay: '0.15s' }}>
                  <label htmlFor="studentId" className="block text-sm font-medium text-white mb-2">
                    Student ID
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                    placeholder="UEB1234567"
                  />
                </div>

                {/* Email */}
                <div className="animate-in" style={{ animationDelay: '0.2s' }}>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
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
                      placeholder="you@gmail.com"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="animate-in" style={{ animationDelay: '0.25s' }}>
                  <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                    Phone Number 
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-blue-400" size={20} />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                      placeholder="0244123456"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="animate-in" style={{ animationDelay: '0.3s' }}>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-blue-400" size={20} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters</p>
                </div>

                {/* Confirm Password */}
                <div className="animate-in" style={{ animationDelay: '0.35s' }}>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-blue-400" size={20} />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 animate-in mt-6 flex items-center justify-center gap-2"
                  style={{ animationDelay: '0.4s' }}
                >
                  {loading ? 'Creating account...' : (
                    <>
                      Create Account <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Sign In Link */}
            {!success && (
              <div className="mt-6 text-center animate-in" style={{ animationDelay: '0.45s' }}>
                <p className="text-gray-300">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}