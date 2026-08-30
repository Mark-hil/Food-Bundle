import { useState, useEffect } from 'react';
import { useNavigate } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Lock, Rocket } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

export default function CreatePackage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    items_per_week: '',
    image_url: '',
    available: false, // Default to Draft for best practice safety
  });
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [customOptions, setCustomOptions] = useState<{category: string, options: string[], required: boolean, maxSelections: number}[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{name: string, price: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    const loadInventory = async () => {
      try {
        const { data } = await supabase.from('inventory_items').select('name, price').order('name');
        if (data) setInventoryItems(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadInventory();
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveWithPublishState = async (publishLive: boolean) => {
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('bundles')
        .insert([{
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseInt(formData.price) * 100,
          duration_days: parseInt(formData.duration_days) || 0,
          items_per_week: parseInt(formData.items_per_week) || 0,
          image_url: formData.image_url,
          available: publishLive,
          is_customizable: isCustomizable,
          customization_options: isCustomizable ? customOptions.map(opt => ({
            ...opt,
            options: opt.options.filter(o => o.trim() !== '')
          })) : [],
        }]);

      if (insertError) throw insertError;
      navigate('/admin/packages');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <Plus className="w-6 h-6 text-green-600 mr-3" />
            <h1 className="text-2xl font-semibold text-slate-900">Create New Package</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
              {error}
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveWithPublishState(formData.available);
            }} 
            className="space-y-6"
          >
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
                placeholder="e.g. ALPHA, BETA, PREMIUM PACK"
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
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Describe what's in this package and its benefits"
              />
            </div>

            <div>
              <ImageUpload 
                value={formData.image_url} 
                onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))} 
                label="Package Image (Required for display)"
              />
            </div>

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
                min="0"
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
                min="1"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Items per Week
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

            {/* Publishing & Visibility Status Selector */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Publishing & Visibility Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setFormData(prev => ({ ...prev, available: false }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    !formData.available 
                      ? 'border-slate-800 bg-slate-900 text-white shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${!formData.available ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-500'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">Save as Draft</span>
                      {!formData.available && <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold">Selected</span>}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${!formData.available ? 'text-slate-300' : 'text-slate-400'}`}>
                      Hidden from students & guests. Perfect for preparing recipes before launching.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setFormData(prev => ({ ...prev, available: true }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    formData.available 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${formData.available ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">Publish Live</span>
                      {formData.available && <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">Live</span>}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${formData.available ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Instantly visible on the student ordering menu and guest checkout catalog.
                    </p>
                  </div>
                </div>
              </div>
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
                        
                        {inventoryItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Quick Add:</p>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {inventoryItems.map((item, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    // Find first empty option or add new one
                                    const emptyIdx = cat.options.findIndex(o => o.trim() === '');
                                    if (emptyIdx >= 0) {
                                      updateOption(catIdx, emptyIdx, item.name);
                                    } else {
                                      const newOpts = [...customOptions];
                                      newOpts[catIdx].options.push(item.name);
                                      setCustomOptions(newOpts);
                                    }
                                  }}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition"
                                >
                                  <Plus className="w-2.5 h-2.5 mr-0.5" />
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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

            {/* Action Buttons: Cancel, Save Draft, Publish Live */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/admin/packages')}
                disabled={loading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-5 rounded-xl transition text-xs order-3 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveWithPublishState(false)}
                disabled={loading}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm order-2 active:scale-95"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Save as Draft (Hidden)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveWithPublishState(true)}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 order-1 sm:order-3 active:scale-95"
              >
                <Rocket className="w-4 h-4" />
                <span>Publish Live to Students</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
