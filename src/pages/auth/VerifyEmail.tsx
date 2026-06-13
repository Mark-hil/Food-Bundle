import { CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from '../../lib/navigation';

export default function VerifyEmail() {
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=email_change')) {
      setVerified(true);
    } else {
      setError('Invalid verification link');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        {verified ? (
          <>
            <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Email Verified</h1>
            <p className="text-slate-600 mb-8">Your email has been successfully verified. You can now log in to your account.</p>
            <Link to="/login" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Return to Login
            </Link>
          </>
        ) : (
          <>
            <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Verification Failed</h1>
            <p className="text-slate-600 mb-8">{error}</p>
            <Link to="/login" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Return to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
