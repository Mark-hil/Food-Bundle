import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../lib/navigation';
import { RefreshCw, Pause, Play, XCircle, Plus, Calendar, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface Bundle {
  id: string;
  name: string;
}

interface Subscription {
  id: string;
  student_id: string;
  bundle_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  quantity: number;
  status: 'active' | 'paused' | 'cancelled';
  next_delivery_date: string;
  delivery_address: string;
  discount_percentage: number;
  duration_months: number;
  deliveries_made: number;
  created_at: string;
  bundle: Bundle;
}

interface SubscriptionWithBundle extends Subscription {
  bundle: Bundle;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editAddress, setEditAddress] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      loadSubscriptions();
    }
  }, [user?.id]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, bundle:bundles(*)')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data as SubscriptionWithBundle[]);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (
    subscriptionId: string,
    newStatus: 'active' | 'paused' | 'cancelled'
  ) => {
    try {
      setUpdating(prev => ({ ...prev, [subscriptionId]: true }));
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;
      loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    } finally {
      setUpdating(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const updateSubscriptionDetails = async (subscriptionId: string) => {
    try {
      setUpdating(prev => ({ ...prev, [subscriptionId]: true }));
      const { error } = await supabase
        .from('subscriptions')
        .update({
          quantity: editQuantity,
          delivery_address: editAddress,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      setEditingId(null);
      loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    } finally {
      setUpdating(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const startEdit = (subscription: SubscriptionWithBundle) => {
    setEditingId(subscription.id);
    setEditQuantity(subscription.quantity);
    setEditAddress(subscription.delivery_address);
  };

  const frequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Biweekly';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  const getStatusColor = (status: string, isCompleted?: boolean) => {
    if (isCompleted) {
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
  const paginatedSubscriptions = subscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Subscriptions</h1>
          <p className="text-gray-400">Manage your regular food bundle subscriptions</p>
        </div>
        <button
          onClick={() => navigate('/bundles')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white rounded-lg font-medium transition transform hover:scale-105"
        >
          <Plus size={20} />
          New Subscription
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">No subscriptions yet</p>
          <button
            onClick={() => navigate('/bundles')}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-blue-500/50 rounded-lg font-medium transition transform hover:scale-105"
          >
            <Plus size={20} />
            Browse Bundles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedSubscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all p-6">
              {editingId === subscription.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Delivery Address
                    </label>
                    <textarea
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSubscriptionDetails(subscription.id)}
                      disabled={updating[subscription.id]}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition"
                    >
                      {updating[subscription.id] ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-white">
                          {subscription.bundle?.name || 'Unknown Bundle'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(subscription.status, subscription.deliveries_made >= subscription.duration_months)}`}>
                          {subscription.deliveries_made >= subscription.duration_months ? 'COMPLETED' : subscription.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs font-medium mb-1">FREQUENCY</p>
                          <p className="text-white font-semibold">{frequencyLabel(subscription.frequency)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-medium mb-1">QUANTITY PER DELIVERY</p>
                          <p className="text-white font-semibold">{subscription.quantity} bundle(s)</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-medium mb-1">PROGRESS</p>
                          <p className="text-white font-semibold">{subscription.deliveries_made} of {subscription.duration_months} Deliveries</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar size={16} className="text-blue-400 mt-1" />
                          <div>
                            <p className="text-gray-400 text-xs font-medium mb-1">NEXT DELIVERY</p>
                            <p className="text-white font-semibold">
                              {new Date(subscription.next_delivery_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-emerald-400 mt-1" />
                          <div>
                            <p className="text-gray-400 text-xs font-medium mb-1">DELIVERY ADDRESS</p>
                            <p className="text-white text-sm">{subscription.delivery_address}</p>
                          </div>
                        </div>
                      </div>

                      {subscription.discount_percentage > 0 && (
                        <div className="mt-4 inline-block">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-sm font-medium">
                            {subscription.discount_percentage}% subscriber discount
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap pt-4 border-t border-white/10">
                    {subscription.deliveries_made < subscription.duration_months && (
                      <>
                        {subscription.status === 'active' ? (
                          <button
                            onClick={() => updateSubscriptionStatus(subscription.id, 'paused')}
                            disabled={updating[subscription.id]}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg font-medium hover:bg-yellow-500/20 disabled:opacity-50 transition"
                          >
                            <Pause size={16} />
                            Pause
                          </button>
                        ) : subscription.status === 'paused' ? (
                          <button
                            onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                            disabled={updating[subscription.id]}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-medium hover:bg-emerald-500/20 disabled:opacity-50 transition"
                          >
                            <Play size={16} />
                            Resume
                          </button>
                        ) : null}
                      </>
                    )}

                    {subscription.status !== 'cancelled' && subscription.deliveries_made < subscription.duration_months && (
                      <>
                        <button
                          onClick={() => startEdit(subscription)}
                          disabled={updating[subscription.id]}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg font-medium hover:bg-white/10 disabled:opacity-50 transition"
                        >
                          <RefreshCw size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => updateSubscriptionStatus(subscription.id, 'cancelled')}
                          disabled={updating[subscription.id]}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-medium hover:bg-red-500/20 disabled:opacity-50 transition"
                        >
                          <XCircle size={16} />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mt-6 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, subscriptions.length)}</span> of <span className="font-semibold text-white">{subscriptions.length}</span> subscriptions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-white/10 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20'
                              : 'text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-white/10 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
