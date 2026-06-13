import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export default function DeliverySchedule() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDeliveries();
  }, [selectedDate]);

  const fetchDeliveries = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('id, student_id, delivery_address, status, created_at, profiles(full_name, email, phone)')
        .gte('created_at', `${selectedDate}T00:00:00`)
        .lt('created_at', `${selectedDate}T23:59:59`)
        .order('created_at', { ascending: true });

      if (queryError) throw queryError;
      setDeliveries(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingDeliveries = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'cancelled');
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-4">Select Date</label>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-2">Pending Deliveries</div>
              <div className="text-3xl font-bold text-amber-600">{pendingDeliveries.length}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-2">Completed Deliveries</div>
              <div className="text-3xl font-bold text-green-600">{completedDeliveries.length}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading deliveries...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="bg-amber-100 p-2 rounded-lg mr-3">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Pending Deliveries
                </h2>
              </div>

              {pendingDeliveries.length === 0 ? (
                <p className="text-slate-600">No pending deliveries</p>
              ) : (
                <div className="space-y-3">
                  {pendingDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {delivery.profiles?.full_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{delivery.profiles?.email}</p>
                          <p className="text-sm text-slate-600 mt-2 flex items-center">
                            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                            {delivery.delivery_address}
                          </p>
                        </div>
                        <span className="ml-4 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full whitespace-nowrap">
                          {delivery.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Completed Deliveries
                </h2>
              </div>

              {completedDeliveries.length === 0 ? (
                <p className="text-slate-600">No completed deliveries</p>
              ) : (
                <div className="space-y-3">
                  {completedDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {delivery.profiles?.full_name}
                          </p>
                          <p className="text-sm text-slate-600 mt-2 flex items-center">
                            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                            {delivery.delivery_address}
                          </p>
                        </div>
                        <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                          Delivered
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
