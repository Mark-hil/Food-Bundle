import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Mail, Calendar, Phone, MapPin, ShoppingBag, ShieldCheck, Crown, Truck, Headset, PackageCheck, GraduationCap, X, Check, AlertTriangle, LucideIcon } from 'lucide-react';

type RoleOption = 'student' | 'driver' | 'support' | 'packer' | 'admin' | 'super_admin';

interface RoleInfo {
  key: RoleOption;
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClass: string;
  bgGradient: string;
}

const ALL_ROLES: RoleInfo[] = [
  {
    key: 'student',
    label: 'Student',
    description: 'Can browse food packages, place orders, subscribe to meal plans, and track deliveries.',
    icon: GraduationCap,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    bgGradient: 'from-blue-500 to-blue-600',
  },
  {
    key: 'driver',
    label: 'Driver',
    description: 'Access to delivery portal to claim, navigate, and confirm drop-offs via customer PIN.',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgGradient: 'from-amber-500 to-amber-600',
  },
  {
    key: 'packer',
    label: 'Packer',
    description: 'Focused kitchen view to transition orders through confirmed → preparing → ready.',
    icon: PackageCheck,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    bgGradient: 'from-teal-500 to-teal-600',
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Read-only access to customer profiles, orders, and tickets to assist with inquiries.',
    icon: Headset,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    bgGradient: 'from-sky-500 to-sky-600',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Can manage bundles, inventory, orders, discount promos, delivery slots, and non-admin staff.',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    bgGradient: 'from-purple-500 to-purple-600',
  },
  {
    key: 'super_admin',
    label: 'Super Admin',
    description: 'Unrestricted master access including database management and promoting/demoting other admins.',
    icon: Crown,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgGradient: 'from-rose-500 to-rose-600',
  },
];

export default function StudentDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isSuperAdmin, isAdmin, isSupport, isPacker } = useAuth();
  
  const [student, setStudent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>('student');
  const [updatingRole, setUpdatingRole] = useState(false);
  
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
        setError('User not found');
        return;
      }

      setStudent(studentData);
      setSelectedRole(studentData.role || 'student');

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!student || selectedRole === student.role) {
      setShowRoleModal(false);
      return;
    }

    // Role assignment security guard
    if (!isSuperAdmin && (selectedRole === 'admin' || selectedRole === 'super_admin')) {
      setError('Only Super Admins can promote users to Admin or Super Admin.');
      setShowRoleModal(false);
      return;
    }

    if (!isSuperAdmin && (student.role === 'admin' || student.role === 'super_admin')) {
      setError('Only Super Admins can modify the role of an Admin or Super Admin account.');
      setShowRoleModal(false);
      return;
    }

    setUpdatingRole(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', student.id);

      if (updateError) throw updateError;

      setStudent({ ...student, role: selectedRole });
      setSuccessMsg(`Role successfully updated to ${selectedRole.replace('_', ' ')}.`);
      setShowRoleModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const getRoleInfo = (roleKey: string) => {
    return ALL_ROLES.find((r) => r.key === roleKey) || ALL_ROLES[0];
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

  // Determine if current logged-in user can change this profile's role
  const isTargetAdmin = student?.role === 'admin' || student?.role === 'super_admin';
  const isSelf = currentUser?.id === student?.id;
  const canManageThisRole = (isSuperAdmin || (isAdmin && !isTargetAdmin)) && !isSupport && !isPacker;

  // Roles available for selection based on current user's privileges
  const assignableRoles = isSuperAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r.key !== 'admin' && r.key !== 'super_admin');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600 font-medium">Loading user details...</div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(student?.role);
  const RoleIcon = roleInfo.icon;
  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/admin/students')}
        className="inline-flex items-center text-slate-600 hover:text-slate-900 transition mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
        Back to Users
      </button>

      {successMsg && (
        <div className="max-w-4xl mx-auto mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div
                className={`w-20 h-20 rounded-2xl ${getInitialColor(student?.full_name || 'U')} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-md`}
              >
                {(student?.full_name || 'U')[0].toUpperCase()}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{student?.full_name || 'User'}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.badgeClass}`}>
                    <RoleIcon size={14} />
                    {roleInfo.label}
                  </span>
                  {isSelf && (
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      Current Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Role Management Actions */}
            <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
              {canManageThisRole ? (
                <button
                  onClick={() => {
                    setSelectedRole(student?.role || 'student');
                    setShowRoleModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Manage Role
                </button>
              ) : isTargetAdmin && !isSuperAdmin ? (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2">
                  <ShieldCheck size={14} className="text-purple-600" />
                  <span>Protected Admin Account</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pt-6 border-t border-slate-100">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Email Address</p>
                <p className="text-slate-900 font-medium">{student?.email}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Phone Number</p>
                <p className="text-slate-900 font-medium">{student?.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Joined Platform</p>
                <p className="text-slate-900 font-medium">{student?.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Default Address</p>
                <p className="text-slate-900 font-medium">{student?.address || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="border-t border-slate-100 pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{orders.length}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Total Orders</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">GH₵ {(totalSpent || 0).toFixed(2)}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Total Spent</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {student?.created_at ? new Date(student.created_at).getFullYear() : '2026'}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">Member Since</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Order History</h2>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {orders.length} orders
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-sm">No orders recorded for this account</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
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
                        <span className="font-mono">#{order.id?.slice(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
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

      {/* Role Assignment Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Change Account Role</h3>
                <p className="text-xs text-slate-500 mt-0.5">Assign permissions for {student?.full_name}</p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {assignableRoles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${role.bgGradient} shadow-sm mt-0.5`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">{role.label}</span>
                        {isSelected && <Check size={16} className="text-emerald-600 font-bold" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{role.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                disabled={updatingRole}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={updatingRole}
                className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {updatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
