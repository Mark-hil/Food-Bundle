import { useState } from 'react';
import { Save, Building2, Truck } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'FoodBundle',
    supportEmail: 'support@foodbundle.com',
    phone: '+1 (555) 123-4567',
    deliveryCharge: '5.00',
    minOrderValue: '20.00',
    businessHours: '9:00 AM - 6:00 PM',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 flex items-start gap-3">
            <div className="w-5 h-5 flex-shrink-0 mt-0.5">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="flex items-center mb-6">
                <Building2 className="w-5 h-5 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Business Information</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    name="siteName"
                    value={settings.siteName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    value={settings.supportEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={settings.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    name="businessHours"
                    value={settings.businessHours}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="e.g., 9:00 AM - 6:00 PM"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-6">
                <Truck className="w-5 h-5 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Delivery Settings</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Delivery Charge (GH₵)
                  </label>
                  <input
                    type="number"
                    name="deliveryCharge"
                    value={settings.deliveryCharge}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Order Value (GH₵)
                  </label>
                  <input
                    type="number"
                    name="minOrderValue"
                    value={settings.minOrderValue}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium rounded-xl transition"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
