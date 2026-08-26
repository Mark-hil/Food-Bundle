import React, { useState, useEffect } from 'react';
import { supabase, InventoryItem } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Search, PackageSearch, Upload } from 'lucide-react';
import Papa from 'papaparse';

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    stock_quantity: '0',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        price: item.price.toString(),
        category: item.category || '',
        stock_quantity: item.stock_quantity.toString(),
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        price: '',
        category: '',
        stock_quantity: '0',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category || null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert(itemData);

        if (error) throw error;
      }

      setShowModal(false);
      loadItems();
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      alert(`Failed to save inventory item: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);

      if (error) throw error;
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete inventory item');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const itemsToInsert = results.data.map((row: any) => ({
            name: row.name,
            category: row.category || null,
            price: parseFloat(row.price) || 0,
            stock_quantity: parseInt(row.stock_quantity) || 0
          }));
          
          if (itemsToInsert.length === 0) {
            alert('No valid data found in CSV.');
            setUploadingCsv(false);
            return;
          }

          const { error } = await supabase.from('inventory_items').insert(itemsToInsert);
          
          if (error) throw error;
          
          alert(`Successfully uploaded ${itemsToInsert.length} items!`);
          loadItems();
        } catch (error: any) {
          console.error('Error uploading CSV:', error);
          alert(`Failed to upload CSV: ${error?.message || 'Unknown error'}`);
        } finally {
          setUploadingCsv(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        alert('Failed to parse CSV file.');
        setUploadingCsv(false);
        e.target.value = '';
      }
    });
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const categories = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-green-600"></div>
          <p className="text-slate-500 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
        <p className="text-slate-500 mt-1">Manage your products, pricing, and stock levels.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-[400px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all sm:text-sm shadow-sm"
          />
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className={`cursor-pointer ${uploadingCsv ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'} border shadow-sm font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 w-full sm:w-auto`}>
            {uploadingCsv ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-sm">{uploadingCsv ? 'Uploading...' : 'Import CSV'}</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={uploadingCsv}
            />
          </label>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20 font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 pl-6 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Price (GH₵)</th>
                <th className="p-4 font-semibold">Stock Status</th>
                <th className="p-4 pr-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100">
                        <PackageSearch className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-slate-900 font-medium mb-1">No products found</h3>
                      <p className="text-slate-500 text-sm">
                        {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-slate-700 border-y border-slate-200">
                        {category}
                      </td>
                    </tr>
                    {groupedItems[category].map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200/60 mr-4">
                              <span className="font-semibold text-sm">{item.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">ID: {item.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {item.category ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm italic">Uncategorized</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900">
                            {Number(item.price).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            {item.stock_quantity === 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                                Out of stock
                              </span>
                            ) : item.stock_quantity <= 10 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                                Low stock ({item.stock_quantity})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                In stock ({item.stock_quantity})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingItem ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingItem ? 'Update the details of this product' : 'Enter the details for the new product'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                  placeholder="e.g. CIC 25kg grain rice"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (GH₵)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 sm:text-sm">GH₵</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-sm"
                  placeholder="e.g. Grains, Oils, Canned"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/20 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
                >
                  {editingItem ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
