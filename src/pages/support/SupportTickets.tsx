import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from '../../lib/navigation';

export default function SupportTickets() {
  const tickets = [
    {
      id: '#TIC-001',
      subject: 'Order not delivered on time',
      status: 'open',
      created: 'April 5, 2026',
      updated: 'April 7, 2026'
    },
    {
      id: '#TIC-002',
      subject: 'Missing items in order',
      status: 'resolved',
      created: 'April 2, 2026',
      updated: 'April 3, 2026'
    },
    {
      id: '#TIC-003',
      subject: 'Payment issue with mobile money',
      status: 'in_progress',
      created: 'April 1, 2026',
      updated: 'April 6, 2026'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="text-amber-600" size={20} />;
      case 'in_progress':
        return <Clock className="text-blue-600" size={20} />;
      case 'resolved':
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-slate-600 mt-2">View and manage your support requests</p>
        </div>
        <Link
          to="/support/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          <Plus size={20} /> New Ticket
        </Link>
      </div>

      <div className="space-y-4">
        {tickets.length > 0 ? (
          tickets.map(ticket => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(ticket.status)}
                    <h3 className="font-bold text-slate-900">{ticket.subject}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">Ticket {ticket.id}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')}
                  </span>
                  <p className="text-slate-600 text-sm">Updated {ticket.updated}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
            <p className="text-slate-600 mb-4">No support tickets yet</p>
            <Link
              to="/support/new"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create Your First Ticket
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
