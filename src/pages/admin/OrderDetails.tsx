import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, MapPin, Phone, Mail, DollarSign, Package, Calendar, User, Headset, PackageCheck, CheckCircle, Truck, Check } from 'lucide-react';

export default function AdminOrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSupport, isPacker } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const orderId = location.pathname.split('/').pop();

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();

    // Realtime subscription for live order changes
    const orderChannel = supabase
      .channel(`order-details-live-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => {
          fetchOrder();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_orders', filter: `id=eq.${orderId}` },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      // First try regular orders
      let { data, error: queryError } = await supabase
        .from('orders')
        .select('*, bundle:bundle_id(name, items), student:profiles!orders_student_id_fkey(full_name, email, phone)')
        .eq('id', orderId)
        .maybeSingle();

      // If not found, check guest orders
      if (!data) {
        const { data: guestData, error: guestError } = await supabase
          .from('guest_orders')
          .select('*, bundle:bundles(name, items)')
          .eq('id', orderId)
          .maybeSingle();

        if (guestError) throw guestError;
        if (guestData) {
          data = {
            ...guestData,
            is_guest: true,
            student: {
              full_name: guestData.full_name,
              email: guestData.email,
              phone: guestData.phone
            }
          };
        }
      }

      if (queryError) throw queryError;
      if (data) setOrder(data);
      else setError('Order not found');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (isSupport) return;
    setUpdating(true);
    try {
      const table = order?.is_guest ? 'guest_orders' : 'orders';
      const updatePayload: Record<string, any> = { status: newStatus };
      
      // If moving back to preparing/confirmed/pending, unassign any claimed driver (only for regular orders)
      if (!order?.is_guest && ['pending', 'confirmed', 'preparing'].includes(newStatus)) {
        updatePayload.driver_id = null;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', orderId);

      if (updateError) throw updateError;
      setOrder({ ...order, ...updatePayload });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusClick = (status: string) => {
    if (isSupport) return;
    if (status === 'delivered' && order?.pickup_pin) {
      setShowPinModal(true);
      setEnteredPin('');
      setPinError('');
    } else {
      updateOrderStatus(status);
    }
  };

  const handlePinSubmit = () => {
    if (enteredPin === order?.pickup_pin) {
      setShowPinModal(false);
      setPinError('');
      updateOrderStatus('delivered');
    } else {
      setPinError('Invalid PIN. Please check with the student.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', fillBg: 'bg-yellow-500' };
      case 'confirmed':
        return { bg: 'bg-blue-100', text: 'text-blue-800', fillBg: 'bg-blue-500' };
      case 'preparing':
        return { bg: 'bg-orange-100', text: 'text-orange-800', fillBg: 'bg-orange-500' };
      case 'ready':
        return { bg: 'bg-teal-100', text: 'text-teal-800', fillBg: 'bg-teal-500' };
      case 'out_for_delivery':
        return { bg: 'bg-indigo-100', text: 'text-indigo-800', fillBg: 'bg-indigo-600' };
      case 'delivered':
        return { bg: 'bg-green-100', text: 'text-green-800', fillBg: 'bg-green-500' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800', fillBg: 'bg-red-500' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', fillBg: 'bg-slate-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600 font-medium">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/admin/orders')}
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error || 'Order not found'}</div>
      </div>
    );
  }

  const allStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
  const packerStatuses = ['pending', 'confirmed', 'preparing'].includes(order?.status)
    ? (order?.status === 'preparing' ? ['ready'] : ['preparing', 'ready'])
    : order?.status === 'ready'
      ? ['preparing']
      : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
        Back to Orders
      </button>

      {/* Role Notice */}
      {isSupport && (
        <div className="max-w-4xl mx-auto mb-6 bg-sky-50 border border-sky-200 text-sky-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <Headset size={16} className="text-sky-600" />
          <span>Support View (Read-Only) — Inspecting order metadata and customer details.</span>
        </div>
      )}

      {isPacker && (
        <div className="max-w-4xl mx-auto mb-6 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <PackageCheck size={16} className="text-teal-600" />
          <span>Packer View — Kitchen meal preparation and packaging station.</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4 mb-8">
            <div>
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Order Details</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono mt-1">
                #{order?.id?.slice(0, 8).toUpperCase()}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {order?.is_guest && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Guest Order
                </span>
              )}
              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${getStatusColor(order?.status).bg} ${getStatusColor(order?.status).text}`}>
                {order?.status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Grid Layout for Info Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Customer Info */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Customer Info</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Name</p>
                    <p className="text-slate-900 font-medium">{order?.student?.full_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                    <p className="text-slate-900 font-medium">{order?.student?.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Phone</p>
                    <p className="text-slate-900 font-medium">
                      {order?.delivery_phone ? (
                        <>
                          {order.delivery_phone} <span className="text-xs text-emerald-600 ml-1 font-semibold">(Delivery)</span>
                        </>
                      ) : (
                        order?.student?.phone || 'Not provided'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Order Items</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Bundle Package</p>
                    <p className="text-slate-900 font-bold text-base mt-0.5">{order?.bundle?.name || 'Standard Bundle'}</p>
                    
                    {/* Items Checklist for Packing */}
                    <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <PackageCheck size={14} className="text-teal-600" />
                          Kitchen Packing Checklist ({order?.quantity || 1}x)
                        </span>
                        {order?.custom_items && order.custom_items.length > 0 ? (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Customized</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-full">Standard</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {(order?.custom_items && order.custom_items.length > 0 
                          ? order.custom_items 
                          : (Array.isArray(order?.bundle?.items) ? order.bundle.items : [])
                        ).map((item: string, idx: number) => {
                          const isAdded = order?.custom_items && !(order?.bundle?.items || []).includes(item);
                          return (
                            <label key={`item-${idx}`} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200 text-sm">
                              <input type="checkbox" className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer" />
                              <span className="font-medium text-slate-800 flex-1">{item}</span>
                              {isAdded && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                                  + Added
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>

                      {/* Display removed items if any */}
                      {order?.custom_items && order.custom_items.length > 0 && (order?.bundle?.items || []).some((item: string) => !order.custom_items.includes(item)) && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5">Excluded / Swapped Out:</p>
                          <div className="flex flex-wrap gap-1">
                            {(order.bundle.items || []).filter((item: string) => !order.custom_items.includes(item)).map((item: string, idx: number) => (
                              <span key={`rem-${idx}`} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-lg border border-red-200 line-through">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Inline Status Actions for Packer & Kitchen Staff */}
                      {!isSupport && (
                        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          {order?.status === 'ready' ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200">
                                <CheckCircle className="w-4 h-4 text-teal-600" />
                                Packed & Ready for Driver Pickup
                              </span>
                              {(isPacker || !isSupport) && (
                                <button
                                  onClick={() => handleStatusClick('preparing')}
                                  disabled={updating}
                                  className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium"
                                >
                                  Re-open to Preparing
                                </button>
                              )}
                            </div>
                          ) : order?.status === 'out_for_delivery' ? (
                            <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 w-full">
                              <Truck className="w-4 h-4 text-indigo-600" />
                              Order is Out for Delivery with Driver
                            </span>
                          ) : order?.status === 'delivered' ? (
                            <span className="text-xs font-semibold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 w-full">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Delivered & Verified
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              {order?.status !== 'preparing' && (
                                <button
                                  onClick={() => handleStatusClick('preparing')}
                                  disabled={updating}
                                  className="flex-1 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold transition disabled:opacity-50"
                                >
                                  {updating ? 'Updating...' : '🍳 Start Preparing'}
                                </button>
                              )}
                              <button
                                onClick={() => handleStatusClick('ready')}
                                disabled={updating}
                                className="flex-1 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <Check size={14} className="font-bold" />
                                {updating ? 'Updating...' : 'Mark as Ready & Packed'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Order Date</p>
                    <p className="text-slate-900 font-medium">{new Date(order?.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Payment Summary</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-600">GH₵ {(Number(order?.total_amount) || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Quantity</p>
                  <p className="text-slate-900 font-medium">{order?.quantity} package{order?.quantity > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Delivery Details</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Delivery Address</p>
                    <p className="text-slate-900 font-medium">{order?.delivery_address || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Scheduled Date</p>
                    <p className="text-slate-900 font-medium">
                      {order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Immediate'}
                    </p>
                  </div>
                </div>

                {order?.notes && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Customer Notes / Instructions</p>
                    <p className="text-xs text-amber-900 font-medium">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Order Status Management</h2>
            
            {isSupport ? (
              <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                Support role has read-only access. Status changes are managed by packers, drivers, and administrators.
              </p>
            ) : isPacker ? (
              packerStatuses.length > 0 ? (
                <div className="flex flex-wrap gap-3 items-center">
                  {packerStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusClick(status)}
                      disabled={updating || order?.status === status}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                        status === 'preparing'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {updating ? 'Updating...' : `Mark as ${status.charAt(0).toUpperCase() + status.slice(1)}`}
                    </button>
                  ))}
                </div>
              ) : order?.status === 'ready' ? (
                <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-sm">Order is Packed & Ready for Driver Pickup.</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Order status is currently {order?.status}. Packers manage orders in Confirmed and Preparing states.
                </p>
              )
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {allStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusClick(status)}
                    disabled={updating || order?.status === status}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      order?.status === status
                        ? `${getStatusColor(status).fillBg} text-white shadow-md`
                        : `border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300`
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
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
