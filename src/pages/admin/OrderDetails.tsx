import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, MapPin, Phone, Mail, DollarSign, Package, Calendar, User } from 'lucide-react';

export default function AdminOrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const orderId = location.pathname.split('/').pop();

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*, bundle:bundle_id(name, items), student:profiles(full_name, email, phone)')
        .eq('id', orderId)
        .maybeSingle();

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
    setUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) throw updateError;
      setOrder({ ...order, status: newStatus });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusClick = (status: string) => {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading order details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/admin/orders')}
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const statusColor = getStatusColor(order?.status);
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Orders
      </button>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Header with Order ID and Status Badge */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              <span className="font-mono text-xl">#{order?.id?.slice(0, 8)}</span>
            </h1>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor.bg} ${statusColor.text}`}>
              {order?.status?.toUpperCase()}
            </span>
          </div>

          {/* Grid Layout for Info Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Customer Info */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Customer Info</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Name</p>
                    <p className="text-slate-900 font-medium">{order?.student?.full_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Email</p>
                    <p className="text-slate-900 font-medium">{order?.student?.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Phone</p>
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
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Order Info</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Bundle</p>
                    <p className="text-slate-900 font-medium">{order?.bundle?.name || 'Not provided'}</p>
                    {order?.custom_items && order.custom_items.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Modifications (Kitchen Prep)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(order.custom_items || []).filter((item: string) => !(order.bundle.items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`add-${idx}`} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 flex items-center">
                              <span className="mr-1 font-bold">+</span> {item}
                            </span>
                          ))}
                          {(order.bundle.items || []).filter((item: string) => !(order.custom_items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`rem-${idx}`} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-200 flex items-center">
                              <span className="mr-1 font-bold">-</span> <span className="line-through">{item}</span>
                            </span>
                          ))}
                          {(order.custom_items || []).filter((item: string) => (order.bundle.items || []).includes(item)).map((item: string, idx: number) => (
                            <span key={`kept-${idx}`} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Order Date</p>
                    <p className="text-slate-900 font-medium">{new Date(order?.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Amount</p>
                    <p className="text-slate-900 font-medium">GH₵ {(order?.total_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Delivery Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Address</p>
                    <p className="text-slate-900 font-medium">{order?.delivery_address || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Delivery Date</p>
                    <p className="text-slate-900 font-medium">
                      {order?.delivery_date ? new Date(order?.delivery_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  disabled={updating || order?.status === status}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    order?.status === status
                      ? `${getStatusColor(status).fillBg} text-white`
                      : `border border-slate-300 text-slate-700 hover:border-slate-400`
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
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
