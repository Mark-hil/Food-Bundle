import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function CreateTicket() {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ subject: '', category: '', priority: 'medium', description: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      <Link to="/support" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Support Tickets
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900">Create Support Ticket</h1>
        <p className="text-slate-600 mt-2">Describe your issue and we'll help you as soon as possible</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl">
        {submitted ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ticket Created Successfully</h2>
            <p className="text-slate-600 mb-6">We've received your support request. You'll receive updates via email.</p>
            <Link to="/support" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              View Your Tickets
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                placeholder="Brief description of your issue"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-700 font-semibold mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select a category</option>
                  <option value="order">Order Issue</option>
                  <option value="delivery">Delivery Issue</option>
                  <option value="payment">Payment Issue</option>
                  <option value="account">Account Issue</option>
                  <option value="quality">Quality Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                placeholder="Provide detailed information about your issue..."
              />
              <p className="text-slate-600 text-sm mt-2">Include relevant order numbers, dates, or screenshots</p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Send size={20} /> Submit Ticket
              </button>
              <Link
                to="/support"
                className="flex-1 bg-slate-100 text-slate-900 font-semibold py-3 rounded-lg hover:bg-slate-200 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
