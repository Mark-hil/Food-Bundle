import { Search, BookOpen, Zap, Shield, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: Truck,
      title: 'Orders & Delivery',
      description: 'Track orders, delivery information, and scheduling'
    },
    {
      icon: Shield,
      title: 'Account & Security',
      description: 'Manage your account, passwords, and privacy settings'
    },
    {
      icon: Zap,
      title: 'Payments',
      description: 'Payment methods, billing, and refunds'
    },
    {
      icon: BookOpen,
      title: 'Subscriptions',
      description: 'Plans, upgrades, cancellations, and benefits'
    }
  ];

  const articles = [
    {
      title: 'How to place an order',
      category: 'Orders & Delivery',
      views: 234
    },
    {
      title: 'Tracking your delivery in real-time',
      category: 'Orders & Delivery',
      views: 189
    },
    {
      title: 'Payment methods and security',
      category: 'Payments',
      views: 156
    },
    {
      title: 'Changing your password',
      category: 'Account & Security',
      views: 142
    },
    {
      title: 'Upgrading your subscription',
      category: 'Subscriptions',
      views: 128
    },
    {
      title: 'Cancelling your subscription',
      category: 'Subscriptions',
      views: 105
    }
  ];

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Help Center</h1>
        <p className="text-xl text-slate-600 mb-8">Find answers to common questions</p>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full border-2 border-slate-300 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer">
            <cat.icon className="text-blue-600 mb-4" size={32} />
            <h3 className="font-bold text-slate-900 mb-2">{cat.title}</h3>
            <p className="text-slate-600 text-sm">{cat.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Popular Articles</h2>
        <div className="space-y-4">
          {articles.map((article, idx) => (
            <a
              key={idx}
              href="#"
              className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition border border-slate-200"
            >
              <div>
                <h3 className="font-semibold text-slate-900 hover:text-blue-600">{article.title}</h3>
                <p className="text-slate-600 text-sm">{article.category}</p>
              </div>
              <span className="text-slate-500 text-sm">{article.views} views</span>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Can't find what you're looking for?</h2>
        <p className="text-slate-600 mb-6">Our support team is here to help</p>
        <Link to="/support" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
