import { useState, useEffect } from 'react';
import { useNavigate } from '../../lib/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Users, ShieldCheck, Truck, GraduationCap, PackageCheck, Headset, Crown } from 'lucide-react';

type RoleTab = 'all' | 'admin' | 'super_admin' | 'student' | 'driver' | 'support' | 'packer';

interface RoleConfig {
  key: RoleTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotClass: string;
  activeClass: string;
}

const ROLE_TABS: RoleConfig[] = [
  {
    key: 'all',
    label: 'All Users',
    icon: Users,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
    activeClass: 'border-slate-700 text-slate-900',
  },
  {
    key: 'super_admin',
    label: 'Super Admins',
    icon: Crown,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-100',
    dotClass: 'bg-rose-500',
    activeClass: 'border-rose-600 text-rose-700',
  },
  {
    key: 'admin',
    label: 'Admins',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-100',
    dotClass: 'bg-purple-500',
    activeClass: 'border-purple-600 text-purple-700',
  },
  {
    key: 'student',
    label: 'Students',
    icon: GraduationCap,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-100',
    dotClass: 'bg-blue-500',
    activeClass: 'border-blue-600 text-blue-700',
  },
  {
    key: 'driver',
    label: 'Drivers',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-100',
    dotClass: 'bg-amber-500',
    activeClass: 'border-amber-600 text-amber-700',
  },
  {
    key: 'support',
    label: 'Support',
    icon: Headset,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-100',
    dotClass: 'bg-sky-500',
    activeClass: 'border-sky-600 text-sky-700',
  },
  {
    key: 'packer',
    label: 'Packers',
    icon: PackageCheck,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-100',
    dotClass: 'bg-teal-500',
    activeClass: 'border-teal-600 text-teal-700',
  },
];

export default function Students() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('all');
  const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, phone, created_at')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setUsers(data || []);

      // Fetch order counts for each user
      if (data && data.length > 0) {
        const counts: { [key: string]: number } = {};
        for (const user of data) {
          const { count, error: countError } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', user.id);
          if (!countError) {
            counts[user.id] = count || 0;
          }
        }
        setOrderCounts(counts);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = activeTab === 'all' || user.role === activeTab;
    return matchesSearch && matchesRole;
  });

  const getRoleCounts = () => {
    const counts: Record<RoleTab, number> = { all: users.length, admin: 0, super_admin: 0, student: 0, driver: 0, support: 0, packer: 0 };
    users.forEach(u => {
      const role = u.role as RoleTab;
      if (role in counts) counts[role]++;
    });
    return counts;
  };

  const roleCounts = getRoleCounts();

  const getRoleBadge = (role: string) => {
    const config = ROLE_TABS.find(t => t.key === role);
    if (!config) {
      return {
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
        label: role || 'Student',
      };
    }
    return {
      badgeClass: config.badgeClass,
      dotClass: config.dotClass,
      label: config.key === 'super_admin' ? 'Super Admin' : config.label.replace(/s$/, ''),
    };
  };

  const getInitialColor = (name: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-emerald-500 to-emerald-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-amber-500 to-amber-600',
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // Filter tabs: only super_admin users can see the super_admin and admin tabs
  const visibleTabs = isSuperAdmin
    ? ROLE_TABS
    : ROLE_TABS.filter(t => t.key !== 'super_admin');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-green-600"></div>
          <p className="text-slate-500 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-1">View and manage all registered users by role.</p>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? `${tab.activeClass}`
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? tab.badgeClass
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {roleCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-[400px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all sm:text-sm shadow-sm"
          />
        </div>
        <span className="text-sm text-slate-500">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 pl-6 font-semibold">User</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 font-semibold">Orders</th>
                <th className="p-4 pr-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-50 p-4 rounded-full mb-4 border border-slate-100">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-slate-900 font-medium mb-1">No users found</h3>
                      <p className="text-slate-500 text-sm">
                        {searchTerm
                          ? 'Try adjusting your search terms.'
                          : `No ${activeTab === 'all' ? '' : activeTab.replace('_', ' ') + ' '}users registered yet.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const badge = getRoleBadge(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center">
                          <div
                            className={`h-10 w-10 flex-shrink-0 rounded-full ${getInitialColor(
                              user.full_name || 'U'
                            )} flex items-center justify-center text-white font-semibold text-sm mr-4 shadow-sm`}
                          >
                            {(user.full_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.full_name || 'Unnamed User'}
                            </p>
                            {user.phone && (
                              <p className="text-xs text-slate-500 mt-0.5">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">{user.email}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass} mr-1.5`}></span>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-slate-900">
                          {orderCounts[user.id] || 0}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => navigate(`/admin/students/${user.id}`)}
                          className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
