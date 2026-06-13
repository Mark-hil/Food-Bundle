import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  const phoneNumber = '233XXXXXXXXX';
  const message = 'Hi, I need help with my food bundle order';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <>
      <style>{`
        @keyframes whatsappHover {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.1);
          }
        }

        .whatsapp-button {
          transition: all 0.3s ease-out;
        }

        .whatsapp-button:hover {
          animation: whatsappHover 0.3s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-button fixed bottom-8 right-8 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 flex items-center justify-center shadow-lg"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <MessageCircle size={24} />
        </a>

        {showTooltip && (
          <div className="fixed bottom-20 right-8 z-50 bg-gray-800 text-white text-sm px-3 py-2 rounded-md whitespace-nowrap">
            Chat with us
          </div>
        )}
      </div>
    </>
  );
};

export default WhatsAppButton;
