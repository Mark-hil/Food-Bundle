import { Clock } from 'lucide-react';

export default function PaymentConfirm() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Confirm Payment</h1>
        <p className="text-slate-600 mt-2">Review your order before completing payment</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Order Summary</h2>

        <div className="space-y-4 mb-8 pb-8 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Lunch Power Pack</span>
            <span className="font-semibold text-slate-900">₵25.50</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Delivery Fee</span>
            <span className="font-semibold text-slate-900">₵3.50</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-200">
          <span className="font-semibold text-slate-900">Total Amount</span>
          <span className="text-3xl font-bold text-slate-900">₵29.00</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 flex gap-4">
          <Clock className="text-amber-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-slate-900">Processing Time</h3>
            <p className="text-slate-600 text-sm">Your payment is being processed. Please wait a moment...</p>
          </div>
        </div>

        <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition">
          Complete Payment
        </button>

        <p className="text-center text-slate-600 text-sm mt-6">
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
}
