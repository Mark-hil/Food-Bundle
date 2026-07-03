import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, X, Loader, Lock, CheckCircle2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';

interface OrderWithDetails {
  id: string;
  student_id: string;
  quantity: number;
  total_amount: number;
  status: string;
  delivery_address: string;
  delivery_date?: string;
  delivery_time?: string;
  notes?: string;
  pickup_pin?: string;
  created_at: string;
  source: 'registered' | 'guest';
  custom_items?: string[];
  delivery_phone?: string;
  bundle: {
    name: string;
    items?: string[];
  };
  student?: {
    full_name: string;
    email: string;
    phone?: string;
    student_id?: string;
  };
  full_name?: string;
  email?: string;
  phone?: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [tab, setTab] = useState<'all' | 'registered' | 'guest' | 'subscriptions'>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinData, setPinData] = useState<{orderId: string, source: 'registered' | 'guest' | 'subscriptions'} | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Quick PIN Verification State
  const [quickPin, setQuickPin] = useState('');
  const [quickPinError, setQuickPinError] = useState('');
  const [quickPinSuccess, setQuickPinSuccess] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();

    // Set up realtime subscription for orders
    const ordersSubscription = supabase
      .channel('admin_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_orders' },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, [filter, tab]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, tab]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders: OrderWithDetails[] = [];

      if (tab === 'all' || tab === 'registered' || tab === 'subscriptions') {
        let query = supabase
          .from('orders')
          .select(`
            *,
            bundle:bundles(name, items),
            profiles(full_name, email, phone, student_id)
          `)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        if (tab === 'subscriptions') {
          query = query.ilike('notes', '%[SEMESTER SUBSCRIPTION%');
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          allOrders.push(...data.map((o: any) => ({ 
            ...o, 
            source: 'registered' as const,
            student: o.profiles || o.student
          })));
        }
      }

      if (tab === 'all' || tab === 'guest') {
        let guestQuery = supabase
          .from('guest_orders')
          .select(`
            *,
            bundle:bundles(name, items)
          `)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          guestQuery = guestQuery.eq('status', filter);
        }

        const { data: guestData, error: guestError } = await guestQuery;
        if (guestError) throw guestError;
        if (guestData) {
          allOrders.push(...guestData.map((o: any) => ({ ...o, source: 'guest' as const, student_id: undefined, student: undefined })));
        }
      }

      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, source: 'registered' | 'guest' | 'subscriptions') => {
    try {
      const table = source === 'guest' ? 'guest_orders' : 'orders';
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string, source: 'registered' | 'guest' | 'subscriptions', pickupPin?: string) => {
    if (newStatus === 'delivered' && pickupPin) {
      setPinData({ orderId, source });
      setShowPinModal(true);
      setEnteredPin('');
      setPinError('');
    } else {
      updateOrderStatus(orderId, newStatus, source);
    }
  };

  const handlePinSubmit = () => {
    if (!pinData) return;
    const order = orders.find(o => o.id === pinData.orderId);
    if (order && enteredPin === order.pickup_pin) {
      setShowPinModal(false);
      setPinError('');
      updateOrderStatus(pinData.orderId, 'delivered', pinData.source);
    } else {
      setPinError('Invalid PIN. Please check with the student.');
    }
  };

  const handleQuickPinSubmit = () => {
    if (quickPin.length !== 4) return;
    
    // Find order with matching PIN that is ready
    const matchingOrder = orders.find(
      (o) => o.pickup_pin === quickPin && o.status === 'ready'
    );

    if (matchingOrder) {
      updateOrderStatus(matchingOrder.id, 'delivered', matchingOrder.source);
      setQuickPinSuccess(`Delivered: ${getCustomerName(matchingOrder)}'s order`);
      setQuickPin('');
      setQuickPinError('');
      
      // Clear success message after 4 seconds
      setTimeout(() => {
        setQuickPinSuccess('');
      }, 4000);
    } else {
      setQuickPinError('Invalid PIN or no order is ready');
      setQuickPinSuccess('');
    }
  };

  const toggleSelect = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const updateBulkStatus = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;

    try {
      setBulkUpdating(true);

      const registeredIds = selectedOrders.filter(id =>
        orders.find(o => o.id === id && o.source === 'registered')
      );
      const guestIds = selectedOrders.filter(id =>
        orders.find(o => o.id === id && o.source === 'guest')
      );

      if (registeredIds.length > 0) {
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .in('id', registeredIds);
        if (error) throw error;
      }

      if (guestIds.length > 0) {
        const { error } = await supabase
          .from('guest_orders')
          .update({ status: newStatus })
          .in('id', guestIds);
        if (error) throw error;
      }

      setSelectedOrders([]);
      loadOrders();
    } catch (error) {
      console.error('Error updating bulk orders:', error);
      alert('Failed to update orders');
    } finally {
      setBulkUpdating(false);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All', count: orders.length },
    { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { value: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
    { value: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
    { value: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
    { value: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
    { value: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'confirmed':
        return 'bg-blue-600 text-white';
      case 'preparing':
        return 'bg-purple-600 text-white';
      case 'ready':
        return 'bg-teal-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getCustomerName = (order: OrderWithDetails) => {
    if (order.source === 'guest') return order.full_name || 'Guest';
    return order.student?.full_name || 'Unknown';
  };

  const getCustomerEmail = (order: OrderWithDetails) => {
    if (order.source === 'guest') return order.email || '';
    return order.student?.email || '';
  };

  const getCustomerPhone = (order: OrderWithDetails) => {
    if (order.source === 'guest') return order.phone || '';
    return order.delivery_phone || order.student?.phone || '';
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const searchId = searchLower.replace(/^#/, '');
    const customerName = getCustomerName(order).toLowerCase();
    const customerEmail = getCustomerEmail(order).toLowerCase();
    const customerPhone = getCustomerPhone(order).toLowerCase();
    const bundleName = order.bundle?.name.toLowerCase() || '';

    return (
      customerName.includes(searchLower) ||
      customerEmail.includes(searchLower) ||
      customerPhone.includes(searchLower) ||
      bundleName.includes(searchLower) ||
      order.id.toLowerCase().includes(searchId)
    );
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size={32} className="animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar - Status Pills */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {statusFilters.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === s.value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s.label}
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                filter === s.value
                  ? 'bg-white/30'
                  : 'bg-slate-100'
              }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Switcher - Segmented Control */}
      <div className="bg-slate-100 rounded-2xl p-1 inline-flex gap-1">
        {[
          { key: 'all' as const, label: 'All Orders' },
          { key: 'registered' as const, label: 'Registered' },
          { key: 'subscriptions' as const, label: 'Subscriptions' },
          { key: 'guest' as const, label: 'Guest' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-xl font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search and Quick PIN Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, email, bundle, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Quick PIN Entry */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                maxLength={4}
                placeholder="Fast PIN Entry"
                value={quickPin}
                onChange={(e) => {
                  setQuickPin(e.target.value.replace(/\D/g, ''));
                  setQuickPinError('');
                  setQuickPinSuccess('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickPinSubmit()}
                className="w-full pl-11 pr-4 py-3 border border-emerald-200 bg-emerald-50/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-bold tracking-[0.2em] text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
              />
            </div>
            <button
              onClick={handleQuickPinSubmit}
              disabled={quickPin.length !== 4}
              className="px-6 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap shadow-sm"
            >
              Verify
            </button>
          </div>
          {quickPinError && <p className="absolute -bottom-5 left-2 text-[11px] text-red-500 font-medium">{quickPinError}</p>}
          {quickPinSuccess && <p className="absolute -bottom-5 left-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} />{quickPinSuccess}</p>}
        </div>
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">
            {searchQuery ? 'No orders match your search' : 'No orders found'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Select All Checkbox */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-slate-300 cursor-pointer text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-slate-700">
                {selectedOrders.length === 0
                  ? `Select all ${filteredOrders.length} orders`
                  : `${selectedOrders.length} / ${filteredOrders.length} selected`}
              </span>
            </div>
          )}

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-slate-300 cursor-pointer text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Bundle</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Qty</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Delivery / Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                      index % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="w-5 h-5 rounded border-slate-300 cursor-pointer text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-mono text-[11px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="font-medium text-slate-900">{getCustomerName(order)}</p>
                        <p className="text-slate-500">{getCustomerEmail(order)}</p>
                        {getCustomerPhone(order) && (
                          <a href={`tel:${getCustomerPhone(order)}`} className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1 mt-0.5 w-max">
                            <Phone className="w-3 h-3" />
                            {getCustomerPhone(order)}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{order.bundle?.name || 'Unknown'}</p>
                      
                      {order.custom_items && order.custom_items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(order.custom_items || []).filter((item: string) => !(order.bundle.items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`add-${idx}`} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              <span className="font-bold">+</span> {item}
                            </span>
                          ))}
                          {(order.bundle.items || []).filter((item: string) => !(order.custom_items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`rem-${idx}`} className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200 flex items-center">
                              <span className="mr-0.5 font-bold">-</span> <span className="line-through">{item}</span>
                            </span>
                          ))}
                          {(order.custom_items || []).filter((item: string) => (order.bundle.items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`kept-${idx}`} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}

                      {order.notes?.includes('[SEMESTER SUBSCRIPTION') && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wider">
                          {order.notes.match(/\[SEMESTER SUBSCRIPTION:\s*([^\]]+)\]/) 
                            ? order.notes.match(/\[SEMESTER SUBSCRIPTION:\s*([^\]]+)\]/)?.[1]
                            : 'Semester Sub'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{order.quantity}</p>
                    </td>
                    <td className="px-6 py-4">
                      {Number(order.total_amount) === 0 && order.notes?.includes('[SEMESTER SUBSCRIPTION') ? (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md uppercase tracking-wide">Pre-paid</span>
                      ) : (
                        <p className="text-sm font-medium text-slate-900">GH₵ {Number(order.total_amount).toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        order.source === 'guest'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.source === 'guest' ? 'Guest' : 'Registered'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.delivery_date ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">{new Date(order.delivery_date).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-500 uppercase mt-0.5">Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value, order.source, order.pickup_pin)}
                        className={`text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer font-medium ${getStatusBgColor(order.status)}`}
                      >
                        <option value="pending" className="bg-white text-slate-900">Pending</option>
                        <option value="confirmed" className="bg-white text-slate-900">Confirmed</option>
                        <option value="preparing" className="bg-white text-slate-900">Preparing</option>
                        <option value="ready" className="bg-white text-slate-900">Ready</option>
                        <option value="delivered" className="bg-white text-slate-900">Delivered</option>
                        <option value="cancelled" className="bg-white text-slate-900">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-semibold text-slate-900">{filteredOrders.length}</span> entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Only show 5 page numbers (current, +/- 2), or ellipsis if too many
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
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-lg border border-white/60 rounded-2xl shadow-xl p-6 animate-slideUp">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updateBulkStatus('confirmed')}
                disabled={bulkUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {bulkUpdating ? 'Updating...' : 'Confirm'}
              </button>
              <button
                onClick={() => updateBulkStatus('preparing')}
                disabled={bulkUpdating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {bulkUpdating ? 'Updating...' : 'Preparing'}
              </button>
              <button
                onClick={() => updateBulkStatus('ready')}
                disabled={bulkUpdating}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {bulkUpdating ? 'Updating...' : 'Ready'}
              </button>
              <button
                onClick={() => setSelectedOrders([])}
                disabled={bulkUpdating}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <X size={16} />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-slideUp">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Verify Pickup PIN</h3>
            <p className="text-slate-600 mb-6 text-sm">Ask the student for their 4-digit pickup PIN to confirm delivery.</p>
            
            <input
              type="text"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value.replace(/\D/g, ''));
                setPinError('');
              }}
              className="text-center text-4xl font-mono tracking-widest w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition mb-4"
              placeholder="••••"
              autoFocus
            />
            
            {pinError && <p className="text-red-500 text-sm font-medium mb-4">{pinError}</p>}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 px-4 py-3 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={enteredPin.length !== 4}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
