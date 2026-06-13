import { ArrowLeft, Clock, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function TicketDetails() {
  const [message, setMessage] = useState('');

  const ticket = {
    id: '#TIC-001',
    subject: 'Order not delivered on time',
    status: 'open',
    priority: 'high',
    created: 'April 5, 2026',
    updated: 'April 7, 2026',
    description: 'My order #ORD-2026-5678 was supposed to be delivered between 12:00 PM and 1:00 PM but it still hasn\'t arrived. Can you please check with the driver?'
  };

  const messages = [
    {
      author: 'Support Team',
      time: 'April 6, 2026, 10:30 AM',
      message: 'Thank you for contacting us. We apologize for the delay. We are currently investigating this issue with our delivery partner.'
    },
    {
      author: 'You',
      time: 'April 6, 2026, 11:15 AM',
      message: 'I understand. Please let me know ASAP when it will arrive.'
    },
    {
      author: 'Support Team',
      time: 'April 7, 2026, 9:00 AM',
      message: 'We have located your order. The delivery has been reassigned to a new driver who will arrive within the next 2 hours.'
    }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
  };

  return (
    <div className="space-y-8">
      <Link to="/support" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Tickets
      </Link>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{ticket.subject}</h1>
            <p className="text-slate-600">Ticket {ticket.id}</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold ${ticket.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-slate-200">
          <div>
            <p className="text-slate-600 text-sm">Created</p>
            <p className="font-semibold text-slate-900">{ticket.created}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">Last Updated</p>
            <p className="font-semibold text-slate-900">{ticket.updated}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">Priority</p>
            <p className="font-semibold text-slate-900 text-red-600">{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-slate-900 mb-4">Description</h2>
          <p className="text-slate-700 leading-relaxed">{ticket.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <MessageCircle size={24} /> Conversation
        </h2>

        <div className="space-y-6 mb-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-6 rounded-lg ${msg.author === 'You' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">{msg.author}</h3>
                <p className="text-slate-600 text-sm flex items-center gap-1">
                  <Clock size={16} /> {msg.time}
                </p>
              </div>
              <p className="text-slate-700">{msg.message}</p>
            </div>
          ))}
        </div>

        {ticket.status !== 'resolved' && (
          <form onSubmit={handleSendMessage} className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
