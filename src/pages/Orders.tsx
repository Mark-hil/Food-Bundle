import { useState, useEffect } from 'react';
import { supabase, Order, Bundle } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../lib/navigation';
import { Package, Clock, CheckCircle, XCircle, Loader, RefreshCw, MapPin, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import ReceiptDownload from '../components/ReceiptDownload';

interface OrderWithBundle extends Order {
  bundle: Bundle;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          bundle:bundles(*)
        `)
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Loader className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'preparing':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'ready':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
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

  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Orders</h1>
        <p className="text-gray-400">Track your food bundle orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg mb-2">No orders yet</p>
          <p className="text-gray-500 text-sm">Start ordering delicious food bundles!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 mb-4 lg:mb-0">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(order.status)}
                    <h3 className="text-lg font-bold text-white">
                      {order.bundle.name}
                    </h3>
                    {order.custom_items && order.custom_items.length > 0 && (
                      <div className="mt-2 p-2 bg-black/20 rounded-lg border border-white/5">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Modifications</div>
                        <div className="flex flex-wrap gap-1.5">
                          {order.custom_items.filter(item => !(order.bundle.items || []).includes(item)).map((item, idx) => (
                            <span key={`add-${idx}`} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center">
                              <span className="mr-1 font-bold">+</span> {item}
                            </span>
                          ))}
                          {(order.bundle.items || []).filter(item => !(order.custom_items || []).includes(item)).map((item, idx) => (
                            <span key={`rem-${idx}`} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md border border-red-500/20 flex items-center">
                              <span className="mr-1 font-bold">-</span> <span className="line-through">{item}</span>
                            </span>
                          ))}
                          {(order.custom_items || []).filter(item => (order.bundle.items || []).includes(item)).map((item, idx) => (
                            <span key={`kept-${idx}`} className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-md border border-slate-500/20">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300 mt-3">
                    <div>
                      <span className="font-medium">Quantity:</span> {order.quantity}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>{' '}
                      {Number(order.total_amount) === 0 && order.notes?.includes('[SEMESTER SUBSCRIPTION') ? (
                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md uppercase tracking-wide border border-purple-500/20">Pre-paid</span>
                      ) : (
                        `GH₵ ${Number(order.total_amount).toFixed(2)}`
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Delivery Fee:</span>{' '}
                      {Number(order.delivery_fee) > 0 ? `GH₵ ${Number(order.delivery_fee).toFixed(2)}` : 'GH₵ 0.00'}
                    </div>
                    <div>
                      <span className="font-medium">Delivery:</span> {order.delivery_address}
                    </div>
                    <div>
                      <span className="font-medium">Ordered:</span>{' '}
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    {order.delivery_date && (
                      <div>
                        <span className="font-medium">Delivery Date:</span>{' '}
                        {new Date(order.delivery_date).toLocaleDateString()}
                      </div>
                    )}
                    {order.delivery_time && (
                      <div>
                        <span className="font-medium">Time:</span> {order.delivery_time}
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mt-3 p-3 bg-slate-800/50 border border-white/5 rounded-lg text-sm text-gray-400">
                      <span className="font-medium text-gray-300">Notes:</span> {order.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right mb-3">
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="text-xs font-mono text-gray-400">
                      {order.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => navigate(`/track/${order.id}`)}
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm border border-white/5"
                    >
                      <MapPin className="w-4 h-4" />
                      Track
                    </button>
                    {order.status === 'pending' && Number(order.total_amount) > 0 && (
                      <button
                        onClick={() => navigate(`/payment?order=${order.id}`)}
                        className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/checkout?bundle=${order.bundle.id}&reorder=true`)}
                      className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/50 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reorder
                    </button>
                    <ReceiptDownload order={order} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mt-6 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, orders.length)}</span> of <span className="font-semibold text-white">{orders.length}</span> orders
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
