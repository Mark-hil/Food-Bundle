import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, Truck, MapPin, Phone, Clock, CheckCircle2, LogOut } from 'lucide-react';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'mine'>('available');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch available orders
      const { data: availableData, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone)
        `)
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;
      setAvailableOrders(availableData || []);

      // Fetch my orders
      const { data: myData, error: myError } = await supabase
        .from('orders')
        .select(`
          *,
          bundles (name, image_url),
          profiles!orders_student_id_fkey (full_name, phone)
        `)
        .eq('driver_id', user?.id)
        .in('status', ['ready', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (myError) throw myError;
      setMyOrders(myData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const claimOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: user?.id })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
      setActiveTab('mine');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const startDelivery = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const completeDelivery = async (orderId: string, correctPin: string) => {
    if (deliveryPin !== correctPin) {
      setPinError('Incorrect PIN');
      return;
    }

    try {
      setActionLoading(orderId);
      setPinError('');
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)
        .eq('pickup_pin', deliveryPin); // Extra safety check

      if (error) throw error;
      
      setVerifyingOrder(null);
      setDeliveryPin('');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const OrderCard = ({ order, type }: { order: any, type: 'available' | 'mine' }) => (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 p-5 mb-5 relative overflow-hidden transform hover:-translate-y-1">
      {/* Top Gradient Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        type === 'available' ? 'from-emerald-400 to-teal-500' : 
        order.status === 'out_for_delivery' ? 'from-orange-400 to-amber-500' : 'from-blue-400 to-indigo-500'
      }`}></div>

      <div className="flex justify-between items-start mb-5 mt-1">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-200">
            #{order.id.slice(0, 8)}
          </span>
          <h3 className="font-bold text-lg text-slate-900 mt-3 leading-tight">{order.bundles?.name}</h3>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
          order.status === 'out_for_delivery' 
            ? 'bg-orange-50 text-orange-700 border-orange-200' 
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {order.status === 'out_for_delivery' ? '🚗 Delivering' : '✨ Ready'}
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex flex-col pt-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Delivery Address</span>
            <span className="text-sm font-medium text-slate-700 leading-snug">{order.delivery_address}</span>
          </div>
        </div>
        
        {(() => {
          const phoneNum = order.delivery_phone || order.profiles?.phone;
          return phoneNum ? (
            <a href={`tel:${phoneNum}`} className="flex items-center group cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-emerald-50 transition-all duration-200">
              <div className="w-8 h-8 rounded-full bg-white group-hover:bg-emerald-100 shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100 group-hover:border-emerald-200 transition-colors">
                <Phone className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Contact</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">{phoneNum}</span>
              </div>
            </a>
          ) : (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Contact</span>
                <span className="text-sm font-medium text-slate-400">No phone provided</span>
              </div>
            </div>
          );
        })()}

        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 shrink-0 border border-slate-100">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Ordered At</span>
            <span className="text-sm font-medium text-slate-700">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {type === 'available' ? (
        <button
          onClick={() => claimOrder(order.id)}
          disabled={actionLoading === order.id}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] flex justify-center items-center group"
        >
          {actionLoading === order.id ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Claiming...</span>
            </div>
          ) : (
            <span className="flex items-center">
              Claim Order <Truck className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </button>
      ) : (
        <div>
          {order.status === 'ready' ? (
            <button
              onClick={() => startDelivery(order.id)}
              disabled={actionLoading === order.id}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] flex justify-center items-center group"
            >
              {actionLoading === order.id ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <span className="flex items-center">
                  Start Delivery <MapPin className="w-5 h-5 ml-2 group-hover:animate-bounce" />
                </span>
              )}
            </button>
          ) : (
            <div>
              {verifyingOrder === order.id ? (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="text-center mb-4">
                    <h4 className="font-bold text-slate-900">Verify Delivery</h4>
                    <p className="text-xs text-slate-500 mt-1">Ask the student for their 4-digit PIN</p>
                  </div>
                  <input
                    type="text"
                    value={deliveryPin}
                    onChange={(e) => setDeliveryPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl mb-3 text-center text-3xl font-mono tracking-[0.5em] font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-base"
                    maxLength={4}
                    placeholder="Enter PIN"
                    autoFocus
                  />
                  {pinError && <p className="text-red-500 text-sm font-medium mb-4 text-center bg-red-50 py-2 rounded-lg">{pinError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setVerifyingOrder(null); setDeliveryPin(''); setPinError(''); }}
                      className="flex-1 py-3.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => completeDelivery(order.id, order.pickup_pin)}
                      disabled={actionLoading === order.id || deliveryPin.length < 4}
                      className="flex-[2] py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {actionLoading === order.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Complete'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setVerifyingOrder(order.id)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex justify-center items-center group"
                >
                  <span className="flex items-center">
                    Mark as Delivered <CheckCircle2 className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Top Header & Tabs Container */}
      <div className="bg-slate-900 sticky top-0 z-30 shadow-xl rounded-b-3xl mb-6">
        {/* Header */}
        <div className="px-5 py-5 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Driver Hub</h1>
              <p className="text-xs text-slate-400 font-medium">{user?.user_metadata?.full_name}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-10 h-10 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full flex items-center justify-center transition-all"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 py-4 gap-3">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'available' 
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Available</span>
            {availableOrders.length > 0 && (
              <span className={`absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-[10px] rounded-full font-bold ${
                activeTab === 'available' ? 'bg-white/20 text-white' : 'bg-slate-700 text-white'
              }`}>
                {availableOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              activeTab === 'mine' 
                ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/20 scale-105' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span>My Route</span>
            {myOrders.length > 0 && (
              <span className={`absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-[10px] rounded-full font-bold ${
                activeTab === 'mine' ? 'bg-white/20 text-white' : 'bg-slate-700 text-white'
              }`}>
                {myOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-200 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-red-500 font-bold">!</span>
          </div>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin shadow-lg"></div>
            <p className="mt-4 text-slate-500 font-medium">Loading orders...</p>
          </div>
        ) : activeTab === 'available' ? (
          availableOrders.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {availableOrders.map(order => <OrderCard key={order.id} order={order} type="available" />)}
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-white rounded-3xl border border-slate-200 border-dashed animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Orders Available</h3>
              <p className="text-slate-500 text-sm">When new orders are ready for delivery, they will appear here.</p>
            </div>
          )
        ) : (
          myOrders.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {myOrders.map(order => <OrderCard key={order.id} order={order} type="mine" />)}
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-white rounded-3xl border border-slate-200 border-dashed animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                <Truck className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Your Route is Empty</h3>
              <p className="text-slate-500 text-sm">Claim some orders from the Available tab to start delivering!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
