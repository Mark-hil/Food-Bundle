import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Mail, Calendar, Phone, MapPin, ShoppingBag } from 'lucide-react';

export default function StudentDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const studentId = location.pathname.split('/').pop();

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) {
        setError('Student not found');
        return;
      }

      setStudent(studentData);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'preparing':
        return 'bg-orange-100 text-orange-700';
      case 'ready':
        return 'bg-teal-100 text-teal-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getInitialColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading student details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/admin/students')}
        className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Students
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6 mb-8">
            {/* Avatar */}
            <div
              className={`w-20 h-20 rounded-full ${getInitialColor(student?.full_name || 'S')} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}
            >
              {(student?.full_name || 'S')[0].toUpperCase()}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{student?.full_name || 'Student'}</h1>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                Student
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Email</p>
                <p className="text-slate-900">{student?.email}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Phone</p>
                <p className="text-slate-900">{student?.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Joined</p>
                <p className="text-slate-900">{new Date(student?.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Address</p>
                <p className="text-slate-900">{student?.address || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{orders.length}</p>
                <p className="text-sm text-slate-600 mt-1">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">GH₵ {(totalSpent || 0).toFixed(2)}</p>
                <p className="text-sm text-slate-600 mt-1">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{new Date(student?.created_at).toLocaleDateString().split('/')[2]}</p>
                <p className="text-sm text-slate-600 mt-1">Member Since</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Order History</h2>
            <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
              {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No orders yet</p>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order, idx) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        <span className="font-mono">#{order.id?.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        GH₵ {(order.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
