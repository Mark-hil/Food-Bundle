import { ArrowLeft, Lock, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });
      if (updateError) throw updateError;
      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Profile
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900">Change Password</h1>
        <p className="text-slate-600 mt-2">Update your password to keep your account secure</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-2">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="At least 8 characters"
            />
            <p className="text-slate-600 text-sm mt-2">Use a mix of uppercase, lowercase, and numbers for security</p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="Confirm your new password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Lock size={18} /> Password changed successfully!
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} /> {loading ? 'Updating...' : 'Update Password'}
            </button>
            <Link
              to="/profile"
              className="flex-1 bg-slate-100 text-slate-900 font-semibold py-3 rounded-lg hover:bg-slate-200 transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
