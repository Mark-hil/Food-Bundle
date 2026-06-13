import { ChevronDown, Mail } from 'lucide-react';
import { useState } from 'react';

export default function FAQ() {
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
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `;

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I place an order?',
      answer: 'Sign up for an account, browse available meal bundles, select your preferred meals, and proceed to checkout. You can pay securely using our integrated payment system.'
    },
    {
      question: 'What is the delivery time?',
      answer: 'Standard delivery takes 1-2 hours depending on your location. Express delivery is available for an additional fee and arrives within 30 minutes.'
    },
    {
      question: 'Can I customize my meal?',
      answer: 'Yes, you can customize most meals. During checkout, you\'ll have options to add or remove ingredients based on your preferences and dietary restrictions.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept mobile money (MTN, Vodafone, AirtelTigo), credit/debit cards, and bank transfers. All payments are processed securely through our payment gateway.'
    },
    {
      question: 'Do you offer vegetarian/vegan options?',
      answer: 'Yes, we have dedicated vegetarian and vegan meal bundles. Each meal clearly indicates its dietary properties during selection.'
    },
    {
      question: 'What is your refund policy?',
      answer: 'We offer full refunds for cancelled orders if requested before preparation. For quality issues, we offer replacements or refunds within 24 hours.'
    },
    {
      question: 'How do I track my order?',
      answer: 'After placing an order, you can track it in real-time from your dashboard. You\'ll receive SMS and email updates about your delivery status.'
    },
    {
      question: 'Can I schedule orders in advance?',
      answer: 'Yes, you can schedule orders up to 2 weeks in advance. This is great for meal planning and ensuring consistent delivery.'
    },
    {
      question: 'What if I\'m not satisfied with my meal?',
      answer: 'Contact our support team immediately with photos of the issue. We\'ll arrange a replacement meal or full refund at no cost to you.'
    },
    {
      question: 'Do you deliver outside campus?',
      answer: 'Yes, we deliver throughout the city. Delivery fees vary based on distance. Check the delivery zone at checkout.'
    }
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 animate-in">
            <h1 className="text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-300">Find answers to common questions about our service</p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 animate-in"
                style={{ animationDelay: `${0.1 + (index % 3) * 0.1}s` }}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white text-left">{faq.question}</h3>
                  <ChevronDown
                    className={`flex-shrink-0 text-blue-400 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                    size={24}
                  />
                </button>

                {openIndex === index && (
                  <div className="px-6 pb-6 border-t border-white/10">
                    <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center animate-in" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
            <p className="text-gray-300 mb-8">Our support team is here to help. Contact us anytime.</p>
            <a href="mailto:support@studentmeals.com" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105">
              <Mail size={20} />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </>
  );
}