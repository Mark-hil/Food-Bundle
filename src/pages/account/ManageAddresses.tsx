import { ArrowLeft, MapPin, Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function ManageAddresses() {
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      label: 'Campus - Hall 5',
      address: 'Hall 5, Student Hostel, Campus',
      isDefault: true
    },
    {
      id: 2,
      label: 'Off-Campus Apartment',
      address: 'Apt 12, Block C, Legon Community',
      isDefault: false
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ label: '', address: '', isDefault: false });

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const newAddress = {
      id: addresses.length + 1,
      ...formData
    };
    setAddresses([...addresses, newAddress]);
    setFormData({ label: '', address: '', isDefault: false });
    setShowForm(false);
  };

  const handleDeleteAddress = (id: number) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  return (
    <div className="space-y-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Profile
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Manage Addresses</h1>
          <p className="text-slate-600 mt-2">Add, edit, or remove delivery addresses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          <Plus size={20} /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Address</h3>
          <form onSubmit={handleAddAddress} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">Address Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                placeholder="e.g., Campus Hall 5"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-2">Full Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                placeholder="Enter full delivery address"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-slate-700">Set as default address</span>
            </label>

            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
                Add Address
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-900 font-semibold py-2 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {addresses.map(addr => (
          <div key={addr.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={20} className="text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">{addr.label}</h3>
                  {addr.isDefault && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-slate-600">{addr.address}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
