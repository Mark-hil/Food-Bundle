import { ShoppingBag, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from '../lib/navigation';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingBag className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold text-white">FoodBundle</span>
            </div>
            <p className="text-sm text-slate-400">
              Quality meal bundles delivered to your door. Fresh, nutritious, and affordable.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/packages" className="text-slate-400 hover:text-white transition">
                  Packages
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-slate-400 hover:text-white transition">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <a href="mailto:support@foodbundle.com" className="text-slate-400 hover:text-white transition">
                  support@foodbundle.com
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <a href="tel:+1234567890" className="text-slate-400 hover:text-white transition">
                  +1 (234) 567-8900
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  123 Campus Street<br />
                  City, State 12345
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
            <p>&copy; 2026 FoodBundle. All rights reserved.</p>
            <p>Built with care for students</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
