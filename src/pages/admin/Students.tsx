import { useState, useEffect } from 'react';
import { useNavigate } from '../../lib/navigation';
import { supabase } from '../../lib/supabase';
import { Search } from 'lucide-react';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setStudents(data || []);

      // Fetch order counts for each student
      if (data && data.length > 0) {
        const counts: { [key: string]: number } = {};
        for (const student of data) {
          const { count, error: countError } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', student.id);
          if (!countError) {
            counts[student.id] = count || 0;
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

  const filteredStudents = students.filter(student =>
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitialColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Student count badge */}
        <div className="mb-8 flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No students found</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Orders</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${getInitialColor(student.full_name || 'S')} flex items-center justify-center text-white font-semibold text-sm`}
                        >
                          {(student.full_name || 'S')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{student.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {orderCounts[student.id] || 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => navigate(`/admin/students/${student.id}`)}
                        className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
