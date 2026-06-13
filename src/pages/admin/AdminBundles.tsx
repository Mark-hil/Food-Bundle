import { useState, useEffect } from 'react';
import { supabase, Bundle } from '../../lib/supabase';
import { Plus, Package, CreditCard as Edit2, Trash2, X } from 'lucide-react';

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    items: '',
    available: true,
    delivery_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
  });

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBundles(data || []);
    } catch (error) {
      console.error('Error loading bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (bundle?: Bundle) => {
    if (bundle) {
      setEditingBundle(bundle);
      setFormData({
        name: bundle.name,
        description: bundle.description || '',
        price: bundle.price.toString(),
        image_url: bundle.image_url || '',
        items: bundle.items?.join(', ') || '',
        available: bundle.available,
        delivery_days: bundle.delivery_days?.join(',') || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      });
    } else {
      setEditingBundle(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        image_url: '',
        items: '',
        available: true,
        delivery_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bundleData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      image_url: formData.image_url || null,
      items: formData.items.split(',').map((item) => item.trim()).filter(Boolean),
      available: formData.available,
      delivery_days: formData.delivery_days.split(',').map((day) => day.trim()),
    };

    try {
      if (editingBundle) {
        const { error } = await supabase
          .from('bundles')
          .update(bundleData)
          .eq('id', editingBundle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('bundles').insert(bundleData);

        if (error) throw error;
      }

      setShowModal(false);
      loadBundles();
    } catch (error) {
      console.error('Error saving bundle:', error);
      alert('Failed to save bundle');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    try {
      const { error } = await supabase.from('bundles').delete().eq('id', id);

      if (error) throw error;
      loadBundles();
    } catch (error) {
      console.error('Error deleting bundle:', error);
      alert('Failed to delete bundle');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-8">
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Bundle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <div key={bundle.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 flex flex-col">
            <div className="h-48 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center overflow-hidden">
              {bundle.image_url ? (
                <img src={bundle.image_url} alt={bundle.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-16 h-16 text-white opacity-80" />
              )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex-1">{bundle.name}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                    bundle.available ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {bundle.available ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {bundle.description || 'No description'}
              </p>

              <p className="text-xl font-bold text-green-600 mb-4">
                GH₵ {Number(bundle.price).toFixed(2)}
              </p>

              {bundle.items && bundle.items.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {bundle.items.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                      {item}
                    </span>
                  ))}
                  {bundle.items.length > 3 && (
                    <span className="inline-flex items-center bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                      +{bundle.items.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleOpenModal(bundle)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg transition flex items-center justify-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(bundle.id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium px-4 py-2 rounded-lg transition flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingBundle ? 'Edit Bundle' : 'Add New Bundle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Bundle Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Price (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Items (comma separated)
                </label>
                <textarea
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  rows={3}
                  placeholder="Rice, Chicken, Vegetables"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Delivery Days (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                />
                <label htmlFor="available" className="ml-2 text-sm font-medium text-gray-900">
                  Available for purchase
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  {editingBundle ? 'Update Bundle' : 'Create Bundle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
