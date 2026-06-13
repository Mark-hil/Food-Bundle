import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Car as IdCard, Calendar } from 'lucide-react';

export default function Profile() {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-gray-400">Your account information</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <User className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <User className="w-5 h-5 text-blue-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Full Name</p>
              <p className="text-lg font-semibold text-white">{profile.full_name}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <Mail className="w-5 h-5 text-emerald-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Email Address</p>
              <p className="text-lg font-semibold text-white">{profile.email}</p>
            </div>
          </div>

          {profile.student_id && (
            <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
              <IdCard className="w-5 h-5 text-indigo-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Student ID</p>
                <p className="text-lg font-semibold text-white">{profile.student_id}</p>
              </div>
            </div>
          )}

          {profile.phone && (
            <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
              <Phone className="w-5 h-5 text-purple-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Phone Number</p>
                <p className="text-lg font-semibold text-white">{profile.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-4 pb-6 border-b border-white/10">
            <Calendar className="w-5 h-5 text-amber-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Member Since</p>
              <p className="text-lg font-semibold text-white">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
