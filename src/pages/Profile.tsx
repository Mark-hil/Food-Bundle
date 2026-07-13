import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Car as IdCard, Calendar, Edit2, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!profile) return null;

  const handleEdit = () => {
    setFullName(profile.full_name || '');
    setPhone(profile.phone || '');
    setStudentId(profile.student_id || '');
    setError('');
    setSuccess('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Full Name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (studentId && studentId !== profile.student_id) {
        const { data: exists, error: checkError } = await supabase.rpc('check_student_id_exists', {
          p_student_id: studentId
        });
        if (checkError) throw checkError;
        if (exists) {
          throw new Error('This Student ID is already registered.');
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          student_id: studentId || null,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Your account information</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition border border-white/10"
          >
            <Edit2 size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <User className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm mb-6">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Full Name */}
          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <User className="w-5 h-5 text-blue-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Full Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 transition"
                  placeholder="Your full name"
                />
              ) : (
                <p className="text-lg font-semibold text-white">{profile.full_name}</p>
              )}
            </div>
          </div>

          {/* Email (Not editable here) */}
          <div className="flex items-start space-x-4 pb-6 border-b border-white/10 opacity-70">
            <Mail className="w-5 h-5 text-emerald-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Email Address</p>
              <p className="text-lg font-semibold text-white">{profile.email}</p>
              {isEditing && <p className="text-xs text-emerald-400/80 mt-1">Email cannot be changed here.</p>}
            </div>
          </div>

          {/* Student ID */}
          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <IdCard className="w-5 h-5 text-indigo-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Student ID</p>
              {isEditing ? (
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-indigo-400 transition"
                  placeholder="Optional Student ID"
                />
              ) : (
                <p className="text-lg font-semibold text-white">{profile.student_id || <span className="text-gray-500 italic">Not set</span>}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <Phone className="w-5 h-5 text-purple-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Phone Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400 transition"
                  placeholder="Optional Phone Number"
                />
              ) : (
                <p className="text-lg font-semibold text-white">{profile.phone || <span className="text-gray-500 italic">Not set</span>}</p>
              )}
            </div>
          </div>

          {/* Member Since (Read-only) */}
          {!isEditing && (
            <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
              <Calendar className="w-5 h-5 text-amber-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Member Since</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Role (Read-only) */}
          {!isEditing && (
            <div className="flex items-start space-x-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full shadow-lg ${
                    profile.role === 'admin' ? 'bg-purple-500 shadow-purple-500/50' : 'bg-emerald-500 shadow-emerald-500/50'
                  }`}
                ></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Account Type</p>
                <p className="text-lg font-semibold text-white capitalize">{profile.role}</p>
              </div>
            </div>
          )}

          {/* Edit Mode Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-4 mt-8 pt-4">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-500/20 hover:bg-gray-500/30 text-white rounded-lg transition disabled:opacity-50"
              >
                <X size={18} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 hover:opacity-90 text-white rounded-lg transition shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
