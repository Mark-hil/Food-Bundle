import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CreditCard as Edit } from 'lucide-react';

export default function EditPackage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    items_per_week: '',
    image_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [customOptions, setCustomOptions] = useState<{category: string, options: string[], required: boolean, maxSelections: number}[]>([]);
  const packageId = location.pathname.split('/').pop();

  const addCustomCategory = () => {
    setCustomOptions([...customOptions, { category: '', options: [''], required: true, maxSelections: 1 }]);
  };

  const updateCustomCategory = (idx: number, field: string, value: any) => {
    const newOpts = [...customOptions];
    newOpts[idx] = { ...newOpts[idx], [field]: value };
    setCustomOptions(newOpts);
  };

  const addOption = (catIdx: number) => {
    const newOpts = [...customOptions];
    newOpts[catIdx].options.push('');
    setCustomOptions(newOpts);
  };

  const updateOption = (catIdx: number, optIdx: number, value: string) => {
    const newOpts = [...customOptions];
    newOpts[catIdx].options[optIdx] = value;
    setCustomOptions(newOpts);
  };

  const removeOption = (catIdx: number, optIdx: number) => {
    const newOpts = [...customOptions];
    newOpts[catIdx].options.splice(optIdx, 1);
    setCustomOptions(newOpts);
  };

  const removeCategory = (idx: number) => {
    const newOpts = [...customOptions];
    newOpts.splice(idx, 1);
    setCustomOptions(newOpts);
  };

  useEffect(() => {
    fetchPackage();
  }, [packageId]);

  const fetchPackage = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', packageId)
        .maybeSingle();

      if (queryError) throw queryError;
      if (data) {
        setFormData({
          name: data.name,
          description: data.description,
          price: (data.price / 100).toString(),
          duration_days: data.duration_days.toString(),
          items_per_week: data.items_per_week.toString(),
          image_url: data.image_url || '',
        });
        setIsCustomizable(data.is_customizable || false);
        setCustomOptions(data.customization_options || []);
      } else {
        setError('Package not found');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('bundles')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price) * 100,
          duration_days: parseInt(formData.duration_days) || 0,
          items_per_week: parseInt(formData.items_per_week) || 0,
          image_url: formData.image_url,
          is_customizable: isCustomizable,
          customization_options: isCustomizable ? customOptions.map(opt => ({
            ...opt,
            options: opt.options.filter(o => o.trim() !== '')
          })) : [],
        })
        .eq('id', packageId);

      if (updateError) throw updateError;
      navigate('/admin/packages');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading package...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/admin/packages')}
        className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Packages
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
          <div className="flex items-center mb-8">
            <Edit className="w-6 h-6 text-green-600 mr-3" />
            <h1 className="text-2xl font-semibold text-slate-900">Edit Package</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Package Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="e.g., Basic Meal Plan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Describe the package..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price (GH₵)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  name="duration_days"
                  value={formData.duration_days}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Items Per Week
              </label>
              <input
                type="number"
                name="items_per_week"
                value={formData.items_per_week}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="5"
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="isCustomizable"
                  checked={isCustomizable}
                  onChange={(e) => setIsCustomizable(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                />
                <label htmlFor="isCustomizable" className="ml-2 block text-sm font-medium text-slate-700">
                  Enable Customization for this Package
                </label>
              </div>

              {isCustomizable && (
                <div className="space-y-6">
                  {customOptions.map((cat, catIdx) => (
                    <div key={catIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-slate-800">Category {catIdx + 1}</h4>
                        <button type="button" onClick={() => removeCategory(catIdx)} className="text-red-500 text-sm hover:text-red-700">Remove</button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Category Name</label>
                          <input type="text" value={cat.category} onChange={e => updateCustomCategory(catIdx, 'category', e.target.value)} placeholder="e.g., Protein" className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Max Selections</label>
                            <input type="number" min="1" value={cat.maxSelections} onChange={e => updateCustomCategory(catIdx, 'maxSelections', parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm" />
                          </div>
                          <div className="flex items-center mt-6">
                            <input type="checkbox" checked={cat.required} onChange={e => updateCustomCategory(catIdx, 'required', e.target.checked)} id={`req-${catIdx}`} className="w-3.5 h-3.5 text-green-600 rounded border-slate-300" />
                            <label htmlFor={`req-${catIdx}`} className="ml-1 text-xs text-slate-600">Required</label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-600">Options</label>
                        {cat.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input type="text" value={opt} onChange={e => updateOption(catIdx, optIdx, e.target.value)} placeholder="Option name" className="flex-1 px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm" />
                            <button type="button" onClick={() => removeOption(catIdx, optIdx)} className="text-slate-400 hover:text-red-500 px-2">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addOption(catIdx)} className="text-xs text-green-600 font-medium hover:text-green-700 mt-2">+ Add Option</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addCustomCategory} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-green-500 hover:text-green-600 transition font-medium text-sm">
                    + Add Customization Category
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium py-2 rounded-xl transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/packages')}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-2 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
