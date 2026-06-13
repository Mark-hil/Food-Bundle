import { Calendar, Zap, CreditCard } from 'lucide-react';

export default function MySubscriptions() {
  const subscriptions = [
    {
      name: 'Pro Plan',
      price: 199,
      period: 'month',
      status: 'active',
      renewalDate: 'April 20, 2026',
      features: ['Unlimited orders', 'Priority delivery', 'Weekly planning']
    },
    {
      name: 'Meal Credit Pack',
      price: 100,
      period: 'one-time',
      status: 'active',
      remaining: '₵45.50',
      purchaseDate: 'March 15, 2026'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">My Subscriptions</h1>
        <p className="text-slate-600 mt-2">Manage your active subscriptions and meal credits</p>
      </div>

      <div className="space-y-6">
        {subscriptions.map((sub, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{sub.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Zap size={16} className="text-amber-600" />
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {sub.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">₵{sub.price}</p>
                <p className="text-slate-600">{sub.period}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
              <div>
                <p className="text-slate-600 text-sm">Next Renewal</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={18} className="text-blue-600" />
                  <p className="font-semibold text-slate-900">{sub.renewalDate || sub.purchaseDate}</p>
                </div>
              </div>
              {sub.remaining && (
                <div>
                  <p className="text-slate-600 text-sm">Remaining Balance</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard size={18} className="text-green-600" />
                    <p className="font-semibold text-slate-900">{sub.remaining}</p>
                  </div>
                </div>
              )}
            </div>

            {sub.features && (
              <div className="mb-6">
                <p className="text-slate-700 font-semibold mb-3">Benefits:</p>
                <ul className="grid md:grid-cols-2 gap-2">
                  {sub.features.map((feature, fdx) => (
                    <li key={fdx} className="text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                Manage Subscription
              </button>
              <button className="flex-1 bg-slate-100 text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 transition">
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Want to upgrade?</h2>
        <p className="text-slate-600 mb-6">Explore other subscription plans that might suit you better.</p>
        <a href="/packages" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
          View All Plans
        </a>
      </div>
    </div>
  );
}
