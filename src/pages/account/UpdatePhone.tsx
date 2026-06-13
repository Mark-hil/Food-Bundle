import { ArrowLeft, Phone, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function UpdatePhone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSuccess(true);
      setPhone('');
      setLoading(false);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Profile
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900">Update Phone Number</h1>
        <p className="text-slate-600 mt-2">Add or update your phone number for delivery notifications</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="+233 55 123 4567"
            />
            <p className="text-slate-600 text-sm mt-2">Include your country code (e.g., +233 for Ghana)</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Phone size={18} /> Phone number updated successfully!
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} /> {loading ? 'Updating...' : 'Update Phone'}
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
