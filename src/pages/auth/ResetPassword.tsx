import { Lock, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  // const location = useLocation();
  // const searchParams = new URLSearchParams(location.pathname.split('?')[1]);
  // const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Password</h1>
        <p className="text-slate-600 mb-8">Enter your new password below.</p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <Lock className="text-green-600 mx-auto mb-4" size={32} />
            <h2 className="font-semibold text-slate-900 mb-2">Password reset successful</h2>
            <p className="text-slate-600 text-sm mb-6">You can now log in with your new password.</p>
            <Link to="/login" className="inline-block bg-blue-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                placeholder="Confirm password"
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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
