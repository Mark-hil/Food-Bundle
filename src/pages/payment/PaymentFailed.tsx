import { XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Link } from '../../lib/navigation';

export default function PaymentFailed() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <XCircle className="text-red-600 mx-auto mb-6" size={64} />
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Payment Failed</h1>
        <p className="text-xl text-slate-600">Unfortunately, your payment could not be processed</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">What went wrong?</h2>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 flex gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Payment Declined</h3>
            <p className="text-slate-600 text-sm">Your payment was declined by your bank. This could be due to:</p>
            <ul className="mt-3 text-slate-600 text-sm space-y-1">
              <li>• Insufficient funds</li>
              <li>• Card expired or blocked</li>
              <li>• Incorrect card details</li>
              <li>• Bank security block</li>
            </ul>
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 mb-4">What can you do?</h3>
        <ol className="space-y-3 mb-8 text-slate-700">
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 flex-shrink-0">1</span>
            <span>Check your card details and ensure they are correct</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 flex-shrink-0">2</span>
            <span>Contact your bank to verify your account is active</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 flex-shrink-0">3</span>
            <span>Try a different payment method (mobile money, etc.)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 flex-shrink-0">4</span>
            <span>Contact our support team for assistance</span>
          </li>
        </ol>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            <RotateCcw size={20} /> Try Again
          </button>
          <a href="mailto:support@studentmeals.com" className="flex items-center justify-center gap-2 bg-slate-100 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition">
            Contact Support
          </a>
        </div>

        <Link to="/" className="block text-center bg-slate-200 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-300 transition">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
