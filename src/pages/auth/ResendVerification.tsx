import { Mail, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      if (resendError) throw resendError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} /> Back to Login
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Resend Verification Email</h1>
        <p className="text-slate-600 mb-8">Enter your email address to receive a new verification link.</p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <Mail className="text-green-600 mx-auto mb-4" size={32} />
            <h2 className="font-semibold text-slate-900 mb-2">Verification email sent</h2>
            <p className="text-slate-600 text-sm">Check your email and click the verification link to confirm your account.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
