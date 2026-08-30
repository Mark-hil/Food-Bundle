import { useState, useEffect, useMemo } from 'react';
import { supabase, Bundle } from '../../lib/supabase';
import { Plus, Package, CreditCard as Edit2, Trash2, X, Eye, EyeOff, Lock, Rocket, CheckCircle2 } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import { sortBundlesWithAlphaBetaGamma } from '../../lib/bundleUtils';

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    items: '',
    available: false, // Default to false (Draft) for best practice safety
    delivery_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
  });
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [customOptions, setCustomOptions] = useState<{category: string, options: string[], required: boolean, maxSelections: number}[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{name: string, price: number}[]>([]);

  useEffect(() => {
    loadBundles();
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const { data } = await supabase.from('inventory_items').select('name, price').order('name');
      if (data) setInventoryItems(data);
    } catch (e) {
      console.error('Error loading inventory items', e);
    }
  };

  // Auto-calculate price from selected inventory items
  const recalculatePrice = (itemsString: string) => {
    const itemNames = itemsString.split(',').map(i => i.trim()).filter(Boolean);
    let total = 0;
    itemNames.forEach(name => {
      const found = inventoryItems.find(inv => inv.name.toLowerCase() === name.toLowerCase());
      if (found) total += Number(found.price);
    });
    return total;
  };

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



  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const sorted = sortBundlesWithAlphaBetaGamma(data || []);
      setBundles(sorted);
    } catch (error) {
      console.error('Error loading bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      setIsCustomizable(bundle.is_customizable || false);
      setCustomOptions(bundle.customization_options || []);
    } else {
      setEditingBundle(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        image_url: '',
        items: '',
        available: false, // Default to false (Draft) for best practice safety
        delivery_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      });
      setIsCustomizable(false);
      setCustomOptions([]);
    }
    setShowModal(true);
  };

  const handleSaveWithPublishState = async (publishLive: boolean) => {
    if (!formData.name.trim()) {
      alert('Please enter a package name');
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      alert('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    const bundleData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      image_url: formData.image_url || null,
      items: formData.items.split(',').map((item) => item.trim()).filter(Boolean),
      available: publishLive,
      delivery_days: formData.delivery_days.split(',').map((day) => day.trim()),
      is_customizable: isCustomizable,
      customization_options: isCustomizable ? customOptions.map(opt => ({
        ...opt,
        options: opt.options.filter(o => o.trim() !== '')
      })) : [],
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

      setToastMessage({
        type: publishLive ? 'success' : 'info',
        text: publishLive 
          ? `🚀 Package "${formData.name}" published LIVE! Visible to students and guests.`
          : `🔒 Package "${formData.name}" saved as DRAFT (Hidden from consumers until published).`
      });

      setShowModal(false);
      loadBundles();
    } catch (error: any) {
      console.error('Error saving bundle:', error);
      alert(`Failed to save bundle: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    try {
      const { error } = await supabase.from('bundles').delete().eq('id', id);

      if (error) throw error;
      setToastMessage({
        type: 'info',
        text: '🗑️ Package deleted successfully.'
      });
      loadBundles();
    } catch (error) {
      console.error('Error deleting bundle:', error);
      alert('Failed to delete bundle');
    }
  };

  const toggleBundleVisibility = async (bundleId: string, currentAvailable: boolean) => {
    try {
      setActionLoading(bundleId);
      const { error } = await supabase
        .from('bundles')
        .update({ available: !currentAvailable })
        .eq('id', bundleId);

      if (error) throw error;
      setBundles(prev => prev.map(b => b.id === bundleId ? { ...b, available: !currentAvailable } : b));
      
      const targetBundle = bundles.find(b => b.id === bundleId);
      const name = targetBundle?.name || 'Package';
      setToastMessage({
        type: !currentAvailable ? 'success' : 'info',
        text: !currentAvailable
          ? `🚀 "${name}" is now published LIVE to students and guests!`
          : `🔒 "${name}" moved to Draft mode (Hidden from consumers).`
      });
    } catch (err: any) {
      alert(`Failed to update bundle visibility: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBundles = useMemo(() => {
    if (visibilityFilter === 'visible') return bundles.filter(b => b.available);
    if (visibilityFilter === 'hidden') return bundles.filter(b => !b.available);
    return bundles;
  }, [bundles, visibilityFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Toast Feedback Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-3xl border flex items-center justify-between shadow-xl animate-in fade-in duration-300 ${
          toastMessage.type === 'success' 
            ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-emerald-100 border-emerald-500/40' 
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-amber-100 border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${toastMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide">{toastMessage.text}</p>
            </div>
          </div>
          <button 
            onClick={() => setToastMessage(null)} 
            className="text-white/60 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Visibility Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Manage Food Packages</h2>
          <p className="text-xs text-slate-500 mt-0.5">Control which food bundles appear on the consumer menu</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Visibility Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                visibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({bundles.length})
            </button>
            <button
              onClick={() => setVisibilityFilter('visible')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                visibilityFilter === 'visible' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visible ({bundles.filter(b => b.available).length})</span>
            </button>
            <button
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                visibilityFilter === 'hidden' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden ({bundles.filter(b => !b.available).length})</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Package</span>
          </button>
        </div>
      </div>

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBundles.map((bundle) => (
          <div 
            key={bundle.id} 
            className={`bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border flex flex-col relative ${
              bundle.available ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/40 opacity-90'
            }`}
          >
            {/* Image & Overlay Tag */}
            <div className="h-48 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden relative">
              {bundle.image_url ? (
                <img src={bundle.image_url} alt={bundle.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-16 h-16 text-white opacity-80" />
              )}

              {/* Status Badge Over Image */}
              <div className="absolute top-3 right-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-lg backdrop-blur-md flex items-center gap-1.5 ${
                    bundle.available 
                      ? 'bg-emerald-600 text-white border border-emerald-400' 
                      : 'bg-slate-900/90 text-amber-300 border border-slate-700'
                  }`}
                >
                  {bundle.available ? (
                    <>
                      <Rocket className="w-3.5 h-3.5" />
                      <span>LIVE IN CATALOG</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>DRAFT / HIDDEN</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-grow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{bundle.name}</h3>
                  <p className="text-xl font-extrabold text-emerald-600 font-display mt-0.5">
                    GH₵ {Number(bundle.price).toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                {bundle.description || 'No package description provided.'}
              </p>

              {bundle.items && bundle.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {bundle.items.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {/* One-Click Visibility Toggle Action */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleBundleVisibility(bundle.id, bundle.available)}
                  disabled={actionLoading === bundle.id}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border active:scale-95 shadow-sm ${
                    bundle.available
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {actionLoading === bundle.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></div>
                  ) : bundle.available ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unpublish to Draft (Hide)</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5 text-white" />
                      <span>Publish Live to Students</span>
                    </>
                  )}
                </button>
              </div>

              {/* Edit & Delete Action Buttons */}
              <div className="flex gap-2 pt-1 mt-auto">
                <button
                  onClick={() => handleOpenModal(bundle)}
                  className="flex-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(bundle.id)}
                  className="bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-500 font-bold p-2 rounded-xl text-xs transition flex items-center justify-center"
                  title="Delete Package"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredBundles.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-900 text-base">No Packages in this Filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try switching to 'All Packages' or add a new bundle.</p>
          </div>
        )}
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

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveWithPublishState(formData.available);
              }} 
              className="p-6 space-y-5"
            >
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
                <ImageUpload 
                  value={formData.image_url} 
                  onChange={(url) => setFormData({ ...formData, image_url: url })} 
                  label="Package Image (Required for display)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Items (comma separated)
                </label>
                <textarea
                  value={formData.items}
                  onChange={(e) => {
                    const newItems = e.target.value;
                    const newPrice = recalculatePrice(newItems);
                    setFormData({ ...formData, items: newItems, price: newPrice > 0 ? newPrice.toFixed(2) : formData.price });
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50 mb-2"
                  rows={3}
                  placeholder="Rice, Chicken, Vegetables"
                />
                
                {inventoryItems.length > 0 && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 mb-2">Quick Add from Inventory:</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {inventoryItems.map((item, idx) => {
                        const currentItems = formData.items ? formData.items.split(',').map(i => i.trim()).filter(Boolean) : [];
                        const isSelected = currentItems.some(i => i.toLowerCase() === item.name.toLowerCase());
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              let newItemsList: string[];
                              if (isSelected) {
                                // Remove item
                                newItemsList = currentItems.filter(i => i.toLowerCase() !== item.name.toLowerCase());
                              } else {
                                // Add item
                                newItemsList = [...currentItems, item.name];
                              }
                              const newItemsStr = newItemsList.join(', ');
                              const newPrice = recalculatePrice(newItemsStr);
                              setFormData({ ...formData, items: newItemsStr, price: newPrice > 0 ? newPrice.toFixed(2) : formData.price });
                            }}
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                              isSelected
                                ? 'bg-green-100 border-green-400 text-green-800'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                            }`}
                          >
                            {isSelected ? '✓' : <Plus className="w-3 h-3 mr-1" />}
                            <span className="ml-1">{item.name}</span>
                            <span className="ml-1.5 text-[10px] opacity-70">GH₵{Number(item.price).toFixed(0)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Price with auto-calculated breakdown */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Price (GH₵)</label>
                {(() => {
                  const itemNames = formData.items ? formData.items.split(',').map(i => i.trim()).filter(Boolean) : [];
                  const matched = itemNames.map(name => {
                    const found = inventoryItems.find(inv => inv.name.toLowerCase() === name.toLowerCase());
                    return found ? { name: found.name, price: Number(found.price) } : null;
                  }).filter(Boolean) as { name: string; price: number }[];

                  return matched.length > 0 ? (
                    <div className="mb-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1.5">Auto-calculated Breakdown</p>
                      <div className="space-y-0.5">
                        {matched.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs text-green-800">
                            <span>{m.name}</span>
                            <span className="font-medium">GH₵ {m.price.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-bold text-green-900 pt-1.5 mt-1.5 border-t border-green-300">
                          <span>Total</span>
                          <span>GH₵ {matched.reduce((s, m) => s + m.price, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-slate-50"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Auto-calculated from inventory items. You can override manually.</p>
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

              {/* Publishing Status Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Publishing & Visibility Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, available: false })}
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
                    onClick={() => setFormData({ ...formData, available: true })}
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
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition text-xs order-3 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithPublishState(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm order-2 active:scale-95"
                >
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span>{editingBundle ? 'Update as Draft (Hidden)' : 'Save as Draft (Hidden)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithPublishState(true)}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 order-1 sm:order-3 active:scale-95"
                >
                  <Rocket className="w-4 h-4" />
                  <span>{editingBundle ? 'Update & Publish Live' : 'Publish Live to Students'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
