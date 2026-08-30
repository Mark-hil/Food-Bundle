import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Clock, 
  Building, 
  Truck, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export interface DeliveryZone {
  id: string;
  hub_name: string;
  zone_name: string;
  delivery_fee: number;
  estimated_time: string;
  is_active: boolean;
  display_order: number;
}

export default function DeliveryZonesManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Zone Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHub, setNewHub] = useState('KNUST / Kumasi Area');
  const [newZoneName, setNewZoneName] = useState('');
  const [newFee, setNewFee] = useState('10.00');
  const [newTime, setNewTime] = useState('25-35 mins');
  const [creating, setCreating] = useState(false);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editZoneName, setEditZoneName] = useState('');

  const quickHubSuggestions = [
    'KNUST / Kumasi Area',
    'UENR / Sunyani Area',
    'Accra / Legon / UPSA Area',
    'UCC / Cape Coast Area',
    'Inter-City Regional Courier (Nationwide)'
  ];

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('hub_name', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (err: any) {
      console.error('Error fetching delivery zones:', err);
      setError(err.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHub.trim() || !newZoneName.trim() || !newFee) {
      setError('Please fill in Hub name, Zone name, and Delivery Fee.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const feeNum = parseFloat(newFee) || 10;

      const { data, error } = await supabase
        .from('delivery_zones')
        .insert([{
          hub_name: newHub.trim(),
          zone_name: newZoneName.trim(),
          delivery_fee: feeNum,
          estimated_time: newTime.trim() || '20-35 mins',
          is_active: true,
          display_order: zones.length + 1
        }])
        .select()
        .single();

      if (error) throw error;

      setZones(prev => [...prev, data]);
      setNewZoneName('');
      setNewFee('10.00');
      setNewTime('25-35 mins');
      setShowAddForm(false);
      showTemporarySuccess('New delivery zone created successfully!');
    } catch (err: any) {
      console.error('Error creating delivery zone:', err);
      setError(err.message || 'Failed to create delivery zone');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      setSavingId(zone.id);
      const updatedStatus = !zone.is_active;

      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', zone.id);

      if (error) throw error;

      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: updatedStatus } : z));
      showTemporarySuccess(`Zone "${zone.zone_name}" is now ${updatedStatus ? 'Active' : 'Disabled'}`);
    } catch (err: any) {
      console.error('Error updating zone status:', err);
      setError(err.message || 'Failed to update zone status');
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setEditZoneName(zone.zone_name);
    setEditFee(zone.delivery_fee.toString());
    setEditTime(zone.estimated_time || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditZoneName('');
    setEditFee('');
    setEditTime('');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setSavingId(id);
      const feeNum = parseFloat(editFee) || 10;

      const { error } = await supabase
        .from('delivery_zones')
        .update({
          zone_name: editZoneName.trim(),
          delivery_fee: feeNum,
          estimated_time: editTime.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setZones(prev => prev.map(z => z.id === id ? {
        ...z,
        zone_name: editZoneName.trim(),
        delivery_fee: feeNum,
        estimated_time: editTime.trim()
      } : z));

      cancelEdit();
      showTemporarySuccess('Zone details updated successfully!');
    } catch (err: any) {
      console.error('Error saving zone:', err);
      setError(err.message || 'Failed to update zone');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteZone = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from delivery zones?`)) {
      return;
    }

    try {
      setSavingId(id);
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setZones(prev => prev.filter(z => z.id !== id));
      showTemporarySuccess(`Zone "${name}" removed.`);
    } catch (err: any) {
      console.error('Error deleting zone:', err);
      setError(err.message || 'Failed to delete zone');
    } finally {
      setSavingId(null);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Group zones by hub
  const groupedZones = zones.reduce((acc, zone) => {
    const hub = zone.hub_name || 'Other Hubs';
    if (!acc[hub]) acc[hub] = [];
    acc[hub].push(zone);
    return acc;
  }, {} as Record<string, DeliveryZone[]>);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8 relative overflow-hidden">
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">Campus & Multi-City Delivery Zones</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {zones.length} Zones
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage custom delivery fees for KNUST, UENR, Accra campuses, and nationwide parcel waybills.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 ${
            showAddForm 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
          }`}
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add New Zone'}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mt-4 p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Zone Form */}
      {showAddForm && (
        <form onSubmit={handleCreateZone} className="mt-6 p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100/80 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Create New Campus / Delivery Zone</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quick Select or Type City / Campus Hub
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {quickHubSuggestions.map(hub => {
                  const isSelected = newHub === hub;
                  return (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => setNewHub(hub)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {hub}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={newHub}
                onChange={(e) => setNewHub(e.target.value)}
                placeholder="e.g. KNUST / Kumasi Area"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hostel / Neighborhood Name
              </label>
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. Brunei & New Hall Hostels"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery Fee (GH₵)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">GH₵</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder="10.00"
                  className="w-full pl-12 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Delivery ETA
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="e.g. 25-35 mins or 24-48 hrs"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {creating ? 'Saving...' : 'Save Zone'}
            </button>
          </div>
        </form>
      )}

      {/* Zones List by Hub */}
      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading delivery zones...</p>
          </div>
        ) : Object.keys(groupedZones).length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No delivery zones configured yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New Zone" above to define campus delivery rates.</p>
          </div>
        ) : (
          Object.entries(groupedZones).map(([hubName, hubZones]) => (
            <div key={hubName} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Hub Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-sm text-white tracking-wide">{hubName}</h4>
                </div>
                <span className="text-[11px] font-semibold bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
                  {hubZones.filter(z => z.is_active).length} Active / {hubZones.length} Total
                </span>
              </div>

              {/* Hub Zones Items */}
              <div className="divide-y divide-slate-100 bg-white">
                {hubZones.map((zone) => {
                  const isEditing = editingId === zone.id;
                  const isSaving = savingId === zone.id;

                  return (
                    <div 
                      key={zone.id} 
                      className={`p-4 transition-colors ${!zone.is_active ? 'bg-slate-50/80 opacity-70' : 'hover:bg-slate-50/50'}`}
                    >
                      {isEditing ? (
                        <div className="space-y-3 bg-blue-50/50 p-3 rounded-xl border border-blue-200 animate-in fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hostel/Area</label>
                              <input
                                type="text"
                                value={editZoneName}
                                onChange={(e) => setEditZoneName(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fee (GH₵)</label>
                              <input
                                type="number"
                                step="0.50"
                                value={editFee}
                                onChange={(e) => setEditFee(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ETA</label>
                              <input
                                type="text"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-white text-slate-600 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(zone.id)}
                              disabled={isSaving}
                              className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              zone.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'
                            }`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${zone.is_active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                  {zone.zone_name}
                                </span>
                                {!zone.is_active && (
                                  <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {zone.estimated_time || 'Standard Delivery'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-emerald-600 font-display">
                                GH₵ {Number(zone.delivery_fee).toFixed(2)}
                              </span>
                              <p className="text-[10px] text-slate-400">Customer Fee</p>
                            </div>

                            <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                              {/* Toggle active switch */}
                              <button
                                type="button"
                                onClick={() => handleToggleActive(zone)}
                                disabled={isSaving}
                                className="p-1.5 text-slate-400 hover:text-blue-600 transition rounded-lg hover:bg-slate-100"
                                title={zone.is_active ? 'Click to disable zone' : 'Click to enable zone'}
                              >
                                {zone.is_active ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                                )}
                              </button>

                              {/* Edit button */}
                              <button
                                type="button"
                                onClick={() => startEdit(zone)}
                                disabled={isSaving}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-slate-100"
                                title="Edit zone details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteZone(zone.id, zone.zone_name)}
                                disabled={isSaving}
                                className="p-1.5 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                                title="Delete zone"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
