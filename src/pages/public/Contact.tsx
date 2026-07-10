import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import SEO from '../../components/SEO';
import { supabase } from '../../lib/supabase';

export default function Contact() {
  const styles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
    .animate-left {
      animation: slideInLeft 0.6s ease-out forwards;
    }
  `;

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Save to database
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert([{
          name: formData.name,
          email: formData.email,
          message: formData.message
        }]);

      if (dbError) throw dbError;

      // 2. Invoke email edge function
      const { error: fnError } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });

      if (fnError) {
        console.error('Edge function error (email may not have sent):', fnError);
        // We don't necessarily want to fail the whole submission if just the email fails,
        // since it's saved in the DB, but we log it.
      }

      setSubmitted(true);
      setTimeout(() => {
        setFormData({ name: '', email: '', message: '' });
        setSubmitted(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    { icon: Phone, title: 'Phone', detail: '+233 241 626 072' },
    { icon: Mail, title: 'Email', detail: 'support@food-bundle.com' },
    { icon: MapPin, title: 'Address', detail: 'Across Ghana, University Campus' }
  ];

  return (
    <>
      <SEO 
        title="Contact Us | Student Food Bundle System"
        description="Get in touch with us for support, inquiries, or feedback."
        canonical="https://www.food-bundle.com/contact"
      />
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 animate-in">
            <h1 className="text-5xl font-bold text-white mb-4">Contact Us</h1>
            <p className="text-xl text-gray-300">We'd love to hear from you. Get in touch with us today.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-12">
            {/* Left Column */}
            <div className="animate-left" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-3xl font-bold text-white mb-8">Get in Touch</h2>

              <div className="space-y-6 mb-8">
                {contactInfo.map((info, idx) => {
                  const Icon = info.icon;
                  return (
                    <div key={idx} className="flex gap-4 animate-in" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
                      <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-3 rounded-xl flex-shrink-0">
                        <Icon className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{info.title}</h3>
                        <p className="text-gray-300">{info.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-in" style={{ animationDelay: '0.5s' }}>
                <h3 className="font-semibold text-white mb-4">Business Hours</h3>
                <p className="text-gray-300 mb-2">Monday - Friday: 7am - 9pm</p>
                <p className="text-gray-300">Saturday - Sunday: 10am - 8pm</p>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 animate-in" style={{ animationDelay: '0.3s' }}>
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-gray-300">Thank you for reaching out. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 text-white placeholder-gray-400"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 text-white placeholder-gray-400"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-white font-semibold mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 text-white placeholder-gray-400 resize-none"
                      placeholder="Your message..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition flex items-center justify-center gap-2 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Send size={20} className={isSubmitting ? 'animate-pulse' : ''} /> 
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}