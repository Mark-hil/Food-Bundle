import { useState } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Link } from '../lib/navigation';

export default function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">FoodBundle</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Home
            </Link>
            <Link to="/bundles" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Bundles
            </Link>
            <Link to="/about" className="text-slate-600 hover:text-slate-900 font-medium transition">
              About
            </Link>
            <Link to="/faq" className="text-slate-600 hover:text-slate-900 font-medium transition">
              FAQ
            </Link>
            <Link to="/contact" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Contact
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">
                Sign Up
              </Link>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-600 hover:text-slate-900"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
              Home
            </Link>
            <Link to="/bundles" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
              Bundles
            </Link>
            <Link to="/about" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
              About
            </Link>
            <Link to="/faq" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
              FAQ
            </Link>
            <Link to="/contact" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
              Contact
            </Link>
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 px-4 py-2 text-blue-600 text-center border border-blue-600 rounded-lg hover:bg-blue-50 font-medium transition">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium transition">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
