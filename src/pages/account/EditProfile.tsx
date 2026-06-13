import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function EditProfile() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    avatar: ''
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Profile
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900">Edit Profile</h1>
        <p className="text-slate-600 mt-2">Update your personal information</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-2">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              disabled
            />
            <p className="text-slate-600 text-sm mt-2">Email cannot be changed here. Contact support if you need to update it.</p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              placeholder="+233 XXX XXX XXXX"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-2">Profile Picture</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                name="avatar"
                onChange={handleChange}
                className="hidden"
                id="avatar-input"
                accept="image/*"
              />
              <label htmlFor="avatar-input" className="cursor-pointer">
                <p className="text-slate-600">Click to upload or drag and drop</p>
                <p className="text-slate-500 text-sm">PNG, JPG up to 5MB</p>
              </label>
            </div>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              Profile updated successfully!
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Save size={20} /> Save Changes
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
